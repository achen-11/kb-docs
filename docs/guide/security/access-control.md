# 访问控制与 API 防越权

> 用户登录后，页面可以隐藏无权限入口，但真正的权限边界必须放在服务端 API：每次读取或修改业务数据都要校验当前会话、角色和资源归属。

## 适用场景

这套做法适合所有“用户只能访问自己的数据”的业务：

- 会员查看自己的订单、地址、发票；
- 商户查看自己的商品、库存和结算记录；
- 客服按角色查看客户订单；
- 组织成员查看本组织的项目、文件、报表；
- 后台 API 区分普通成员、运营、管理员。

不适合只在前端隐藏按钮或菜单。隐藏入口只能改善体验，不能防止用户直接请求 API、修改 URL 参数或复用浏览器请求。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 展示登录用户和允许操作，触发验证流程 | [Page](/templateEngine/page/) |
| API | 每次读取订单都校验登录态和资源归属 | [k.api](/api/api/) |
| Session | 保存当前登录用户和角色 | [k.session](/api/session/) |
| KeyValue / 数据库 | 保存订单 ownerId 等业务归属字段 | [k.DB.keyValue](/api/key-value/) |
| Logger | 记录越权访问和关键读取事件 | [k.logger](/api/logger/) |

## 推荐架构

访问控制应围绕“当前用户”和“资源归属”设计：

```text
Page / View
   ↓
API 读取 k.session 当前用户
   ↓
读取订单 ownerId / organizationId / tenantId
   ↓
判断 user.id、user.role 是否允许访问
   ↓
返回业务数据或稳定错误码
```

权限判断不要散落在多个页面脚本里。复杂项目可以把 `requireLogin`、`canReadOrder`、`canManageOrder` 这类函数放入 CodeBlock service，再被多个 API 复用。

## API：登录态和测试数据

下面示例用 KeyValue 保存用户和订单，用 session 保存当前用户。真实项目可以替换为 CMS 用户、会员、客户表或组织角色，但 API 校验顺序不变。

```ts
// @k-url /api/access-control/{action}

type User = {
  id: string;
  name: string;
  role: "customer" | "support";
};

type Order = {
  id: string;
  ownerId: string;
  total: number;
  status: string;
  items: string[];
};

const sessionUserKey = "access-control:user";

function currentUser(): User | null {
  const raw = k.session.get(sessionUserKey);
  return raw ? JSON.parse(raw) : null;
}

k.api.post("login", (body: { userId?: string }) => {
  const user = users().find((item) => item.id === String(body?.userId || ""));
  if (!user) {
    return { success: false, code: "USER_NOT_FOUND", message: "用户不存在。" };
  }

  k.session.set(sessionUserKey, JSON.stringify(user));

  return {
    success: true,
    message: "已写入服务端 session。",
    user,
  };
});
```

示例中的 `seed` 接口只用于本地验证。真实项目的数据通常来自订单表、客户表、组织表或 CMS 配置。

## API：订单归属校验

订单读取接口必须在服务端判断当前用户是否能访问目标订单：

```ts
k.api.get("order", () => {
  const user = currentUser();
  const orderId = String(k.request.queryString.orderId || "").trim();

  if (!user) {
    return {
      success: false,
      code: "UNAUTHENTICATED",
      message: "请先登录。",
      orderId,
    };
  }

  const order = orders().find((item) => item.id === orderId);
  if (!order) {
    return {
      success: false,
      code: "ORDER_NOT_FOUND",
      message: "订单不存在。",
      orderId,
    };
  }

  const canRead = user.role === "support" || order.ownerId === user.id;
  if (!canRead) {
    return {
      success: false,
      code: "FORBIDDEN_ORDER",
      message: "当前用户无权访问该订单。",
      orderId,
    };
  }

  return {
    success: true,
    data: {
      id: order.id,
      total: order.total,
      status: order.status,
      items: order.items,
    },
    user,
  };
});
```

客服、运营或管理员角色可以有更宽的读取权限，但这种例外必须显式写在服务端规则里，并记录审计日志。不要用“前端不会显示这个按钮”作为权限依据。

## Page：验证越权路径

前台页面可以模拟多种身份和访问路径：

```html
<!-- @k-url /access-control -->
<button id="alice" type="button">登录 Alice</button>
<button id="bob" type="button">登录 Bob</button>
<button id="support" type="button">登录客服</button>
<button id="read-alice" type="button">读取 Alice 订单</button>
<button id="attack" type="button">Bob 越权读 Alice 订单</button>
<pre id="result"></pre>

<script>
  async function login(userId) {
    return fetch("/api/access-control/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).then((response) => response.json());
  }

  async function readOrder(orderId) {
    return fetch(`/api/access-control/order?orderId=${encodeURIComponent(orderId)}`)
      .then((response) => response.json());
  }
</script>
```

真实页面可以根据角色隐藏菜单、按钮和字段，但每个 API 都要重新校验。列表接口也要按当前用户过滤，详情接口仍要单独校验，不能因为列表已过滤就信任详情参数。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 未登录 | 返回 `UNAUTHENTICATED`，引导登录 |
| 资源不存在 | 返回 `ORDER_NOT_FOUND`，不泄露敏感数据 |
| 资源属于其他用户 | 返回 `FORBIDDEN_ORDER`，记录审计 |
| 客服/运营角色 | 服务端显式允许，并记录读取原因 |
| 前端隐藏入口 | 只作为体验优化，不作为安全边界 |
| 批量列表 | 查询条件中加入当前用户/组织/租户维度 |

多租户或组织场景还要加入 `organizationId` / `tenantId` 校验。只校验用户 id 不够，用户可能属于多个组织，权限也可能随组织切换变化。

## 相关

- [k.session](/api/session/)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
- [k.logger](/api/logger/)
- [Page](/templateEngine/page/)
