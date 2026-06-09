# 短信验证码登录

> 手机号获取一次性验证码，验证通过后写入 session；验证码要有发送频率、过期时间、错误次数锁定和短信发送失败重试。

## 适用场景

这套做法适合移动端登录、活动报名、订单查询、轻量会员系统和“登录/注册合一”的前台账号。用户输入手机号后获取验证码，验证码通过即创建或登录业务会员。

不适合把短信验证码当成长期 token，也不适合只在前端倒计时限制发送。发送频率、验证码哈希、过期时间、错误次数和登录态都必须由服务端管理。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 输入手机号、发送验证码、提交验证码、展示登录状态 | [Page](/templateEngine/page/) |
| API | 校验手机号、生成验证码、验证登录、限流和锁定 | [k.api](/api/api/) |
| SMS | 调用短信服务商发送模板消息 | [k.utils.sms](/api/utils/sms) |
| Security | 生成随机验证码、保存验证码哈希 | [k.security](/api/security/) |
| KeyValue / 数据库 | 保存会员、验证码状态和短信发送记录 | [k.DB.keyValue](/api/key-value/) |
| Session | 验证成功后保存当前用户 | [k.session](/api/session/) |

## 推荐架构

短信登录通常是一条登录/注册合一流程：

```text
手机号表单
   ↓
POST /api/sms-login/send
   ↓
校验手机号格式和发送频率
   ↓
生成 6 位验证码，保存 codeHash / expiresAt / failedCount
   ↓
调用 k.utils.sms 或写入短信发送队列

验证码表单
   ↓
POST /api/sms-login/verify
   ↓
检查验证码是否存在、过期、已使用、错误次数锁定
   ↓
校验 codeHash
   ↓
创建或读取业务会员
   ↓
k.session.set(currentUser)
```

验证码明文只用于发送短信和用户输入，服务端存储应使用哈希。验证成功后要标记验证码已使用，不能重复登录。

## API：发送验证码

下面示例用 KeyValue 保存会员和验证码，用 outbox 模拟短信发送。真实项目把 `enqueueSms()` 的成功分支替换为 `k.utils.sms` 调用。

```ts
// @k-url /api/sms-login/{action}

const memberPrefix = "guide-sms:member:";
const codePrefix = "guide-sms:code:";
const sessionUserKey = "guide-sms:user";
const sendIntervalSeconds = 60;
const codeMinutes = 5;

function normalizePhone(value: unknown) {
  return String(value || "").trim().replace(/[\s-]/g, "");
}

function isPhone(value: string) {
  return /^1\d{10}$/.test(value);
}

function createCode() {
  const seed = String(Date.now()) + k.security.shortGuid();
  const value = parseInt(k.security.sha256(seed).slice(0, 8), 16) % 1000000;
  return String(value).padStart(6, "0");
}
```

发送时先做手机号格式和频率限制：

```ts
k.api.post("send", (body) => {
  const phone = normalizePhone(body?.phone);
  if (!isPhone(phone)) {
    k.response.statusCode(400);
    return { success: false, code: "INVALID_PHONE", message: "请输入 11 位中国大陆手机号。" };
  }

  const existing = readCode(phone);
  if (existing && !existing.usedAt) {
    const elapsed = Date.now() - Date.parse(existing.createdAt);
    if (elapsed < sendIntervalSeconds * 1000) {
      k.response.statusCode(429);
      return {
        success: false,
        code: "SMS_RATE_LIMITED",
        message: "验证码发送过于频繁，请稍后再试。",
      };
    }
  }

  const code = createCode();
  const record = {
    phone,
    codeHash: k.security.sha256(`${phone}:${code}`),
    expiresAt: new Date(Date.now() + codeMinutes * 60 * 1000).toISOString(),
    usedAt: "",
    failedCount: 0,
    lockedUntil: "",
    createdAt: new Date().toISOString(),
  };
  writeCode(record);

  const sms = enqueueSms(phone, code, Boolean(body?.simulateFailure));
  return {
    success: true,
    message: sms.status === "sent" ? "验证码已发送。" : "验证码已生成，但短信发送失败，可重试。",
    sms: {
      id: sms.id,
      status: sms.status,
      attempts: sms.attempts,
      error: sms.error,
    },
  };
});
```

如果短信发送失败，可以保留验证码记录并允许重试，也可以重新生成验证码。关键是要记录失败原因、尝试次数和用户可恢复路径。

## API：验证登录

