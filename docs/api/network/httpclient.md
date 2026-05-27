# k.net.httpClient

> 在 KScript 中发起出站 HTTP 请求

## 概述

`k.net.httpClient` 封装了常见 HTTP 调用能力：JSON/表单/multipart 请求体、批量请求等。入口对象为 `k.net` 下的 `httpClient`（camelCase）。

## 创建请求体

```ts
const json = k.net.httpClient.createJsonContent({ name: "kooboo" })
const text = k.net.httpClient.createStringContent("plain text")
const form = k.net.httpClient.createFormUrlEncodedContent({ key: "value" })
```

## 发送请求

具体 `get` / `post` 等方法以 Kooboo 源码 `KScript.Net.Http.KHttpClient` 为准。典型 POST JSON 示例：

```ts
k.api.post("proxy", () => {
    const content = k.net.httpClient.createJsonContent({ q: "hello" })
    const response = k.net.httpClient.post("https://httpbin.org/post", content)
    return response
})
```

## 批量请求

```ts
const batch = k.net.httpClient.createBatchRequest()
const task = batch.addTask("https://example.com/data.json", "get")
task.responseType = "String"
return batch.execute()
```

## 相关文档

- [k.net.webSocket](./websocket.md)
- `k.utils.ping` — 网络探测在 `k.utils` 下（文档待补充）
