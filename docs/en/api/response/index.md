# k.response

> HTTP response processing - set response content, status code, redirection, etc.

## Overview

`k.response` provides various methods for setting HTTP responses, including returning content, setting header information, redirecting, returning JSON, etc.

## TypeScript definition

```ts
interface Response {
  meta: PageMeta;

  write(value: any): void;           // Write content
  setHeader(key: string, value: string): void;  // Set response header
  redirect(url: string, absolute?: boolean): void;  // Redirect
  json(value: any): void;            // Return JSON
  renderView(ViewBody: string): void; // Render view
  binary(contentType: string, bytes: number[]): void;  // Binary response
  binary(contentType: string, bytes: number[], filename: string): void;
  file(path: string, contentType?: string, fileName?: string): void;  // File response
  statusCode(code: number): void;    // Set status code
  unauthorized(): void;               // 401 unauthorized
  notFound(): void;                  // 404 not found
  execute(url: string): void;        // Execute another URL
}
```

## meta

`k.response.meta` is the object-style counterpart of [k.page](../page/) for the page head. Use it when `k.page` is not available or when you prefer object access to set the current page `<title>` and `<meta>` tags.

| Member | Description |
|------|------|
| `meta.title` | Read or write the page title |
| `meta.setMeta(name, content)` | Set `<meta name="..." content="...">` |
| `meta.setMeta(name, httpEquiv, charSet, content)` | Set a meta with `http-equiv` / `charset` |
| `meta.getMeta(name)` | Read a meta that was already set |
| `meta.setCustomerHeader(headerString)` | Append a custom head fragment |

```ts
k.api.get(() => {
    k.response.meta.title = "Order detail"
    k.response.meta.setMeta("description", "Order detail page")
    return { ok: true }
})
```

## Methods

### write()

Output content to the response body. Non-object types will be output directly, and objects will be serialized into JSON.

```ts
k.api.get(() => {
    k.response.write("hello world")
    k.response.write(1234)

    const obj = { name: "kooboo" }
    k.response.write(obj)
})
// Output: hello world1234{ "name": "kooboo" }
```

| Parameter | Type | Required | Description |
|------|------|------|------|
| `value` | `any` | yes | Content to write to the response body |

**Returns:** `void`.

### json()

Output the response in JSON format. `Content-Type: application/json` is automatically set.

```ts
k.api.get(() => {
    k.response.json({
        success: true,
        data: { id: 1, name: "test" }
    })
})
// Output: { "success": true, "data": { "id": 1, "name": "test" } }
```

| Parameter | Type | Required | Description |
|------|------|------|------|
| `value` | `any` | yes | Value to serialize as JSON |

**Returns:** `void`.

### file()

Return file response.

```ts
// Basic usage
k.api.get(() => {
    k.response.file("images/logo.png")
})

// Specify Content-Type and download filename
k.api.get(() => {
    k.response.file("docs/report.pdf", "application/pdf", "report-2024.pdf")
})
```

| Parameter | Type | Required | Description |
|------|------|------|------|
| `path` | `string` | yes | Site file path |
| `contentType` | `string` | no | Response Content-Type |
| `fileName` | `string` | no | File name used for download |

**Returns:** `void`.

### binary()

Returns a binary data response.

```ts
k.api.get(() => {
    const svgData = k.file.readBinary("files/logo.svg")
    k.response.binary("image/svg+xml", svgData)
})
```

| Parameter | Type | Required | Description |
|------|------|------|------|
| `contentType` | `string` | yes | Response Content-Type |
| `bytes` | `number[]` | yes | Binary byte array |
| `filename` | `string` | no | Download file name |

**Returns:** `void`.

### statusCode()

Set HTTP status code.

```ts
k.api.get(() => {
    k.response.statusCode(404)
    return "Not Found"
})
```

| Parameter | Type | Required | Description |
|------|------|------|------|
| `code` | `number` | yes | HTTP status code |

**Returns:** `void`.

