# 邮箱注册与找回密码

> 注册后生成邮箱验证链接，找回密码时生成一次性重置链接；token 只保存哈希，链接有过期和一次性使用约束，邮件发送失败要可记录、可重试。

## 适用场景

这套做法适合会员注册、客户门户、资料中心、B2B 站点、订单查询和轻量后台。用户通过邮箱注册后，需要先验证邮箱，再允许登录或访问关键业务功能；忘记密码时，通过邮箱链接完成身份确认和密码重置。

不适合把重置链接当成长期登录 token，也不适合在前端保存或校验 token。邮箱验证、找回密码和密码重置都应由服务端 API 管理 token、过期时间、一次性使用和审计记录。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 提交注册、确认链接、找回密码和重置密码 | [Page](/templateEngine/page/) |
| API | 校验邮箱、生成 token、确认邮箱、重置密码 | [k.api](/api/api/) |
| Security | 生成随机 token、保存 token 哈希、密码哈希 | [k.security](/api/security/) |
| Mail | 发送验证邮件和重置邮件 | [k.mail](/api/mail/) |
| KeyValue / 数据库 | 保存用户、token 记录和邮件发送记录 | [k.DB.keyValue](/api/key-value/) |
| Session | 重置密码后清理旧登录态 | [k.session](/api/session/) |

## 推荐架构

邮箱注册和找回密码要把“账号创建”和“邮件发送”分开看：

```text
注册表单
   ↓
POST /api/email-register-reset/register
   ↓
校验邮箱、密码策略、邮箱唯一性
   ↓
保存用户：verified=false、passwordHash
   ↓
生成 verify-email token，保存 tokenHash、expiresAt、usedAt
   ↓
发送验证邮件或写入待发送队列

验证链接
   ↓
GET /api/email-register-reset/confirm?token=...
   ↓
查 tokenHash，检查 purpose、过期、是否已使用
   ↓
标记用户 verified=true，token.usedAt=now

找回密码
   ↓
POST /api/email-register-reset/forgot
   ↓
统一返回成功，避免枚举邮箱
   ↓
若用户存在，生成 reset-password token 并发送邮件

重置密码
   ↓
POST /api/email-register-reset/reset-password
   ↓
检查一次性 token 和新密码策略
   ↓
更新 passwordHash，标记 token 已使用，清理旧 session
```

token 明文只出现在一次性链接里，服务端存储用哈希。这样即使数据库或 KeyValue 被误读，也不能直接拿到可用 token。

## API：注册与验证邮件

下面示例用 KeyValue 保存用户和 token。验证站点为了可复现，用 `outbox` 模拟邮件发送、失败和重试；真实项目可把 `enqueueMail()` 的成功分支替换为 `k.mail.smtp.send()`。

```ts
// @k-url /api/email-register-reset/{action}

type TokenPurpose = "verify-email" | "reset-password";

const userPrefix = "guide-email:user:";
const tokenPrefix = "guide-email:token:";
const outboxKey = "guide-email:outbox";
const tokenMinutes = 30;

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function tokenKey(token: string) {
  return `${tokenPrefix}${k.security.sha256(token)}`;
}

function createToken(email: string, purpose: TokenPurpose) {
  const token = k.security.shortGuid() + k.security.shortGuid();
  const record = {
    tokenHash: k.security.sha256(token),
    email,
    purpose,
    expiresAt: new Date(Date.now() + tokenMinutes * 60 * 1000).toISOString(),
    usedAt: "",
    createdAt: new Date().toISOString(),
  };

  k.DB.keyValue.set(tokenKey(token), JSON.stringify(record));
  return { token, record };
}
```

注册时先保存未验证用户，再生成验证链接：

