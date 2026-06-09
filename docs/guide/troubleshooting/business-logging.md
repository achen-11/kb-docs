# 业务日志与错误追踪

> 给订单、表单、支付、通知等关键业务 API 统一返回 `traceId`，并用 `k.logger` 记录可回查、已脱敏的业务日志。

## 适用场景

这套做法适合需要在上线后快速定位问题的写入类业务，例如：

- 结算、下单、支付发起和退款申请；
- 表单提交、报名预约、优惠券领取；
- 邮件短信通知、Webhook 接收、第三方接口代理；
- 定时任务和批处理。

不适合把日志当成业务数据库使用。日志用于排查问题、追踪调用和审计关键事件；订单状态、通知发送状态、幂等记录仍应保存在业务表或订单记录中。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 触发成功、校验失败和异常路径，展示 `traceId` | [Page](/templateEngine/page/) |
| API | 返回统一错误结构，捕获异常并写日志 | [k.api](/api/api/) |
| Logger | 记录 Information / Warning / Error 级别日志 | [k.logger](/api/logger/) |
| Security | 生成 traceId，避免暴露敏感字段 | [k.security](/api/security/) |
| CMS | 在后台开发菜单查看代码日志 | [代码日志](/cms/development/code-log) |

## 推荐架构

业务日志要围绕一次请求的 `traceId` 组织：

```text
Page / 外部系统
        ↓
API 生成或接收 traceId
        ↓
业务校验 / 服务调用
        ↓
k.logger 写入结构化 JSON 日志
        ↓
响应中返回 traceId，便于客服和开发回查
```

日志级别建议按语义使用：

| 级别 | 适合记录 |
|------|----------|
| Information | 成功创建订单、通知已发送、任务完成 |
| Warning | 参数校验失败、库存不足、第三方返回可恢复错误 |
| Error | 捕获到异常、依赖服务不可用、业务写入失败 |
| Critical | 影响站点整体可用性的严重故障 |

## API：统一 traceId 和错误结构

下面示例模拟结算 API。成功写 `Information`，校验失败写 `Warning`，捕获异常写 `Error`。日志中保留 traceId 和业务字段，但对邮箱、密码、token 做脱敏。

```ts
// @k-url /api/business-logging/{action}

type CheckoutBody = {
  traceId?: string;
  customerEmail?: string;
  sku?: string;
  quantity?: number;
  mode?: string;
  password?: string;
  token?: string;
};

const logCategory = "Guide.BusinessLogging";

function createTraceId(value?: string) {
  const existing = String(value || "").trim();
  return existing || `trace-${k.security.shortGuid()}`;
}

function maskEmail(value: string) {
  const at = value.indexOf("@");
  if (at <= 1) return value ? "***" : "";
  return `${value.slice(0, 1)}***${value.slice(at)}`;
}

function redact(payload: CheckoutBody) {
  return {
    traceId: payload.traceId,
    customerEmail: maskEmail(String(payload.customerEmail || "")),
    sku: payload.sku,
    quantity: payload.quantity,
    mode: payload.mode,
    password: payload.password ? "[REDACTED]" : undefined,
    token: payload.token ? "[REDACTED]" : undefined,
  };
}

function writeLog(level: "information" | "warning" | "error", event: string, data: Record<string, unknown>) {
  const message = JSON.stringify({
    event,
    ...data,
    loggedAt: new Date().toISOString(),
  });

  if (level === "information") k.logger.information(logCategory, message);
  if (level === "warning") k.logger.warning(logCategory, message);
  if (level === "error") k.logger.error(logCategory, message);
}
```

业务 API 捕获异常后返回面向用户的错误，不把内部异常直接暴露给前端：

