# 密码哈希与敏感信息保护

> 注册、登录、找回密码等账号场景中，服务端只保存密码哈希，响应和日志都不要暴露明文密码、验证码或 token。

## 适用场景

这套做法适合需要处理用户密码或敏感凭据的业务：

- 会员注册和密码登录；
- 后台用户初始化和重置密码；
- 找回密码、修改密码；
- 外部系统凭据、SMTP 密码、API token 的后台配置；
- 需要写审计日志的登录失败和账号风险事件。

如果使用 Kooboo 内置站点用户或电商客户能力，应优先调用对应账号 API。本文关注自定义业务账号或需要自行保存凭据时的边界：不能保存明文密码，也不能把敏感值写进响应、日志或前端代码。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 提交注册、登录和审计验证请求 | [Page](/templateEngine/page/) |
| API | 校验输入、调用哈希和验证方法、统一错误结构 | [k.api](/api/api/) |
| Security | 生成密码哈希并验证密码 | [k.security](/api/security/) |
| KeyValue / 数据库 | 保存用户记录和密码哈希 | [k.DB.keyValue](/api/key-value/) |
| Logger | 记录脱敏审计事件 | [k.logger](/api/logger/) |

## 推荐架构

密码处理要收敛在服务端 API：

```text
注册表单
   ↓
API 校验密码策略
   ↓
k.security.hashPassword(password)
   ↓
保存 passwordHash，不保存 password

登录表单
   ↓
读取用户 passwordHash
   ↓
k.security.verifyPassword(password, passwordHash)
   ↓
返回统一登录结果
```

前端只负责提交密码和展示结果。不要在前端实现哈希，也不要把哈希返回给前端。前端哈希不能替代 TLS 和服务端哈希，因为一旦哈希成为登录凭据，它就等价于密码。

## API：注册时保存哈希

下面示例用 KeyValue 保存最小用户记录。真实项目可以换成 SQLite、客户表或业务用户表，但保存字段的原则一致：只保存 `passwordHash`。

```ts
// @k-url /api/password-hash/{action}

type CredentialBody = {
  email?: string;
  password?: string;
};

const userPrefix = "password-hash:user:";

function normalize(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return normalize(value).toLowerCase();
}

function userKey(email: string) {
  return `${userPrefix}${email}`;
}

function passwordPolicy(password: string) {
  if (password.length < 8) return "密码至少需要 8 位。";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "密码需要同时包含字母和数字。";
  return "";
}

k.api.post("register", (body: CredentialBody) => {
  const email = normalizeEmail(body?.email);
  const password = normalize(body?.password);

  if (!email || !email.includes("@")) {
    return { success: false, code: "INVALID_EMAIL", message: "请输入有效邮箱。" };
  }

  const passwordError = passwordPolicy(password);
  if (passwordError) {
    return { success: false, code: "WEAK_PASSWORD", message: passwordError };
  }

  const record = {
    email,
    passwordHash: k.security.hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  k.DB.keyValue.set(userKey(email), JSON.stringify(record));

  return {
    success: true,
    message: "用户已注册，服务端只保存密码哈希。",
    data: {
      email,
      createdAt: record.createdAt,
    },
  };
});
```

示例为了方便验证使用 KeyValue。生产系统应根据业务规模选择更适合的用户表，并加上邮箱唯一性、失败次数、锁定策略、验证码和审计日志。

## API：登录时验证哈希

登录时读取保存的哈希，调用 `verifyPassword`。错误提示建议统一为“邮箱或密码不正确”，避免泄露账号是否存在。

```ts
function readUser(email: string) {
  const raw = k.DB.keyValue.get(userKey(email));
  return raw ? JSON.parse(raw.toString()) : null;
}

k.api.post("login", (body: CredentialBody) => {
  const email = normalizeEmail(body?.email);
  const password = normalize(body?.password);
  const record = readUser(email);

  if (!record) {
    return {
      success: false,
      code: "INVALID_CREDENTIALS",
      message: "邮箱或密码不正确。",
    };
  }

  const valid = k.security.verifyPassword(password, record.passwordHash);
  if (!valid) {
    return {
      success: false,
      code: "INVALID_CREDENTIALS",
      message: "邮箱或密码不正确。",
    };
  }

  return {
    success: true,
    message: "密码校验通过。",
    data: {
      email,
      createdAt: record.createdAt,
    },
  };
});
```

登录成功后再写 session、cookie 或业务 token。密码校验和会话写入应是两个清晰步骤，便于处理多因素认证、记住登录、登录后跳转和风控。

## API：审计敏感字段

可以提供内部审计接口确认存储字段，但不要返回 `passwordHash` 本体：

```ts
k.api.get("audit", () => {
  const email = normalizeEmail(k.request.queryString.email);
  const record = readUser(email);
  const raw = JSON.stringify(record || {});

  return {
    success: Boolean(record),
    storedFields: record ? Object.keys(record) : [],
    passwordHashLength: record ? String(record.passwordHash || "").length : 0,
    containsPlainPassword: raw.includes("CorrectHorse1!") || raw.includes("WrongHorse1!"),
    returnsPasswordHash: false,
  };
});
```

这个接口只适合验证和内部排查。真实后台可以展示“是否已设置密码”“最后修改时间”“失败次数”，不要展示哈希值。

## Page：注册和登录验证

页面只调用 API，不处理哈希逻辑：

```html
<!-- @k-url /password-hash -->
<input id="email" value="hash-demo@example.com">
<input id="password" type="password" value="CorrectHorse1!">
<button id="register" type="button">注册并保存哈希</button>
<button id="login" type="button">正确密码登录</button>
<button id="wrong" type="button">错误密码登录</button>
<button id="audit" type="button">查看存储审计</button>
<pre id="result"></pre>

<script>
  async function post(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  }
</script>
```

真实页面还需要 HTTPS、CSRF 防护、失败次数限制、验证码或二次验证。本文只覆盖密码哈希和敏感信息保护这一层。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 弱密码 | 注册时拒绝，返回 `WEAK_PASSWORD` |
| 邮箱不存在 | 登录时仍返回 `INVALID_CREDENTIALS` |
| 密码错误 | 不返回具体原因，记录脱敏审计 |
| 注册成功 | 保存 `passwordHash`，不保存明文密码 |
| API 响应 | 不返回 password、passwordHash、token、验证码 |
| 日志 | 邮箱/手机号脱敏，密码和 token 写成 `[REDACTED]` |

额外建议：

- 不要使用 MD5、SHA1、SHA256 直接保存密码；密码应使用 `hashPassword` 这类带盐哈希能力；
- 修改密码后应使旧会话或重置 token 失效；
- 找回密码 token 应一次性使用并设置过期时间；
- 登录失败次数和锁定策略应按账号或 IP 维度记录。

## 相关

- [k.security](/api/security/)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
- [k.logger](/api/logger/)
- [Page](/templateEngine/page/)
