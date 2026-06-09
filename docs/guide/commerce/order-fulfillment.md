# 订单履约与通知

> 支付成功只说明订单可以进入履约，不等于已经发货。履约流程应独立维护发货、签收、完成、取消和通知状态。

## 适用场景

这套做法适合实物商品发货、数字商品开通、课程报名确认、服务预约确认等订单后置处理。它关注支付之后的业务状态机：哪些订单可以发货，物流信息如何保存，签收后如何完成订单，以及邮件/短信通知如何可靠发送。

不适合把履约状态简单塞进“已支付”字段。支付状态回答“钱是否确认”；履约状态回答“商品或服务是否交付”。二者应分开建模，否则退款、部分发货、补发、取消和售后会很快变得不可控。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS 电商后台 | 查看订单、发货、通知、销售统计 | [订单](/cms/commerce/orders) · [通知](/cms/commerce/notification) |
| Order | 查询订单、取消、支付、发货状态 | [k.commerce.order](/api/commerce/order) |
| Mail / SMS | 发送发货、签收、完成通知 | [k.mail](/api/mail/) · [k.utils.sms](/api/utils/sms) |
| API | 执行状态迁移、校验权限和幂等 | [k.api](/api/api/) |
| KeyValue / 数据库 | 保存物流单、通知 outbox、履约日志 | [k.DB.keyValue](/api/key-value/) |

## 推荐状态机

```text
pending payment
        ↓ 支付回调确认
paid + unfulfilled
        ↓ 发货 / 开通
paid + shipped
        ↓ 签收 / 服务完成确认
paid + delivered
        ↓ 自动或人工完成
closed + completed
```

真实项目还会有 `canceled`、`refund_pending`、`refunded`、`partially_shipped`、`failed` 等状态。不要只用一个布尔值 `delivered=true` 表示所有履约结果。

## API：发货、签收、完成

下面示例用 KeyValue 模拟订单、物流单和通知 outbox，便于本地验证状态边界。真实项目应优先对接 `k.commerce.order` 和后台订单管理能力。

```ts
// @k-url /api/order-fulfillment/{action}

type FulfillmentStatus = "unfulfilled" | "shipped" | "delivered" | "completed" | "canceled";

type ShipBody = {
  orderId?: string;
  carrier?: string;
  trackingNo?: string;
  idempotencyKey?: string;
};

const ordersKey = "guide-fulfillment:orders";
const shipmentsKey = "guide-fulfillment:shipments";
const outboxKey = "guide-fulfillment:outbox";
const shipIdempotencyPrefix = "guide-fulfillment:ship:";
```

发货接口只允许已支付且未发货订单进入下一步，并要求承运商、物流单号和幂等键：

```ts
k.api.post("ship", (body: ShipBody) => {
  const idempotencyKey = normalize(body?.idempotencyKey);
  if (!idempotencyKey) {
    return fail(400, "IDEMPOTENCY_REQUIRED", "发货必须提供幂等键。");
  }

  const order = readOrders()[normalize(body?.orderId)];
  if (!order) return fail(404, "ORDER_NOT_FOUND", "订单不存在。");
  if (order.status !== "paid" || order.fulfillmentStatus !== "unfulfilled") {
    return fail(409, "ORDER_NOT_FULFILLABLE", "只有已支付且未发货订单可以发货。");
  }

  const carrier = normalize(body?.carrier);
  const trackingNo = normalize(body?.trackingNo);
  if (!carrier || !trackingNo) {
    return fail(400, "INVALID_SHIPMENT", "发货必须填写承运商和物流单号。");
  }

  const shipment = createShipment(order.id, carrier, trackingNo, idempotencyKey);
  order.fulfillmentStatus = "shipped";
  order.shipmentId = shipment.id;
  addTimeline(order, "shipped", `${carrier} ${trackingNo} 已发货。`);
  queueNotification(order, "order-shipped", { carrier, trackingNo });

  return { success: true, order, shipment };
});
```

签收和完成接口只做单向迁移：

```ts
k.api.post("deliver", (body: { orderId?: string }) => {
  const order = readOrders()[normalize(body?.orderId)];
  if (!order) return fail(404, "ORDER_NOT_FOUND", "订单不存在。");
  if (order.fulfillmentStatus !== "shipped") {
    return fail(409, "ORDER_NOT_SHIPPED", "只有已发货订单可以签收。");
  }

  order.fulfillmentStatus = "delivered";
  order.deliveredAt = new Date().toISOString();
  addTimeline(order, "delivered", "订单已签收。");
  queueNotification(order, "order-delivered", { deliveredAt: order.deliveredAt });
  return { success: true, order };
});

k.api.post("complete", (body: { orderId?: string }) => {
  const order = readOrders()[normalize(body?.orderId)];
  if (order.fulfillmentStatus !== "delivered") {
    return fail(409, "ORDER_NOT_DELIVERED", "只有已签收订单可以完成。");
  }

  order.status = "closed";
  order.fulfillmentStatus = "completed";
  addTimeline(order, "completed", "订单已完成。");
  return { success: true, order };
});
```

如果真实项目用后台操作发货，仍然建议把“状态迁移 + 通知 + 日志”封装成 CodeBlock 或内部 API，后台按钮和自动任务都调用同一套逻辑。

## 通知 outbox

本地验证使用 outbox 模拟邮件短信发送：

```ts
function queueNotification(order, template, payload) {
  outbox.push({
    channel: "email",
    to: order.customerEmail,
    template,
    orderId: order.id,
    payload,
    status: "queued",
  });
}
```

生产项目可以由后台任务读取 outbox，再调用 `k.mail` 或 `k.utils.sms`。这样即使 SMTP、短信供应商或第三方接口短暂失败，订单状态也不会因为通知发送失败而回滚，失败消息可以重试。

## 相关

- [购物车到结算](/guide/commerce/checkout)
- [支付发起与回调](/guide/commerce/payment-callbacks)
- [Webhook 接收与验签](/guide/integrations/webhook-signature)
- [定时任务](/guide/integrations/scheduled-jobs)
- [业务日志与错误追踪](/guide/troubleshooting/business-logging)
