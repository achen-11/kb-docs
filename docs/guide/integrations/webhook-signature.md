# Webhook 接收与验签

> 接收支付、物流、CRM、消息平台等第三方 Webhook 时，先验证签名和时间戳，再用 eventId 做幂等处理。

## 适用场景

这套做法适合第三方系统主动回调 Kooboo 的场景，例如：

- 支付成功、退款完成、支付失败回调；
- 物流状态变更；
- CRM 线索创建或状态同步；
- 邮件、短信、消息平台的投递结果通知；
- 外部系统的订单、会员、库存变更通知。

不适合把 Webhook 当成普通公开表单接口。Webhook 的来源是服务器到服务器，必须验证“请求确实来自可信第三方”，并处理第三方重试带来的重复事件。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| API | 接收第三方 POST，读取 raw body 和 Header | [k.api](/api/api/) |
| Request | 读取 `k.request.body` 与签名 Header | [k.request](/api/request/) |
| Security | 使用 HMAC-SHA256 计算签名 | [k.security](/api/security/) |
| KeyValue / 数据库 | 保存 eventId，阻止重复处理 | [k.DB.keyValue](/api/key-value/) |
| Logger | 记录验签失败、重复事件和处理结果 | [k.logger](/api/logger/) |

## 推荐架构

Webhook 入口要把验签、幂等和业务处理分开：

```text
第三方 Webhook
        ↓
读取 raw body + 签名 Header
        ↓
验证 HMAC 签名和 timestamp 窗口
        ↓
检查 eventId 是否处理过
        ↓
执行业务更新并记录幂等键
```

真实第三方通常会规定签名字符串，例如 `timestamp.rawBody`、`method.path.body` 或固定 Header 集合。实现时必须严格按对方文档拼接，不要用重新序列化后的 JSON 替代 raw body。

## API：生成签名用于本地验证

下面的 `sign` 接口只用于本地验证和文档示例，真实项目中由第三方生成签名，Kooboo 只负责验签。

```ts
// @k-url /api/webhook-signature/{action}

const signingSecret = "guide-webhook-demo-secret";
const toleranceSeconds = 300;

function normalize(value: unknown) {
  return String(value || "").trim();
}

function canonicalString(timestamp: string, body: string) {
  return `${timestamp}.${body}`;
}

function sign(timestamp: string, body: string) {
  return k.security.hmacSha256(canonicalString(timestamp, body), signingSecret);
}

k.api.post("sign", () => {
  const body = k.request.body || "{}";
  const timestamp = normalize(k.request.queryString.timestamp) || String(Math.floor(Date.now() / 1000));

  return {
    success: true,
    timestamp,
    signature: sign(timestamp, body),
    signedPayload: canonicalString(timestamp, body),
  };
});
```

生产环境的 `signingSecret` 不应写死在源码里。可以放在站点配置、环境配置或安全的后台配置中，并限制可见范围。

## API：验签、过期窗口和幂等

Webhook 接收接口先读取原始 body 和 Header：

```ts
const idempotencyPrefix = "webhook:event:";
const logCategory = "Guide.WebhookSignature";

function header(name: string) {
  return normalize(k.request.headers.get(name));
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

k.api.post("receive", () => {
  const rawBody = k.request.body || "";
  const timestamp = header("X-Webhook-Timestamp");
  const receivedSignature = header("X-Webhook-Signature");
  const expectedSignature = timestamp ? sign(timestamp, rawBody) : "";
  const age = timestamp ? Math.abs(nowSeconds() - Number(timestamp)) : Number.POSITIVE_INFINITY;

  if (!timestamp || !receivedSignature) {
    return { success: false, code: "MISSING_SIGNATURE", message: "缺少 Webhook 签名或时间戳。" };
  }

  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { success: false, code: "STALE_TIMESTAMP", message: "Webhook 时间戳已过期。" };
  }

  if (receivedSignature !== expectedSignature) {
    return { success: false, code: "INVALID_SIGNATURE", message: "Webhook 签名不匹配。" };
  }

  const payload = JSON.parse(rawBody || "{}");
  const eventId = normalize(payload.eventId);
  const idempotencyKey = `${idempotencyPrefix}${eventId}`;

  if (k.DB.keyValue.get(idempotencyKey)) {
    return {
      success: false,
      code: "DUPLICATE_EVENT",
      message: "该 Webhook 事件已经处理过。",
      eventId,
    };
  }

  k.DB.keyValue.set(idempotencyKey, JSON.stringify({
    eventId,
    type: payload.type,
    processedAt: new Date().toISOString(),
  }));

  return {
    success: true,
    message: "Webhook 已验签并处理。",
    data: payload,
  };
});
```

如果 Webhook 会更新订单、支付、库存等关键业务数据，幂等记录最好保存在业务数据库或订单记录中。KeyValue 适合最小示例和低频场景，但复杂项目应保存 provider、eventId、业务 id、处理状态和错误原因。

## Page：模拟第三方回调

验证页面可以先调用 `sign` 生成签名，再用相同 raw body 发送 `receive`：

```html
<!-- @k-url /webhook-signature -->
<button id="valid" type="button">合法 Webhook</button>
<button id="duplicate" type="button">重复事件</button>
<button id="invalid-signature" type="button">错误签名</button>
<button id="stale" type="button">过期时间戳</button>
<pre id="result"></pre>

<script>
  async function signBody(body, timestamp) {
    const response = await fetch(`/api/webhook-signature/sign?timestamp=${timestamp}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return response.json();
  }

  async function sendWebhook(payload, options = {}) {
    const timestamp = options.timestamp || Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify(payload);
    const signed = await signBody(body, timestamp);
    const signature = options.badSignature ? `bad-${signed.signature}` : signed.signature;

    const response = await fetch("/api/webhook-signature/receive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Timestamp": timestamp,
        "X-Webhook-Signature": signature,
      },
      body,
    });

    return response.json();
  }
</script>
```

这个页面只用于验证。真实 Webhook 通常没有前台页面，而是由第三方直接请求 Kooboo API。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 缺少签名或时间戳 | 返回 `MISSING_SIGNATURE`，不处理业务 |
| 签名不匹配 | 返回 `INVALID_SIGNATURE`，记录日志 |
| 时间戳过期 | 返回 `STALE_TIMESTAMP`，防止旧请求重放 |
| eventId 已处理 | 返回 `DUPLICATE_EVENT`，不重复更新订单 |
| payload 无法解析 | 返回稳定错误，不抛出内部异常 |
| 第三方重试 | 响应结构保持稳定，幂等记录可回查 |

还要注意：

- 验签必须发生在业务写入之前；
- 用 raw body 参与签名，不要先 `JSON.parse` 再重新 `JSON.stringify`；
- 不把 signing secret、完整签名或敏感 payload 写入前台；
- 对支付类 Webhook，前台跳转结果不能替代服务端回调验签；
- 日志里记录 provider eventId、订单号和错误码，避免记录密钥。

## 相关

- [k.request](/api/request/)
- [k.security](/api/security/)
- [k.DB.keyValue](/api/key-value/)
- [k.logger](/api/logger/)
- [k.api](/api/api/)
