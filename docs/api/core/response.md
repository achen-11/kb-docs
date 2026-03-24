# k.response

> HTTP 响应处理 - 设置响应内容、状态码、重定向等

## 概述

`k.response` 提供设置 HTTP 响应的各种方法，包括返回内容、设置头信息、重定向、返回 JSON 等。

## TypeScript 定义

```ts
interface Response {
  meta: PageMeta;

  write(value: any): void;           // 输出内容
  setHeader(key: string, value: string): void;  // 设置响应头
  redirect(url: string, absolute?: boolean): void;  // 重定向
  json(value: any): void;            // 返回 JSON
  renderView(ViewBody: string): void; // 渲染视图
  binary(contentType: string, bytes: number[]): void;  // 二进制响应
  binary(contentType: string, bytes: number[], filename: string): void;
  file(path: string, contentType?: string, fileName?: string): void;  // 文件响应
  statusCode(code: number): void;    // 设置状态码
  unauthorized(): void;               // 401 未授权
  notFound(): void;                  // 404 未找到
  execute(url: string): void;        // 执行其他 URL
}
```

## 方法

### write()

输出内容到响应体。非对象类型会直接输出，对象会被序列化为 JSON。

```ts
k.api.get(() => {
    k.response.write("hello world")
    k.response.write(1234)

    const obj = { name: "kooboo" }
    k.response.write(obj)
})
// 输出: hello world1234{ "name": "kooboo" }
```

### json()

以 JSON 格式输出响应。会自动设置 `Content-Type: application/json`。

```ts
k.api.get(() => {
    k.response.json({
        success: true,
        data: { id: 1, name: "test" }
    })
})
// 输出: { "success": true, "data": { "id": 1, "name": "test" } }
```

### file()

返回文件响应。

```ts
// 基础用法
k.api.get(() => {
    k.response.file("images/logo.png")
})

// 指定 Content-Type 和下载文件名
k.api.get(() => {
    k.response.file("docs/report.pdf", "application/pdf", "report-2024.pdf")
})
```

### binary()

返回二进制数据响应。

```ts
k.api.get(() => {
    const svgData = k.file.readBinary("files/logo.svg")
    k.response.binary("image/svg+xml", svgData)
})
```

### statusCode()

设置 HTTP 状态码。

```ts
k.api.get(() => {
    k.response.statusCode(404)
    return "Not Found"
})
```

### unauthorized()

返回 401 未授权响应。

```ts
k.api.get(() => {
    // 内部已设置 statusCode(401)
    k.response.unauthorized()
})
// HTTP 状态码: 401
// 消息: "Unauthorized access"
```

### notFound()

返回 404 未找到响应。

```ts
k.api.get(() => {
    k.response.notFound()
})
```

### redirect()

重定向到指定 URL。

```ts
// 相对路径
k.api.get(() => {
    k.response.redirect("/login")
})

// 绝对路径
k.api.get(() => {
    k.response.redirect("https://example.com")
})

// 特殊协议 (如微信)
k.api.get(() => {
    k.response.redirect("wechat://kooboo.com", true)
})
```

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `url` | string | 是 | 目标 URL |
| `absolute` | boolean | 否 | 是否为绝对路径（包含协议） |

### setHeader()

设置自定义响应头。

```ts
k.api.get(() => {
    k.response.setHeader("X-Custom-Header", "value")
    k.response.setHeader("Access-Control-Allow-Origin", "*")
    return "ok"
})
```

### execute()

在当前上下文中执行另一个 URL，并将结果写入响应。

```ts
// API: /api/base
k.api.get("base", () => {
    k.response.json({ base: "data" })
})

// API: /api/wrapper
k.api.get("wrapper", () => {
    k.response.execute("/api/base")
    k.response.write(" appended")
})
// 输出: { "base": "data" } appended
```

## 常见用法

### CORS 跨域设置

```ts
k.api.options(() => {
    k.response.setHeader("Access-Control-Allow-Origin", "*")
    k.response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
    k.response.setHeader("Access-Control-Allow-Headers", "Content-Type")
})
```

### 文件下载

```ts
k.api.get("download", () => {
    const filePath = "exports/data.csv"
    k.response.file(filePath, "text/csv", "export.csv")
})
```

## 相关文档

- [k.request](./request.md) - HTTP 请求处理
- [k.cookie](./cookie.md) - Cookie 管理
- [k.session](./session.md) - 会话状态
