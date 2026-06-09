# 密码登录 / 登出

> 自定义业务会员账号的密码登录流程：注册时只保存密码哈希，登录成功后写入服务端 session，cookie 只保存非敏感显示信息，并覆盖错误密码、账号锁定和登出清理。

## 适用场景

这套做法适合前台会员、客户门户、订单查询、资料中心、报名系统等业务账号登录。业务账号通常由站点自己维护，可以和后台管理员、CMS 站点用户、电商客户账号分开。

不适合把 Kooboo 后台管理员账号直接当作前台会员账号使用。后台账号负责站点管理权限，业务会员账号负责前台业务身份。若项目已经使用 Kooboo 内置站点用户、第三方 OAuth 或电商客户体系，应先确认账号来源，再决定是否只复用本文的 session、cookie、错误处理和安全边界。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 展示注册、登录、当前用户和登出操作 | [Page](/templateEngine/page/) |
| API | 统一接收注册、登录、当前用户、登出和审计请求 | [k.api](/api/api/) |
| Security | 生成密码哈希、验证密码和生成安全随机值 | [k.security](/api/security/) |
| Session | 保存当前登录用户的服务端状态 | [k.session](/api/session/) |
| Cookie | 保存 remember me 或显示提示等非敏感信息 | [k.cookie](/api/cookie/) |
| KeyValue / 数据库 | 保存业务用户记录、失败次数和锁定时间 | [k.DB.keyValue](/api/key-value/) |

## 推荐架构

密码登录至少拆成四个服务端动作：

```text
注册表单
   ↓
POST /api/password-login/register
   ↓
校验邮箱、密码策略、唯一性
   ↓
k.security.hashPassword(password)
   ↓
保存 passwordHash，不保存明文密码

登录表单
   ↓
POST /api/password-login/login
   ↓
读取用户记录、检查锁定、verifyPassword
   ↓
k.session.set(currentUser)
   ↓
k.cookie.set(displayHint)

当前用户
   ↓
GET /api/password-login/me
   ↓
读取 session，未登录返回 AUTH_REQUIRED

登出
   ↓
GET /api/password-login/logout
   ↓
清理 session 和显示 cookie
```

真实项目可以把用户记录放在 SQLite、业务用户表、CMS 内容或电商客户体系中。无论存在哪里，密码校验、失败次数、锁定策略和会话写入都应放在服务端 API，不要放在前端脚本里。

## API：注册时保存密码哈希

注册接口只接收邮箱、显示名和密码。保存记录时写入 `passwordHash`，响应只返回公开字段：

```ts
// @k-url /api/password-login/{action}

type CredentialBody = {
  email?: string;
  password?: string;
  displayName?: string;
  remember?: boolean;
};

const userPrefix = "guide-auth:user:";

function normalize(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return normalize(value).toLowerCase();
}

function passwordPolicy(password: string) {
  if (password.length < 8) return "密码至少需要 8 位。";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "密码需要同时包含字母和数字。";
  return "";
}

k.api.post("register", (body: CredentialBody) => {
  const email = normalizeEmail(body?.email);
  const password = normalize(body?.password);
  const displayName = normalize(body?.displayName) || email;

  const passwordError = passwordPolicy(password);
  if (passwordError) {
    k.response.statusCode(400);
    return { success: false, code: "WEAK_PASSWORD", message: passwordError };
  }

  const record = {
    email,
    displayName,
    passwordHash: k.security.hashPassword(password),
    failedCount: 0,
    lockedUntil: "",
    createdAt: new Date().toISOString(),
    lastLoginAt: "",
  };

  k.DB.keyValue.set(`${userPrefix}${email}`, JSON.stringify(record));

  return {
    success: true,
    message: "注册成功，服务端只保存密码哈希。",
    data: {
      email: record.email,
      displayName: record.displayName,
      createdAt: record.createdAt,
    },
  };
});
```

如果邮箱已存在，应返回 `409 EMAIL_EXISTS`。错误提示不要暴露内部存储细节，也不要把 `passwordHash`、明文密码、验证码或 token 放进响应。

## API：登录、锁定和会话

登录时先检查账号是否存在和是否处于锁定期，再调用 `verifyPassword`。错误密码只返回统一的 `INVALID_CREDENTIALS`，避免让调用方判断账号是否存在：

