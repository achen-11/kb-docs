# CSRF 与重复提交防护

> 对订单提交、支付发起、资料保存等非幂等动作，同时使用 session CSRF token 和幂等键，防止跨站伪造请求与重复点击。

## 适用场景

这套做法适合会改变服务端状态的前台操作，例如：

- 下单、支付发起、退款申请；
- 表单保存、资料修改、密码重置；
- 优惠券领取、报名预约、库存扣减；
- 第三方回调后的补偿或重试入口。

不适合只读查询接口。只读接口主要关注权限和缓存隔离；写入接口则必须处理“请求是不是来自当前会话”和“同一个动作是否已经处理过”两个问题。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 获取 token、生成幂等键、提交表单 | [Page](/templateEngine/page/) |
| API | 校验 CSRF token、检查幂等键、返回统一错误 | [k.api](/api/api/) |
| Session | 保存当前会话 token 和已处理幂等键 | [k.session](/api/session/) |
| Security | 生成不可预测 token | [k.security](/api/security/) |
| Commerce / Form | 执行真实业务写入 | [电商](/cms/commerce/) · [表单](/cms/development/forms) |

## 推荐架构

CSRF token 和幂等键不要混为一个字段：

```text
页面加载 / 表单打开
        ↓
API 生成或复用 session CSRF token
        ↓
用户点击提交时生成新的 idempotencyKey
        ↓
API 校验 token，再检查幂等键
        ↓
首次请求执行业务并记录结果；重复请求返回 previous
```

CSRF token 表示“这个请求来自当前会话”；幂等键表示“这个业务动作是否已经处理过”。一个页面会话可以复用同一个 CSRF token，但每一次新的业务动作都应该生成新的幂等键。

## API：token 与幂等提交

下面示例用 `k.session` 保存当前会话 token 和已处理的幂等键。真实项目中，`order` 部分应替换为订单、支付、表单等业务写入。

```ts
// @k-url /api/guide-csrf-idempotency/{action}

type OrderSubmitBody = {
  csrfToken?: string;
  idempotencyKey?: string;
  productId?: string;
  quantity?: number;
};

const csrfSessionKey = "guide:csrf-token";
const idempotencyPrefix = "guide:idempotency:";

function normalize(value: unknown) {
  return String(value || "").trim();
}

function sessionKeys() {
  const keys = k.session.keys;
  return keys ? Array.from(keys).map((key) => String(key)) : [];
}

function getOrCreateToken() {
  let token = normalize(k.session.get(csrfSessionKey));
  if (!token) {
    token = k.security.shortGuid();
    k.session.set(csrfSessionKey, token);
  }
  return token;
}

k.api.get("token", () => {
  return {
    success: true,
    csrfToken: getOrCreateToken(),
    sessionKeys: sessionKeys(),
  };
});
```

提交接口先校验 token，再检查幂等键是否已经处理过：

```ts
k.api.post("submit", (body: OrderSubmitBody) => {
  const expectedToken = normalize(k.session.get(csrfSessionKey));
  const receivedToken = normalize(body?.csrfToken);
  const idempotencyKey = normalize(body?.idempotencyKey);

  if (!expectedToken || !receivedToken || receivedToken !== expectedToken) {
    return {
      success: false,
      code: "INVALID_CSRF_TOKEN",
      field: "csrfToken",
      message: "请求令牌无效，请刷新页面后重试。",
    };
  }

  if (!idempotencyKey) {
    return {
      success: false,
      code: "MISSING_IDEMPOTENCY_KEY",
      field: "idempotencyKey",
      message: "缺少幂等键，无法防止重复提交。",
    };
  }

  const idempotencySessionKey = `${idempotencyPrefix}${idempotencyKey}`;
  if (k.session.containsKey(idempotencySessionKey)) {
    const previous = k.session.get(idempotencySessionKey);
    return {
      success: false,
      code: "DUPLICATE_SUBMIT",
      message: "该请求已经处理过，请勿重复提交。",
      previous: previous ? JSON.parse(previous) : null,
    };
  }

  const order = {
    orderId: `ORDER-${Date.now()}`,
    productId: normalize(body?.productId || "SKU-1001"),
    quantity: Number(body?.quantity || 1),
    acceptedAt: new Date().toISOString(),
  };

  k.session.set(idempotencySessionKey, JSON.stringify(order));

  return {
    success: true,
    message: "订单提交成功。",
    data: order,
  };
});
```

如果幂等状态需要跨设备、跨会话或支付回调复用，不要只放在 session；应把幂等键和业务结果保存到数据库、订单记录或专门的请求表中。

## Page：每次动作生成新幂等键

页面进入时可以先取 token；每次用户发起新的业务动作时生成新的幂等键。重复提交测试则故意使用同一个幂等键提交两次：

```html
<!-- @k-url /guide-csrf-idempotency -->
<button id="load-token" type="button">获取 token</button>
<button id="submit" type="button">合法提交</button>
<button id="duplicate" type="button">重复提交同一幂等键</button>
<button id="missing-token" type="button">缺 token 提交</button>
<pre id="result"></pre>

<script>
  let csrfToken = "";
  let currentIdempotencyKey = "";

  function newIdempotencyKey() {
    currentIdempotencyKey = `idem-${Date.now()}`;
  }

  async function getToken() {
    const response = await fetch("/api/guide-csrf-idempotency/token");
    const data = await response.json();
    csrfToken = data.csrfToken;
    return data;
  }

  async function submit(payload) {
    const response = await fetch("/api/guide-csrf-idempotency/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  document.querySelector("#submit").addEventListener("click", async () => {
    if (!csrfToken) await getToken();
    newIdempotencyKey();
    const data = await submit({ csrfToken, idempotencyKey: currentIdempotencyKey });
    result.textContent = JSON.stringify(data, null, 2);
  });

  document.querySelector("#duplicate").addEventListener("click", async () => {
    if (!csrfToken) await getToken();
    newIdempotencyKey();
    const payload = { csrfToken, idempotencyKey: currentIdempotencyKey };
    const first = await submit(payload);
    const second = await submit(payload);
    result.textContent = JSON.stringify({ first, second }, null, 2);
  });
</script>
```

按钮禁用、loading 状态和防抖可以改善体验，但不能替代服务端幂等校验。用户刷新、双击、浏览器重试、网络代理重放请求时，最终仍要由 API 保证不会重复写入。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 缺少或不匹配 token | 返回 `INVALID_CSRF_TOKEN`，提示刷新页面 |
| 缺少幂等键 | 返回 `MISSING_IDEMPOTENCY_KEY`，拒绝写入 |
| 幂等键已处理 | 返回 `DUPLICATE_SUBMIT` 和上一次处理结果 |
| token 长时间未刷新 | 重新获取 token 后再提交，不自动重放敏感动作 |
| 支付/回调幂等 | 使用数据库或订单号保存幂等状态，不依赖 session |
| 多标签页 | CSRF token 可复用；幂等键按每次动作生成 |

还要注意：

- 不把 CSRF token 写入 URL，避免进入日志、Referer 或分享链接；
- 不把管理员密码、验证码、支付密钥写入幂等记录；
- 真实订单应在服务端重新计算金额、库存和权限；
- 幂等键可以由前端生成，但是否处理过必须由服务端判断。

## 相关

- [k.session](/api/session/)
- [k.security](/api/security/)
- [k.api](/api/api/)
- [Page](/templateEngine/page/)
- [表单](/cms/development/forms)
- [电商](/cms/commerce/)
