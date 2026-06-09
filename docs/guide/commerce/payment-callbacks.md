# 支付发起与回调

> 支付发起负责创建支付请求，支付回调负责确认真实支付结果。前端跳转、二维码页面或用户截图都不能替代服务端回调验签。

## 适用场景

这套做法适合支付宝、微信、Stripe、PayPal、Square、Pay.NL、TwoCheckout、MoneyBoxs 等支付方式，也适合企业内部门户的“待支付订单 → 支付网关 → 回调确认”流程。

它关注三个边界：

- 发起支付时，金额和货币来自服务端订单，不来自前端；
- 回调进来时，先验签，再校验订单、支付请求、金额和货币；
- 第三方重复回调时，用 provider eventId 或 requestId 做幂等，不重复把订单改状态。

不适合把支付成功判断放在浏览器返回页里。浏览器返回只适合提示“正在确认支付结果”，最终状态必须通过服务端回调或 `checkStatus()` 查询确认。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Order | 创建并保存待支付订单，支付后更新状态 | [k.commerce.order](/api/commerce/order) |
| Payment | 按站点支付配置创建支付请求、查询状态 | [k.payment](/api/payment/) |
| Provider | 支付宝、微信、Stripe、PayPal 等网关 | [支付 API](/api/payment/) |
| API | 发起支付、接收回调、统一错误结构 | [k.api](/api/api/) |
| Request / Security | 读取 raw body、Header，并完成签名校验 | [k.request](/api/request/) · [k.security](/api/security/) |
| KeyValue / 数据库 | 保存幂等记录、回调日志和补偿状态 | [k.DB.keyValue](/api/key-value/) |

## 推荐流程

```text
创建 pending 订单
        ↓
发起支付：按订单金额创建 PaymentRequest
        ↓
前端跳转 / 展示二维码 / 托管收银台
        ↓
支付网关回调 Kooboo API 或 callbackCodeName
        ↓
验签、校验金额、检查 eventId 幂等
        ↓
更新订单 paid / failed，并记录回调事件
        ↓
前端查询订单状态，展示支付结果
```

如果 `k.payment.*.charge()` 支持传入 Commerce `order`，优先使用内建 PaymentRequest 和订单联动能力。项目自定义 API 只负责把业务订单、回调日志、幂等记录和错误结构补齐，不要另建一套与 Kooboo 支付请求脱节的平行支付表。

## API：发起支付

真实项目发起支付时应调用具体 provider，例如 `k.payment.alipayForm.charge()`、`k.payment.weChatH5.charge()`、`k.payment.stripeCheckout.charge()`。下面示例用 KeyValue 模拟订单和支付请求，便于稳定验证流程边界。

```ts
// @k-url /api/payment-callbacks/{action}

type StartPaymentBody = {
  orderId?: string;
  amount?: number;
  currency?: string;
  provider?: string;
  idempotencyKey?: string;
};

const ordersKey = "guide-payment:orders";
const requestsKey = "guide-payment:requests";
const startIdempotencyPrefix = "guide-payment:start:";
```

发起支付必须检查幂等键，并按服务端订单金额创建支付请求：

```ts
k.api.post("start", (body: StartPaymentBody) => {
  const idempotencyKey = normalize(body?.idempotencyKey);
  if (!idempotencyKey) {
    return fail(400, "IDEMPOTENCY_REQUIRED", "发起支付必须提供幂等键。");
  }

  const order = readOrders()[normalize(body?.orderId)];
  if (!order) return fail(404, "ORDER_NOT_FOUND", "订单不存在。");
  if (order.status !== "pending") {
    return fail(409, "ORDER_NOT_PAYABLE", "订单不是待支付状态。");
  }

  const request = {
    id: `pay-${k.security.shortGuid()}`,
    orderId: order.id,
    provider: normalize(body?.provider) || "mockpay",
    amount: order.total,
    currency: order.currency,
    status: "created",
    idempotencyKey,
    checkoutUrl: "",
  };
  request.checkoutUrl = `/payment-callbacks?requestId=${request.id}`;

  savePaymentRequest(request);
  markOrderPaymentRequest(order.id, request.id);

  return {
    success: true,
    priceChanged: typeof body?.amount === "number" && body.amount !== order.total,
    paymentRequest: request,
  };
});
```

在真实支付 API 中，形状通常类似：