```ts
const sessionUserKey = "guide-auth:current-user";
const displayCookie = "guide_auth_display";
const maxFailures = 3;
const lockMinutes = 5;

function readUser(email: string) {
  const raw = k.DB.keyValue.get(`${userPrefix}${email}`);
  return raw ? JSON.parse(raw.toString()) : null;
}

function safeUser(record) {
  return {
    email: record.email,
    displayName: record.displayName,
    createdAt: record.createdAt,
    lastLoginAt: record.lastLoginAt,
  };
}

k.api.post("login", (body: CredentialBody) => {
  const email = normalizeEmail(body?.email);
  const password = normalize(body?.password);
  const record = readUser(email);

  if (!record) {
    k.response.statusCode(401);
    return { success: false, code: "INVALID_CREDENTIALS", message: "邮箱或密码不正确。" };
  }

  if (record.lockedUntil && Date.parse(record.lockedUntil) > Date.now()) {
    k.response.statusCode(423);
    return {
      success: false,
      code: "ACCOUNT_LOCKED",
      message: "登录失败次数过多，请稍后再试。",
      lockedUntil: record.lockedUntil,
    };
  }

  if (!k.security.verifyPassword(password, record.passwordHash)) {
    record.failedCount = Number(record.failedCount || 0) + 1;
    if (record.failedCount >= maxFailures) {
      record.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString();
    }
    k.DB.keyValue.set(`${userPrefix}${email}`, JSON.stringify(record));

    k.response.statusCode(401);
    return {
      success: false,
      code: "INVALID_CREDENTIALS",
      message: "邮箱或密码不正确。",
      failedCount: record.failedCount,
      locked: Boolean(record.lockedUntil),
    };
  }

  record.failedCount = 0;
  record.lockedUntil = "";
  record.lastLoginAt = new Date().toISOString();
  k.DB.keyValue.set(`${userPrefix}${email}`, JSON.stringify(record));

  const user = safeUser(record);
  k.session.set(sessionUserKey, JSON.stringify(user));
  k.cookie.set(displayCookie, record.email, 7);

  return {
    success: true,
    message: "登录成功。",
    data: user,
    session: {
      hasSession: k.session.containsKey(sessionUserKey),
      hasDisplayCookie: k.cookie.containsKey(displayCookie),
    },
  };
});
```

cookie 只能保存非敏感显示信息或 remember me 标记。真正的当前用户、角色、组织、权限等服务端可信状态应从 session 或服务端数据读取。

## API：当前用户和登出

当前用户接口只读取 session；未登录返回 401，前台据此跳登录或展示未登录状态：

```ts
k.api.get("me", () => {
  const raw = k.session.get(sessionUserKey);
  if (!raw) {
    k.response.statusCode(401);
    return { success: false, code: "AUTH_REQUIRED", message: "请先登录。" };
  }

  return {
    success: true,
    data: JSON.parse(String(raw)),
    displayCookie: k.cookie.get(displayCookie),
  };
});

k.api.get("logout", () => {
  const hadSession = k.session.containsKey(sessionUserKey);
  const hadCookie = k.cookie.containsKey(displayCookie);

  return {
    success: true,
    message: "已退出登录。",
    data: {
      hadSession,
      hadCookie,
      removedSession: k.session.remove(sessionUserKey),
      removedCookie: k.cookie.remove(displayCookie),
    },
  };
});
```

登出要同时清理服务端 session 和前端提示 cookie。若项目有 refresh token、一次性重置 token、第三方登录绑定或设备会话表，也要在登出或修改密码时同步失效。

## Page：前台流程

前台页面只负责收集输入、调用 API 和展示结果：

```html
<!-- @k-url /password-login -->
<input id="email" value="member@example.com" autocomplete="email">
<input id="displayName" value="Demo Member" autocomplete="name">
<input id="password" type="password" value="CorrectHorse1!" autocomplete="current-password">

<button type="button" id="register">注册</button>
<button type="button" id="login">登录</button>
<button type="button" id="wrong">错误密码</button>
<button type="button" id="me">当前用户</button>
<button type="button" id="logout">登出</button>

<pre id="result"></pre>

<script>
  async function post(action, body) {
    const response = await fetch(`/api/password-login/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.json();
  }
</script>
```

前端可以做必填和格式提示，但不能只依赖前端校验。登录后跳转也应使用安全的站内 returnUrl 校验，避免把登录页变成开放跳转入口。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 弱密码 | 注册阶段拒绝，返回 `WEAK_PASSWORD` |
| 邮箱已存在 | 返回 `409 EMAIL_EXISTS`，提示用户登录或找回密码 |
| 邮箱不存在 | 登录仍返回 `INVALID_CREDENTIALS` |
| 密码错误 | 递增失败次数，错误提示保持统一 |
| 多次失败 | 设置 `lockedUntil`，锁定期间返回 `423 ACCOUNT_LOCKED` |
| 登录成功 | 清零失败次数，写入 session，只返回公开用户字段 |
| 当前用户 | 只信任 session，不信任前端传入的用户 id |
| 登出 | 清理 session、显示 cookie、refresh token 或设备会话 |
| 日志 | 记录脱敏邮箱、失败 code 和 traceId，不记录密码 |

进一步加固时，可以加入 CSRF token、验证码、IP / 账号双维度限流、设备会话管理、二次验证、密码修改后使旧会话失效，以及登录后 returnUrl 白名单。

## 相关

- [k.security](/api/security/)
- [k.session](/api/session/)
- [k.cookie](/api/cookie/)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
- [密码哈希与敏感信息保护](/guide/security/password-hash)
- [CSRF 与重复提交防护](/guide/security/csrf-idempotency)
- [URL 解析与安全跳转](/guide/security/safe-redirect)
- [统一 API 响应与错误结构](/guide/troubleshooting/api-error-contract)