```ts
k.api.post("checkout", (body: CheckoutBody) => {
  const traceId = createTraceId(body?.traceId);
  const payload = { ...body, traceId };

  try {
    if (payload.mode === "exception") {
      throw new Error("模拟库存服务不可用");
    }

    if (!payload.customerEmail || !String(payload.customerEmail).includes("@")) {
      writeLog("warning", "checkout.validation_failed", {
        traceId,
        payload: redact(payload),
      });

      return {
        success: false,
        code: "VALIDATION_FAILED",
        message: "结算参数未通过校验。",
        traceId,
      };
    }

    const order = {
      orderId: `ORDER-${Date.now()}`,
      sku: payload.sku,
      quantity: payload.quantity,
      customerEmail: maskEmail(String(payload.customerEmail)),
    };

    writeLog("information", "checkout.created", {
      traceId,
      order,
      payload: redact(payload),
    });

    return {
      success: true,
      traceId,
      message: "结算请求已处理。",
      data: order,
    };
  } catch (error) {
    writeLog("error", "checkout.exception", {
      traceId,
      message: error instanceof Error ? error.message : String(error),
      payload: redact(payload),
    });

    return {
      success: false,
      code: "CHECKOUT_EXCEPTION",
      message: "结算服务暂时不可用，请稍后重试。",
      traceId,
    };
  }
});
```

## API：按 traceId 查询日志

`k.logger.query` 查询时要指定日志级别。若前台希望用一个 traceId 查成功、警告和异常，可以在 API 中按级别合并：

```ts
k.api.get("logs", () => {
  const keyword = String(k.request.queryString.keyword || "").trim();
  const level = String(k.request.queryString.level || "").trim();
  const levels = level ? [level] : ["Information", "Warning", "Error"];
  const list = [];

  for (const item of levels) {
    const result = k.logger.query({
      category: logCategory,
      level: item,
      keyword,
      pageIndex: 1,
      pageSize: 20,
    });

    for (const log of result.List || []) {
      list.push(log);
    }
  }

  return {
    List: list,
    Total: list.length,
    PageIndex: 1,
    PageSize: 20,
    PageCount: list.length > 0 ? 1 : 0,
  };
});
```

真实后台页面可以把 `traceId`、级别、时间范围和关键词作为筛选条件；普通访客页面不应暴露全量日志查询。

## Page：展示 traceId

前台页面只需要把 `traceId` 展示给用户或客服，并提供最小回查入口：

```html
<!-- @k-url /business-logging -->
<button id="success" type="button">成功结算</button>
<button id="validation" type="button">触发校验失败</button>
<button id="exception" type="button">触发异常</button>
<button id="query" type="button">查询当前 traceId 日志</button>
<pre id="result"></pre>

<script>
  let currentTraceId = "";

  function newTraceId() {
    currentTraceId = `front-${Date.now()}`;
  }

  async function checkout(mode) {
    newTraceId();
    const response = await fetch("/api/business-logging/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        traceId: currentTraceId,
        customerEmail: mode === "validation" ? "bad" : "buyer@example.com",
        sku: mode === "validation" ? "" : "SKU-1001",
        quantity: mode === "validation" ? 0 : 2,
        mode,
      }),
    });
    result.textContent = JSON.stringify(await response.json(), null, 2);
  }
</script>
```

线上页面通常不直接展示日志内容，只展示 `traceId` 和可读错误；内部排查页或后台再根据 traceId 查询详细日志。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 参数校验失败 | 返回 `VALIDATION_FAILED`，日志级别用 `Warning` |
| 依赖服务异常 | 捕获异常，返回通用错误，日志级别用 `Error` |
| 成功写入 | 记录关键业务 id，日志级别用 `Information` |
| 密码、token、验证码 | 写日志前替换为 `[REDACTED]` |
| 邮箱、手机号 | 按业务需要部分脱敏 |
| 支付、Webhook | 同时记录业务幂等键和 traceId |

不要把完整请求头、cookie、支付密钥、验证码、密码、私有 token 原样写进日志。日志越容易搜索，越要克制字段范围。

## 相关

- [k.logger](/api/logger/)
- [k.api](/api/api/)
- [k.security](/api/security/)
- [代码日志](/cms/development/code-log)
- [Page](/templateEngine/page/)
