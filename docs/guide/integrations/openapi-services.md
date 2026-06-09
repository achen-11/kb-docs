# OpenAPI 外部服务

> 用 CMS Open API 定义外部服务契约，用 `k.openApi` 管理授权和调用，再用业务 API 封装参数、错误映射和日志。

## 适用场景

这套做法适合已经有 OpenAPI 文档的外部服务，例如：

- ERP、CRM、WMS、OMS 等系统同步订单、库存、物流；
- 第三方营销、会员、售后、工单平台；
- 内部微服务用 OpenAPI 暴露稳定契约；
- 需要按定义生成 KScript 类型提示和调用方法的集成。

如果只是调用一个临时 HTTP 接口，或者对方没有稳定 OpenAPI 文档，优先用 [HTTPClient 调用第三方接口](/guide/integrations/httpclient-services)。`k.openApi` 的价值在于把“服务契约、授权、方法名、参数结构”收敛到 CMS Open API 定义里。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS Open API | 保存 OpenAPI 文档、baseUrl、授权方案和缓存配置 | [Open API（CMS）](/cms/development/openapis) |
| OpenAPI Client | 通过 `k.openApi.<name>` 调用生成的方法 | [k.openApi](/api/openapi/) |
| Authorize | 写入 API key、Bearer、Basic 或 OAuth2 授权 | [k.openApi](/api/openapi/) |
| API | 包装业务参数、检查授权、映射上游错误 | [k.api](/api/api/) |
| KeyValue / Logger | 保存调用日志、调试状态和失败原因 | [k.DB.keyValue](/api/key-value/) |

## 推荐架构

页面不要直接访问 `k.openApi`。推荐让 Page 调自己的业务 API，业务 API 再调用 OpenAPI client：

```text
Page / View
    ↓
src/api/openapi-services.ts
    ↓
k.openApi.guidePartner._api_partner_orders_Get(...)
    ↓
CMS Open API: guidePartner
    ↓
外部系统 / Partner API
```

这样可以把授权凭据、OpenAPI 方法名、上游错误格式和重试策略留在服务端。前台只看到稳定的业务响应，例如 `OPENAPI_NOT_AUTHORIZED`、`OPENAPI_UPSTREAM_ERROR` 和正常业务数据。

## CMS：保存 OpenAPI 定义

在 CMS 后台进入“开发 -> Open API”，创建 `guidePartner` 定义。最小配置包括：

- `name`: `guidePartner`
- `type`: `code`
- `baseUrl`: `https://partner.example.com`
- `jsonData`: OpenAPI 3 文档

Kooboo 的运行时会用 `new Uri(baseUrl, path)` 拼接请求 URL。因为 OpenAPI path 通常以 `/` 开头，`baseUrl` 建议写到站点或服务根域名，不要写到子路径：

```json
{
  "openapi": "3.0.3",
  "info": { "title": "Guide Partner API", "version": "1.0.0" },
  "servers": [{ "url": "https://partner.example.com" }],
  "components": {
    "securitySchemes": {
      "partner_api_key": {
        "type": "apiKey",
        "in": "header",
        "name": "X-Partner-Key"
      }
    }
  },
  "security": [{ "partner_api_key": [] }],
  "paths": {
    "/api/partner/orders": {
      "get": {
        "parameters": [
          { "name": "status", "in": "query", "schema": { "type": "string" } },
          { "name": "page", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": { "200": { "description": "Order page" } }
      }
    }
  }
}
```

保存后运行 `kb pull type`，从 `kooboo.d.ts` 确认生成的方法名。不要猜 `operationId`，当前生成方法名来自标准化后的路径和 HTTP 方法，例如：

```ts
k.openApi.guidePartner._api_partner_orders_Get({ status: "paid", page: 1 });
k.openApi.guidePartner._api_partner_shipment_Post({ orderId: "EXT-1001", trackingNo: "DHL-001" });
```

## API：授权与业务封装

业务 API 先检查 OpenAPI client 和授权，再调用生成方法：