```ts
const charge = k.payment.stripeCheckout.charge({
  amount: order.totalAmount,
  currency: order.currency.code,
  description: `Order ${order.id}`,
  order,
  callbackCodeName: "PaymentCallback",
});
```

移动端微信 H5 场景要使用 `k.payment.weChatH5` 和 `redirectUrl`，不要拿 PC Native 的 `renderHtml` 当 H5 跳转。支付完成后仍然要通过回调或状态查询确认订单真实状态。

## API：回调验签与订单更新

回调入口必须先验签，再处理业务。下面示例使用 HMAC-SHA256 模拟第三方签名：

```ts
const signingSecret = "guide-payment-demo-secret";
const eventsKey = "guide-payment:events";

function canonicalString(timestamp: string, body: string) {
  return `${timestamp}.${body}`;
}

function sign(timestamp: string, body: string) {
  return k.security.hmacSha256(canonicalString(timestamp, body), signingSecret);
}

k.api.post("callback", () => {
  const rawBody = k.request.body || "";
  const timestamp = k.request.headers.get("X-Payment-Timestamp");
  const receivedSignature = k.request.headers.get("X-Payment-Signature");
  const expectedSignature = sign(timestamp, rawBody);

  if (receivedSignature !== expectedSignature) {
    return fail(401, "INVALID_SIGNATURE", "支付回调签名不匹配。");
  }

  const payload = JSON.parse(rawBody);
  const eventId = normalize(payload.eventId);
  if (hasProcessed(eventId)) {
    return { success: true, duplicate: true };
  }

  const request = readPaymentRequest(payload.requestId);
  const order = readOrder(request.orderId);
  assertAmountAndCurrency(payload, request);
  assertOrder(payload, order);

  markPaymentRequestPaid(request.id);
  markOrderPaid(order.id);
  saveProcessedEvent(eventId, request.id, order.id);

  return {
    success: true,
    duplicate: false,
    message: "支付回调已验签并幂等更新订单为已支付。",
  };
});
```

验签要用第三方要求的 raw body 和 Header 拼接方式。不要先 `JSON.parse` 再重新 `JSON.stringify` 后参与签名；字段顺序、空格和转义差异都可能导致验签逻辑失真。

## 前端返回页

支付返回页只做查询和提示，不直接判定成功：

```html
<!-- @k-url /payment-return -->
<p id="status">正在确认支付结果...</p>

<script>
  async function refreshOrder(orderId) {
    const response = await fetch(`/api/orders/${orderId}`);
    const data = await response.json();
    document.querySelector("#status").textContent =
      data.order?.status === "paid" ? "支付已确认" : "支付结果确认中";
  }
</script>
```

如果支付网关没有稳定回调，可以在服务端用 `k.payment.*.checkStatus(requestId)` 做主动查询或补偿任务。查询结果同样要走服务端订单状态更新，不能由前端直接写订单。

## 错误处理建议

| 错误码 | HTTP | 处理方式 |
|--------|------|----------|
| `IDEMPOTENCY_REQUIRED` | 400 | 前端重新生成发起支付幂等键 |
| `ORDER_NOT_FOUND` | 404 | 阻止支付，提示订单不存在或已过期 |
| `ORDER_NOT_PAYABLE` | 409 | 阻止重复支付，提示当前订单状态 |
| `MISSING_SIGNATURE` | 400 | 不处理业务，记录回调来源 |
| `INVALID_SIGNATURE` | 401 | 不处理业务，记录 provider、requestId、eventId |
| `STALE_TIMESTAMP` | 400 | 拒绝旧回调，防止重放 |
| `AMOUNT_MISMATCH` | 409 | 不更新订单，进入人工核查或补偿队列 |
| `DUPLICATE_EVENT` | 200 | 返回已处理结果，不重复更新订单 |

支付类错误不要只写前台 toast。服务端日志至少要保留 provider、requestId、orderId、eventId、错误码、处理时间和 traceId。不要记录完整支付签名、私钥、卡号、验证码或第三方密钥。

## 相关

- [购物车到结算](/guide/commerce/checkout)
- [Webhook 接收与验签](/guide/integrations/webhook-signature)
- [CSRF 与重复提交防护](/guide/security/csrf-idempotency)
- [统一 API 响应与错误结构](/guide/troubleshooting/api-error-contract)
- [k.payment](/api/payment/)
- [微信 H5 支付流程](/api/payment/wechat-h5-flow)