验证码校验要覆盖不存在、已使用、过期、错误次数锁定和正确登录：

```ts
const maxFailures = 3;
const lockMinutes = 5;

k.api.post("verify", (body) => {
  const phone = normalizePhone(body?.phone);
  const code = String(body?.code || "").trim();
  const record = readCode(phone);

  if (!record) {
    k.response.statusCode(404);
    return { success: false, code: "CODE_NOT_FOUND", message: "请先获取验证码。" };
  }
  if (record.usedAt) {
    k.response.statusCode(409);
    return { success: false, code: "CODE_USED", message: "验证码已使用。" };
  }
  if (Date.parse(record.expiresAt) <= Date.now()) {
    k.response.statusCode(410);
    return { success: false, code: "CODE_EXPIRED", message: "验证码已过期，请重新获取。" };
  }

  const expected = k.security.sha256(`${phone}:${code}`);
  if (expected !== record.codeHash) {
    record.failedCount += 1;
    if (record.failedCount >= maxFailures) {
      record.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString();
    }
    writeCode(record);

    k.response.statusCode(401);
    return { success: false, code: "INVALID_CODE", message: "验证码不正确。" };
  }

  const member = readOrCreateMember(phone);
  record.usedAt = new Date().toISOString();
  writeCode(record);
  k.session.set(sessionUserKey, JSON.stringify(publicMember(member)));

  return {
    success: true,
    message: "登录成功。",
    data: publicMember(member),
  };
});
```

错误次数锁定应按手机号维度记录，必要时再叠加 IP、设备指纹或风控规则。锁定期间即使输入正确验证码，也应返回 `CODE_LOCKED`。

## 短信服务商发送

生产环境可以按站点 SMS 设置选择提供商：

```ts
// 阿里云短信：单变量模板
k.utils.sms.aliSMS.send("SMS_123456", phone, "code", code);

// 腾讯云短信：模板参数对象
k.utils.sms.tencent.send("123456", phone, { code });

// 中国移动：文本内容
k.utils.sms.chinaMobile.send(phone, `Your login code is ${code}`);
```

验证码内容、签名、模板 ID 和变量名要与短信服务商后台一致。不要在前端保存服务商密钥，也不要把 provider 错误原样返回给用户；对用户返回稳定错误码，对内部记录脱敏错误。

## Page：前台流程

页面只负责收集手机号、请求发送、提交验证码和展示结果：

```html
<!-- @k-url /sms-login -->
<input id="phone" value="13800138000" inputmode="tel" autocomplete="tel">
<input id="code" inputmode="numeric" autocomplete="one-time-code">
<button id="send" type="button">发送验证码</button>
<button id="verify" type="button">验证登录</button>
<button id="logout" type="button">登出</button>
<pre id="result"></pre>
```

验证站点提供 `latest-code` 辅助接口读取最新验证码，方便本地自动化验证。生产环境不能开放这类接口；验证码只能通过短信到达用户。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 手机号格式错误 | HTTP 400，返回 `INVALID_PHONE` |
| 发送过于频繁 | HTTP 429，返回 `SMS_RATE_LIMITED` 和 retryAfter |
| 短信服务失败 | 记录 `failed`、错误和 attempts，允许重试 |
| 验证码不存在 | HTTP 404，返回 `CODE_NOT_FOUND` |
| 验证码过期 | HTTP 410，返回 `CODE_EXPIRED` |
| 验证码已使用 | HTTP 409，返回 `CODE_USED` |
| 验证码错误 | HTTP 401，返回 `INVALID_CODE`，递增 failedCount |
| 错误次数过多 | HTTP 423，返回 `CODE_LOCKED` |
| 登录成功 | 标记 code.usedAt，写入 session |
| 审计 | 不返回 codeHash，不保存明文验证码 |

额外建议：

- 按手机号、IP、设备维度做频率限制；
- 验证码有效期保持较短，例如 5 分钟；
- 错误提示不要暴露“手机号是否已注册”，登录/注册合一时可在发送阶段创建待激活会员；
- 短信模板不要包含敏感业务数据；
- 重要业务可要求短信验证码之外的二次验证或登录后补充资料。

## 相关

- [k.utils.sms](/api/utils/sms)
- [k.security](/api/security/)
- [k.session](/api/session/)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
- [邮箱注册与找回密码](/guide/auth/email-register-reset)
- [会话、角色与权限](/guide/auth/sessions-and-roles)
- [统一 API 响应与错误结构](/guide/troubleshooting/api-error-contract)