```ts
// @k-url /api/openapi-services/{action}

const openApiName = "guidePartner";
const apiKeySecret = "sandbox-key";

function getClient() {
  return (k.openApi as any)[openApiName];
}

function hasSandboxAuthorize(client: any) {
  const authorizes = client?.authorize?.list?.() || [];
  return authorizes.includes("sandbox");
}

k.api.get("authorize", () => {
  const client = getClient();
  client.authorize.addOrUpdate("sandbox", "partner_api_key", {
    name: "X-Partner-Key",
    accessToken: apiKeySecret,
  });

  return { success: true, authorizes: client.authorize.list() };
});
```

`addOrUpdate` 的第二个参数必须对应 OpenAPI `securitySchemes` 里的 key。API key 场景通常传 `{ name, accessToken }`；OAuth2、Bearer、Basic 按 CMS Open API 的授权模型填写。

## API：调用和错误映射

不要把 `k.openApi` 返回的上游原始结构直接透给页面。先映射成业务错误：

```ts
function fail(status: number, code: string, message: string, extra = {}) {
  k.response.statusCode(status);
  return { success: false, code, message, ...extra };
}

function mapOpenApiResult(result: any) {
  if (!result?.hasError) return result;
  const body = result.body || {};
  return fail(502, "OPENAPI_UPSTREAM_ERROR", "OpenAPI 上游服务返回错误。", {
    upstreamCode: body.code || result.code,
    upstreamMessage: body.message || result.errorMsg || "Unknown upstream error",
  });
}

k.api.post("orders", (body: { status?: string; page?: number }) => {
  const client = getClient();
  if (!client) return fail(500, "OPENAPI_CLIENT_NOT_READY", "OpenAPI client is not available.");
  if (!hasSandboxAuthorize(client)) return fail(401, "OPENAPI_NOT_AUTHORIZED", "请先写入 OpenAPI 授权凭据。");

  const result = client._api_partner_orders_Get({
    status: body?.status || "paid",
    page: Number(body?.page || 1),
  });

  const mapped = mapOpenApiResult(result);
  if (mapped?.success === false) return mapped;

  return { success: true, result };
});
```

上游 4xx/5xx 不一定会抛出 JavaScript 异常，可能以 `{ hasError, code, body, errorMsg }` 返回。业务 API 应显式检查 `hasError`，把错误状态码、上游错误码和用户可读信息拆开。

## Page：只触发业务 API

前台页面只需要触发业务 API：

```html
<!-- @k-url /openapi-services -->
<button id="setup" type="button">检查定义</button>
<button id="ordersWithoutAuth" type="button">未授权调用</button>
<button id="authorize" type="button">写入授权</button>
<button id="orders" type="button">查询订单</button>
<button id="shipment" type="button">同步发货</button>
<button id="upstreamError" type="button">上游错误</button>
<pre id="result">等待操作。</pre>
```

真实页面不要出现 OpenAPI 名称、授权 key、token 或外部服务根地址。需要给运营人员使用时，把按钮放在后台工具页，并加管理员鉴权。

## 常见坑

| 问题 | 处理方式 |
|------|----------|
| `kooboo.d.ts` 里 OpenAPI 接口为空 | 检查 CMS Open API 保存后的 `jsonData` 是否真的包含 `paths`；保存后重新 `kb pull type` |
| 猜 `operationId` 调用失败 | 以 `kb pull type` 生成的方法名为准，不按 `operationId` 猜 |
| baseUrl 带子路径导致 404 | 把 `baseUrl` 写成服务根域名，把子路径写进 OpenAPI `paths` |
| 页面未授权却成功 | 清理旧 authorize，或在业务 API 里显式检查 `authorize.list()` |
| 上游 500 被当成成功 | 检查返回值的 `hasError`，映射为业务错误和非 2xx 状态 |
| 前端暴露密钥 | Page 只调业务 API，授权凭据只写在服务端 |

## 相关

- [Open API（CMS）](/cms/development/openapis)
- [k.openApi](/api/openapi/)
- [HTTPClient 调用第三方接口](/guide/integrations/httpclient-services)
- [Webhook 接收与验签](/guide/integrations/webhook-signature)
- [业务日志与错误追踪](/guide/troubleshooting/business-logging)