```ts
k.api.post("register", (body) => {
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || "").trim();

  if (readUser(email)) {
    k.response.statusCode(409);
    return { success: false, code: "EMAIL_EXISTS", message: "邮箱已注册。" };
  }

  const record = {
    email,
    displayName: String(body?.displayName || email).trim(),
    passwordHash: k.security.hashPassword(password),
    verified: false,
    createdAt: new Date().toISOString(),
    verifiedAt: "",
    lastLoginAt: "",
  };
  writeUser(record);

  const token = createToken(email, "verify-email");
  const mail = enqueueMail(email, "verify-email", token.token, Boolean(body?.simulateMailFailure));

  return {
    success: true,
    message: mail.status === "sent" ? "注册成功，验证邮件已进入发送队列。" : "注册成功，但验证邮件发送失败，可重试。",
    data: publicUser(record),
    mail: {
      id: mail.id,
      status: mail.status,
      attempts: mail.attempts,
      error: mail.error,
    },
  };
});
```

如果邮件发送失败，是否回滚账号创建取决于业务。多数注册场景可以保留 `verified=false` 的账号，并允许重新发送验证邮件；这样用户不会因为 SMTP 短暂失败重复占用邮箱。

## API：确认邮箱

确认链接必须检查 purpose、过期和一次性使用：

```ts
function validateToken(token: string, purpose: TokenPurpose) {
  const raw = k.DB.keyValue.get(tokenKey(token));
  if (!raw) return { ok: false, code: "TOKEN_NOT_FOUND" };

  const record = JSON.parse(raw.toString());
  if (record.purpose !== purpose) return { ok: false, code: "TOKEN_NOT_FOUND" };
  if (record.usedAt) return { ok: false, code: "TOKEN_USED" };
  if (Date.parse(record.expiresAt) <= Date.now()) return { ok: false, code: "TOKEN_EXPIRED" };

  return { ok: true, record };
}

k.api.get("confirm", () => {
  const token = String(k.request.queryString.token || "").trim();
  const check = validateToken(token, "verify-email");
  if (!check.ok) {
    k.response.statusCode(check.code === "TOKEN_EXPIRED" ? 410 : 409);
    return { success: false, code: check.code, message: "链接无效、过期或已使用。" };
  }

  const user = readUser(check.record.email);
  user.verified = true;
  user.verifiedAt = new Date().toISOString();
  writeUser(user);

  check.record.usedAt = new Date().toISOString();
  k.DB.keyValue.set(tokenKey(token), JSON.stringify(check.record));

  return {
    success: true,
    message: "邮箱已验证。",
    data: publicUser(user),
  };
});
```

确认邮箱后可以允许用户登录，也可以直接写入 session。本文选择不自动登录，避免“点击邮件链接的环境”和“用户当前浏览器会话”混在一起。

## API：找回和重置密码

找回密码接口建议防枚举：无论邮箱是否存在，都返回相同提示。

```ts
k.api.post("forgot", (body) => {
  const email = normalizeEmail(body?.email);
  const record = readUser(email);

  if (!record) {
    return {
      success: true,
      message: "如果邮箱存在，重置链接会发送到该邮箱。",
      mailQueued: false,
    };
  }

  const token = createToken(email, "reset-password");
  const mail = enqueueMail(email, "reset-password", token.token, Boolean(body?.simulateMailFailure));

  return {
    success: true,
    message: "如果邮箱存在，重置链接会发送到该邮箱。",
    mailQueued: mail.status === "sent",
  };
});
```

重置密码时，token 必须一次性使用。重置成功后应清理旧 session、refresh token 或设备会话：

```ts
k.api.post("reset-password", (body) => {
  const token = String(body?.token || "").trim();
  const password = String(body?.password || "").trim();
  const check = validateToken(token, "reset-password");
  if (!check.ok) {
    k.response.statusCode(409);
    return { success: false, code: check.code, message: "链接无效、过期或已使用。" };
  }

  const user = readUser(check.record.email);
  user.passwordHash = k.security.hashPassword(password);
  writeUser(user);

  check.record.usedAt = new Date().toISOString();
  k.DB.keyValue.set(tokenKey(token), JSON.stringify(check.record));
  k.session.remove("guide-email:current-user");

  return {
    success: true,
    message: "密码已重置，请使用新密码登录。",
    data: publicUser(user),
  };
});
```

