# k.utils.uri

> URL 解析与查询字符串

## 概述

`k.utils.uri` 提供 `parse` 及查询参数读写；`parse` 返回 `KUriBuilder` 实例。

## parse()

```ts
const builder = k.utils.uri.parse("https://example.com/path?q=1")
builder.setQueryParam("page", "2")
const url = builder.toUri()
```

## 便捷方法

| 方法 | 说明 |
|------|------|
| `setQueryParam(uri, name, value)` | 设置查询参数并返回新 URL 字符串 |
| `getQueryParam(uri, name)` | 读取查询参数 |

## KUriBuilder

| 成员 | 说明 |
|------|------|
| `scheme` / `host` / `port` / `path` / `query` | URI 组成部分 |
| `userName` / `password` | 凭据 |
| `setQueryParam(name, value)` | 修改查询串 |
| `getQueryParam(name)` | 读取查询参数 |
| `toUri()` | 输出完整 URL 字符串 |

## 相关文档

- [k.utils 概述](./index.md)
