# 购物车到结算

> 从购物车进入结算时，前端只提交商品、数量、收货信息和幂等键；价格、优惠、配送、税费、库存和订单状态必须在服务端重新确认。

## 适用场景

这套做法适合电商前台、会员商城、活动报名、课程购买、数字商品购买等会产生订单的流程。它关注的是“创建待支付订单”之前的边界：商品是否仍可售、库存是否足够、优惠是否可用、地址是否完整、配送和税费如何计算，以及用户重复点击下单按钮时是否会产生重复订单。

不适合把支付结果也放在同一个接口里处理。支付发起、支付网关回调、订单支付状态更新和回调验签应放到独立流程；结算接口只创建 `pending` 订单，并把可支付的订单号交给支付流程。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS 电商后台 | 维护商品、库存、配送、优惠、税、货币、订单 | [电商后台](/cms/commerce/) |
| Product | 查询商品和变体，确认上下架、价格与库存 | [k.commerce.product](/api/commerce/product) |
| Cart | 保存购物车，计算购物车详情 | [k.commerce.cart](/api/commerce/cart) |
| Discount / Shipping | 校验优惠码、配送方式和费用 | [k.commerce.discount](/api/commerce/discount) · [k.commerce.shipping](/api/commerce/shipping) |
| Order | 创建待支付订单、查询订单状态 | [k.commerce.order](/api/commerce/order) |
| Payment | 发起支付与处理回调 | [支付 API](/api/payment/) |
| API / Page | 结算预览、创建订单、展示错误和重试 | [k.api](/api/api/) · [Page](/templateEngine/page/) |

## 推荐流程

```text
商品页 / 列表页
        ↓
加入购物车：只记录商品变体和数量
        ↓
结算页：填写地址、优惠码、配送方式
        ↓
API 预览：服务端重新计算价格、优惠、配送、税费
        ↓
创建订单：校验幂等键、地址、库存，再创建 pending 订单
        ↓
支付发起：使用订单号进入支付流程
        ↓
支付回调：验签并幂等更新订单状态
```

核心原则是前端不拥有金额事实。页面可以展示预估金额，但订单金额必须来自服务端最后一次计算。即使前端提交 `clientPrice`、优惠金额或配送金额，API 也只能把它当作对比或调试信息，不能直接用于订单总额。

## API：结算预览与创建订单

真实项目优先使用 `k.commerce.product`、`k.commerce.cart`、`k.commerce.order`、`k.commerce.discount` 和 `k.commerce.shipping`。下面示例保留关键结构，用 KeyValue 模拟商品、购物车、订单和幂等记录，便于本地验证核心边界。

```ts
// @k-url /api/checkout/{action}

type CartLine = {
  productId: string;
  quantity: number;
  clientPrice?: number;
};

type CheckoutBody = {
  cartId?: string;
  lines?: CartLine[];
  discountCode?: string;
  shippingMethod?: string;
  currency?: string;
  address?: {
    country?: string;
    province?: string;
    city?: string;
    address1?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  };
  idempotencyKey?: string;
};

const productsKey = "guide-checkout:products";
const ordersKey = "guide-checkout:orders";
const idempotencyPrefix = "guide-checkout:idempotency:";
```

预览接口只返回服务端计算结果，不写入订单：

```ts
k.api.post("preview", (body: CheckoutBody) => {
  const result = calculate(body?.lines || [], body || {});
  if (!result.ok) return result.error;

  return {
    success: true,
    message: "结算预览已按服务端价格、库存、优惠和配送重算。",
    detail: result.detail,
  };
});
```

创建订单接口先检查幂等键。重复提交同一个 `idempotencyKey` 时返回第一次创建的订单，而不是再扣库存、再写订单：

```ts
k.api.post("create-order", (body: CheckoutBody) => {
  const idempotencyKey = normalize(body?.idempotencyKey);
  if (!idempotencyKey) {
    return fail(400, "IDEMPOTENCY_REQUIRED", "创建订单必须提供幂等键。");
  }

  const existingOrderId = k.DB.keyValue.get(`${idempotencyPrefix}${idempotencyKey}`);
  if (existingOrderId) {
    const existing = readOrders()[existingOrderId.toString()];
    if (existing) {
      return {
        success: true,
        idempotent: true,
        message: "重复请求返回同一订单。",
        order: existing,
      };
    }
  }

  const addressError = validateAddress(body?.address);
  if (addressError) return fail(400, "INVALID_ADDRESS", addressError);

  const result = calculate(body?.lines || [], body || {});
  if (!result.ok) return result.error;

  // 订单创建前再次根据服务端商品状态扣减库存。
  deductInventory(result.detail.lines);

  const order = createPendingOrder(body, result.detail);
  k.DB.keyValue.set(`${idempotencyPrefix}${idempotencyKey}`, order.id);

  return {
    success: true,
    idempotent: false,
    message: "pending 订单已创建，支付前不信任前端金额。",
    order,
  };
});
```