重置密码不应返回新密码、旧密码或密码哈希。登录接口仍然统一用 `INVALID_CREDENTIALS`，避免暴露密码是否正确。

## 邮件发送与重试

生产环境可用 `k.mail.smtp.send()` 发送：

```ts
function sendVerificationMail(email: string, link: string) {
  k.mail.smtp.send({
    from: "noreply@example.com",
    to: email,
    subject: "Verify your email",
    htmlBody: `<p>Click <a href="${link}">verify email</a>.</p>`,
    textBody: `Verify email: ${link}`,
  });
}
```

不管直接发送还是进入队列，都建议记录发送状态：

| 字段 | 说明 |
|------|------|
| `to` | 收件邮箱 |
| `purpose` | `verify-email` 或 `reset-password` |
| `link` | 本次邮件链接，内部排查可见 |
| `status` | `sent`、`failed`、`retried` |
| `attempts` | 发送或重试次数 |
| `error` | 脱敏后的失败原因 |

验证站点使用 outbox 保存这些字段，覆盖邮件失败和重试路径。真实项目可以把 outbox 换成 SQLite、任务队列、日志或专门的通知表。

## Page：前台流程

页面只负责提交请求和展示结果：

```html
<!-- @k-url /email-register-reset -->
<input id="email" value="member@example.com" autocomplete="email">
<input id="password" type="password" value="CorrectHorse1!" autocomplete="current-password">
<input id="newPassword" type="password" value="NewHorse1!" autocomplete="new-password">

<button id="register" type="button">注册</button>
<button id="confirm" type="button">确认邮箱</button>
<button id="forgot" type="button">发送重置链接</button>
<button id="resetPassword" type="button">重置密码</button>
<button id="loginNew" type="button">新密码登录</button>
<pre id="result"></pre>
```

真实链接通常来自邮件中的 URL，页面加载时可读取 `token` 和 `action` 参数决定显示“确认邮箱”还是“重置密码”表单。本文验证页为了可重复测试，提供 outbox 和 latest-link 入口直接取最新链接。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 弱密码 | 注册和重置密码都返回 `WEAK_PASSWORD` |
| 邮箱已注册 | 注册返回 `409 EMAIL_EXISTS` |
| 未验证邮箱登录 | 返回 `EMAIL_NOT_VERIFIED`，提示重新发送验证邮件 |
| 找回未知邮箱 | 对外仍返回成功，避免邮箱枚举 |
| token 不存在 | 返回 `TOKEN_NOT_FOUND` |
| token 已使用 | 返回 `409 TOKEN_USED` |
| token 过期 | 返回 `410 TOKEN_EXPIRED` |
| 邮件发送失败 | 记录失败状态、错误和 attempts，提供重试 |
| 重置密码成功 | 更新 `passwordHash`，清理旧 session 和一次性 token |
| 审计 | 不返回 password、passwordHash、token 明文本体 |

额外建议：

- 邮箱验证和重置 token 使用不同 `purpose`，不能混用；
- token 只保存哈希，明文只在链接里出现一次；
- 找回密码、重发验证邮件要加频率限制；
- 修改密码后应使旧 session、refresh token 和设备会话失效；
- 邮件模板不要包含敏感字段，链接要使用 HTTPS 和站点白名单域名。

## 相关

- [k.mail](/api/mail/)
- [k.security](/api/security/)
- [k.session](/api/session/)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
- [密码登录 / 登出](/guide/auth/password-login)
- [会话、角色与权限](/guide/auth/sessions-and-roles)
- [统一 API 响应与错误结构](/guide/troubleshooting/api-error-contract)
