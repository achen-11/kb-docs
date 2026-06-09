# HTTPClient 调用第三方接口

> 用 `k.net.httpClient` 在服务端调用第三方 API，把鉴权、超时、错误结构和重试边界收敛在 Kooboo API 内。

## 适用场景

这套做法适合物流报价、CRM 线索同步、ERP 库存查询、营销系统订阅、第三方风控和内部服务代理等场景。共同特点是：前台页面需要一个业务结果，但不能直接暴露第三方密钥、Header 或错误细节。

不适合只拉取一个公开 JSON 或图片的轻量脚本；那类可以考虑 [k.net.url](/api/net/url)。需要复杂 Header、JSON body、状态码判断、保存响应或后续批量任务时，优先用 `k.net.httpClient`。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 触发业务动作并展示结果 | [Page](/templateEngine/page/) |
| API | 校验请求、组装第三方参数、统一返回结构 | [k.api](/api/api/) |
| HTTPClient | 发起服务端 HTTP 请求，读取状态码和响应体 | [k.net.httpClient](/api/net/httpclient) |
| Request | 读取前台提交的数据 | [k.request](/api/request/) |
| Logger | 记录上游失败、超时和关键 requestId | [k.logger](/api/logger/) |

## 推荐架构

不要让页面直接调用第三方接口。前端只调用 Kooboo API，Kooboo API 再代理第三方：

```text
Page / View
    ↓
src/api/logistics-quote.ts
    ↓
k.net.httpClient.send(...)
    ↓
第三方物流 / CRM / ERP API
```

这样可以把密钥、Header、超时、错误转换、日志和重试策略留在服务端。页面只消费稳定的业务结构，例如 `{ success, message, data }`。

## API：调用第三方 JSON 接口

下面示例用物流报价模拟第三方服务。真实项目中，把 `providerUrl` 换成外部接口地址，并从安全配置中读取 token。

```ts
// @k-url /api/logistics-quote/{action}

type QuoteRequest = {
  orderId?: string;
  city?: string;
};

function parseJson(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function callProvider(payload: object) {
  const providerUrl = "https://provider.example.com/quote";
  const content = k.net.httpClient.createJsonContent(payload);
  const response = k.net.httpClient.send(providerUrl, "post", content, {
    Authorization: "Bearer ${token}",
    "X-Integration-Name": "logistics-quote",
  }, 10);

  return {
    ok: response.success,
    statusCode: response.statusCode,
    body: parseJson(response.bodyString()),
  };
}

k.api.post("quote", (body: QuoteRequest) => {
  const upstream = callProvider({
    orderId: String(body?.orderId || ""),
    city: String(body?.city || ""),
  });

  if (!upstream.ok) {
    return {
      success: false,
      message: "第三方服务暂不可用，请稍后重试。",
      upstreamStatus: upstream.statusCode,
    };
  }

  return {
    success: true,
    message: "第三方物流报价已获取。",
    data: upstream.body?.quote,
    providerRequestId: upstream.body?.requestId,
  };
});
```

不要把第三方原始错误完整返回给前台。可以返回 `upstreamStatus` 和可读错误；详细 body、requestId、耗时等写入日志，供排查使用。

## Page：只调用 Kooboo API

页面不需要知道第三方 URL 或 token：

```html
<!-- @k-url /logistics-quote-demo -->
<button id="quote" type="button">获取物流报价</button>
<button id="fail" type="button">模拟第三方失败</button>
<pre id="result">等待操作。</pre>

<script>
  const result = document.querySelector("#result");

  async function requestQuote(simulateFailure) {
    const response = await fetch("/api/logistics-quote/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "ORDER-1001",
        city: "Shanghai",
        simulateFailure,
      }),
    });
    result.textContent = JSON.stringify(await response.json(), null, 2);
  }

  document.querySelector("#quote").addEventListener("click", () => requestQuote(false));
  document.querySelector("#fail").addEventListener("click", () => requestQuote(true));
</script>
```

失败按钮只是验证用。真实页面通常不暴露 `simulateFailure`，但应该能展示 API 返回的稳定失败结构。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 第三方 2xx | 解析 body，返回业务字段和 provider requestId |
| 第三方 4xx | 不盲目重试；记录参数和上游错误码 |
| 第三方 5xx | 返回可读失败，必要时进入重试或队列 |
| 超时 | 设置明确 timeout，避免请求长期占用 |
| body 非 JSON | 记录原始片段，返回通用错误 |
| 前台重复点击 | 页面禁用按钮；服务端用幂等键保护写操作 |

涉及订单、支付、库存等场景时，还要把“第三方调用成功”和“本地业务状态更新”分成两个步骤，并设计补偿或重试，避免半成功状态。

## 相关

- [k.net.httpClient](/api/net/httpclient)
- [k.net.url](/api/net/url)
- [k.api](/api/api/)
- [k.request](/api/request/)
- [k.logger](/api/logger/)