这里的 `calculate` 应集中处理四类边界：

| 边界 | 处理方式 |
|------|----------|
| 商品状态 | 根据服务端商品 ID / variant ID 查询，拒绝不存在或已下架商品 |
| 库存 | 创建订单前再次比较购买数量和库存，库存不足返回 `409 OUT_OF_STOCK` |
| 优惠和配送 | 根据服务端规则计算折扣、配送和税费，无效优惠码返回 `400 INVALID_DISCOUNT` |
| 前端金额 | 只用于标记 `priceChanged`，订单金额始终使用服务端价格 |

使用真实电商 API 时，常见落点是：

```ts
const cartId = k.commerce.cart.create();
k.commerce.cart.addOrUpdateLine(cartId, variantId, quantity);

const detail = k.commerce.cart.getDetail(cartId, {
  country: address.country,
  province: address.province,
  city: address.city,
});

const order = k.commerce.order.create(cartId, {
  address,
  note,
});
```

项目通常还会在外层 API 中补充幂等键、统一错误结构、traceId、风控和业务日志。不要把这些横切逻辑散落在前端组件里。

## Page：结算页交互

页面只负责生成一次性的幂等键、收集结算参数、调用预览或创建订单接口，并把错误展示给用户：

```html
<!-- @k-url /checkout -->
<button type="button" id="preview">结算预览</button>
<button type="button" id="createOrder">创建订单</button>
<button type="button" id="repeatOrder">重复创建</button>
<pre id="result"></pre>

<script>
  const state = {
    idempotencyKey: `checkout-${Date.now()}`,
    orderId: "",
  };

  function checkoutBody() {
    return {
      cartId: "cart-demo",
      lines: [
        { productId: "sku-bag", quantity: 2 },
        { productId: "sku-mug", quantity: 1 },
      ],
      discountCode: "SAVE10",
      shippingMethod: "standard",
      address: {
        country: "中国",
        province: "福建省",
        city: "厦门市",
        address1: "软件园二期",
        phone: "13800138000",
        firstName: "Demo",
        lastName: "Buyer",
      },
      idempotencyKey: state.idempotencyKey,
    };
  }

  async function post(action, payload) {
    const response = await fetch(`/api/checkout/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  document.querySelector("#preview").addEventListener("click", async () => {
    show(await post("preview", checkoutBody()));
  });

  document.querySelector("#createOrder").addEventListener("click", async () => {
    const data = await post("create-order", checkoutBody());
    if (data.order?.id) state.orderId = data.order.id;
    show(data);
  });
 </script>
```

用户重复点击“创建订单”时，前端可以禁用按钮降低重复请求，但这不是可靠防线。可靠防线必须在服务端：同一个幂等键只能产生一个订单；重复请求返回同一个订单结果。

## 错误处理建议

| 错误码 | HTTP | 前台处理 |
|--------|------|----------|
| `EMPTY_CART` | 400 | 提示购物车为空，引导返回商品页 |
| `PRODUCT_NOT_AVAILABLE` | 404 | 标记商品已下架，要求刷新购物车 |
| `OUT_OF_STOCK` | 409 | 展示当前库存，要求用户调整数量 |
| `INVALID_DISCOUNT` | 400 | 清空或移除优惠码，允许重新预览 |
| `INVALID_ADDRESS` | 400 | 定位到地址表单字段 |
| `IDEMPOTENCY_REQUIRED` | 400 | 前端重新生成幂等键后再提交 |

错误响应应保持统一 envelope，并在服务端日志中记录 traceId、cartId、customerId、orderId 和错误码。日志里不要记录完整手机号、邮箱、支付 token、银行卡信息或第三方回调密钥。

## 相关

- [CSRF 与重复提交防护](/guide/security/csrf-idempotency)
- [统一 API 响应与错误结构](/guide/troubleshooting/api-error-contract)
- [访问控制与 API 防越权](/guide/security/access-control)
- [电商后台](/cms/commerce/)
- [支付 API](/api/payment/)
