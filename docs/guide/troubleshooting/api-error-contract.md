# 统一 API 响应与错误结构

> 给前台、第三方回调和内部页面提供稳定的响应 envelope，让成功、校验失败、鉴权失败、资源不存在、业务冲突和服务端异常都能被同一套客户端逻辑处理。

## 适用场景

这套做法适合登录注册、表单提交、购物车结算、订单操作、Webhook 接收、第三方接口代理和后台管理 API。只要调用方需要根据 `code`、`message`、`traceId`、字段错误或是否可重试来决定下一步，就应该先统一响应结构。

不适合把所有错误都包成 HTTP 200。HTTP status 仍应表达协议层语义，响应 body 再表达业务层语义。否则浏览器、监控、网关、CDN 和第三方调用方都会失去基本判断依据。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| API | 设置 HTTP status，返回统一 envelope | [k.api](/api/api/) |
| Response | 设置响应状态码 | [k.response](/api/response/) |
| Request | 读取 traceId、参数和调用上下文 | [k.request](/api/request/) |
| Security | 生成短 traceId | [k.security](/api/security/) |
| Logger | 记录失败 code、traceId 和可回查日志 | [k.logger](/api/logger/) |
| Page | 验证非 2xx 响应 body 仍可被前台读取 | [Page](/templateEngine/page/) |

## 推荐结构

建议所有业务 API 使用同一个 envelope：

```json
{
  "success": false,
  "code": "VALIDATION_FAILED",
  "message": "请求参数未通过校验。",
  "traceId": "trace-xxx",
  "data": null,
  "errors": [
    { "field": "email", "reason": "format", "message": "邮箱格式不正确。" }
  ],
  "retryable": false,
  "timestamp": "2026-06-08T20:18:29.762Z"
}
```

字段含义建议固定：

| 字段 | 说明 |
|------|------|
| `success` | 成功为 `true`，失败为 `false` |
| `code` | 稳定机器码，供前端分支、监控和第三方调用方识别 |
| `message` | 面向用户或调用方的安全提示，不暴露内部异常 |
| `traceId` | 一次请求的排查编号，应写入日志 |
| `data` | 成功数据；失败时为 `null` |
| `errors` | 字段级或明细错误列表 |
| `retryable` | 调用方是否可以稍后重试 |
| `timestamp` | 服务端响应时间 |

## API：封装成功和失败

下面示例用 `k.response.statusCode()` 设置 HTTP 状态，并保证 body 结构稳定：

```ts
// @k-url /api/error-contract/{action}

const logCategory = "Guide.ApiErrorContract";

function createTraceId() {
  return String(k.request.queryString.traceId || "").trim() || `trace-${k.security.shortGuid()}`;
}

function ok(data, traceId) {
  k.response.statusCode(200);
  k.logger.information(logCategory, JSON.stringify({ event: "api.success", traceId }));

  return {
    success: true,
    code: "OK",
    message: "请求成功。",
    traceId,
    data,
    errors: [],
    retryable: false,
    timestamp: new Date().toISOString(),
  };
}
```

失败响应不要把内部异常对象直接返回给前台：

```ts
function fail(options) {
  k.response.statusCode(options.status);

  const payload = {
    success: false,
    code: options.code,
    message: options.message,
    traceId: options.traceId,
    data: null,
    errors: options.errors || [],
    retryable: Boolean(options.retryable),
    timestamp: new Date().toISOString(),
  };

  const log = JSON.stringify({
    event: "api.failed",
    status: options.status,
    code: options.code,
    traceId: options.traceId,
    retryable: payload.retryable,
  });

  if (options.status >= 500) k.logger.error(logCategory, log);
  else k.logger.warning(logCategory, log);

  return payload;
}
```

## API：常见状态码

业务 API 不需要发明一套完全脱离 HTTP 的状态：

```ts
k.api.get("validation", () => {
  const traceId = createTraceId();
  return fail({
    status: 400,
    code: "VALIDATION_FAILED",
    message: "请求参数未通过校验。",
    traceId,
    errors: [
      { field: "email", reason: "format", message: "邮箱格式不正确。" },
      { field: "quantity", reason: "min", message: "数量必须大于 0。" },
    ],
  });
});

k.api.get("unauthorized", () => {
  return fail({
    status: 401,
    code: "AUTH_REQUIRED",
    message: "请先登录后再继续操作。",
    traceId: createTraceId(),
  });
});
```

推荐映射：

| HTTP | 业务 code 示例 | 场景 |
|------|----------------|------|
| 200 | `OK` | 业务成功 |
| 400 | `VALIDATION_FAILED` | 参数格式、字段校验失败 |
| 401 | `AUTH_REQUIRED` | 未登录或 token 失效 |
| 403 | `FORBIDDEN` | 已登录但无权限 |
| 404 | `RESOURCE_NOT_FOUND` | 资源不存在、已删除或下线 |
| 409 | `STATE_CONFLICT` | 重复提交、订单状态冲突、库存冲突 |
| 429 | `RATE_LIMITED` | 验证码、登录、Webhook 等限流 |
| 500 | `INTERNAL_ERROR` | 未预期异常 |
| 502 / 504 | `DEPENDENCY_FAILED` / `DEPENDENCY_TIMEOUT` | 第三方依赖失败或超时 |

## Page：读取非 2xx body

浏览器 `fetch()` 遇到 400、500 不会自动抛异常，仍可以读取 JSON body。前台应同时看 HTTP status 和业务 `code`：

```html
<!-- @k-url /error-contract -->
<button type="button" data-action="success">成功</button>
<button type="button" data-action="validation">校验失败</button>
<button type="button" data-action="exception">服务异常</button>
<pre id="result"></pre>

<script>
  async function callScenario(action) {
    const traceId = `front-${Date.now()}`;
    const response = await fetch(`/api/error-contract/${action}?traceId=${traceId}`);
    const payload = await response.json();

    result.textContent = JSON.stringify({
      http: response.status,
      code: payload.code,
      traceId: payload.traceId,
      body: payload,
    }, null, 2);
  }
</script>
```

如果项目里使用统一请求库，应把“HTTP 异常”“业务失败”和“网络失败”拆开处理。网络失败没有服务端 `traceId`，业务失败通常有 `traceId`。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 字段校验失败 | HTTP 400，返回 `errors[]`，每项包含 `field` 和 `reason` |
| 未登录 | HTTP 401，前端跳登录或刷新 session |
| 无权限 | HTTP 403，不要只隐藏按钮，服务端也要拦截 |
| 资源不存在 | HTTP 404，避免透露用户无权访问的资源细节 |
| 状态冲突 | HTTP 409，提示刷新状态或停止重复提交 |
| 依赖超时 | HTTP 504 或 500，`retryable: true`，记录 traceId |
| 内部异常 | 返回安全 message，内部错误只写日志 |
| 第三方调用 | 保留第三方错误码映射，不把原始敏感响应透传给前台 |

## 相关

- [业务日志与错误追踪](./business-logging.md)
- [k.api](/api/api/)
- [k.response](/api/response/)
- [k.request](/api/request/)
- [k.logger](/api/logger/)