### unauthorized()

Returns a 401 Unauthorized response.

```ts
k.api.get(() => {
    // statusCode(401) is already set internally
    k.response.unauthorized()
})
// HTTP status code: 401
// Message: "Unauthorized access"
```

**Parameters:** None.

**Returns:** `void`.

### notFound()

Returns 404 Response Not Found.

```ts
k.api.get(() => {
    k.response.notFound()
})
```

**Parameters:** None.

**Returns:** `void`.

### redirect()

Redirect to the specified URL.

```ts
// Relative path
k.api.get(() => {
    k.response.redirect("/login")
})

// Absolute path
k.api.get(() => {
    k.response.redirect("https://example.com")
})

// Custom protocol (such as WeChat)
k.api.get(() => {
    k.response.redirect("wechat://kooboo.com", true)
})
```

| Parameter | Type | Required | Description |
|------|------|------|------|
| `url` | string | yes | Target URL |
| `absolute` | boolean | no | Whether it is an absolute path (including protocol) |

**Returns:** `void`.

### setHeader()

Set custom response headers.

```ts
k.api.get(() => {
    k.response.setHeader("X-Custom-Header", "value")
    k.response.setHeader("Access-Control-Allow-Origin", "*")
    return "ok"
})
```

| Parameter | Type | Required | Description |
|------|------|------|------|
| `key` | `string` | yes | Response header name |
| `value` | `string` | yes | Response header value |

**Returns:** `void`.

### renderView()

Writes rendered HTML at the current output position. What happens depends on what you pass in:

| Input | Behavior |
|------|------|
| A `<view id="view name"></view>` string | The `id` is extracted and the matching View resource is rendered into the current output |
| Any other HTML fragment | The fragment is first evaluated as a template (`k-*` bindings and `<script env="server">` inside it run), then the result is written to the current output |

Commonly used to output a View inside the `<head>` of a Layout/Page (`<view id="...">` cannot be written directly in the head), and to output an HTML fragment returned by a third party from an API route. Because the fragment is template-evaluated, use [write()](#write) instead when the string must be emitted as-is.

```ts
// In a template: output a View resource
k.response.renderView("<view id='tailwind'></view>")
```

| Parameter | Type | Required | Description |
|------|------|------|------|
| `ViewBody` | `string` | yes | A `<view id="view name"></view>` string, or any HTML fragment |

**Returns:** `void`.

The abbreviation can also be used in the template: `<script env="server" view="tailwind"></script>` (`view` is the View resource name). See [Template Engine - Referencing a View Inside `<head>`](/en/templateEngine/view/#referencing-a-view-inside-head) for details.

### execute()

Execute another URL in the current context and write the result to the response.

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
// Output: { "base": "data" } appended
```

| Parameter | Type | Required | Description |
|------|------|------|------|
| `url` | `string` | yes | URL to execute in the current context |

**Returns:** `void`.

## Common usage

### CORS cross-domain settings

CORS is handled by the platform; you do not need a script for the OPTIONS preflight:

- **Single API**: set `cors: true` on the object managed by [k.site.codes](../site/code.md).
- **Whole site**: turn on **CORS** (`enableCORS`) in [Site Settings → Access Control](/en/cms/settings/basic/access#cors).

Once enabled, the platform adds `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers` and `Access-Control-Allow-Credentials` (echoing the request headers), and an OPTIONS preflight does not run the script body.

Use `k.response.setHeader` when you need to control a header yourself; the platform does not overwrite a header that already exists:

```ts
k.api.get(() => {
    k.response.setHeader("Access-Control-Allow-Origin", "https://example.com")
    return { ok: true }
})
```

### File download

```ts
k.api.get("download", () => {
    const filePath = "exports/data.csv"
    k.response.file(filePath, "text/csv", "export.csv")
})
```

## Related Docs

- [k.request](../request/) - HTTP request handling
- [k.cookie](../cookie/) - Cookie Management
- [k.session](../session/) - session state
