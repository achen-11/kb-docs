# k.utils.CDN

> 当前站点 CDN 开关与缓存时间

## 概述

`k.utils.CDN` 控制**当前请求上下文**中 CDN 行为（属性名 **`CDN`**，大小写敏感）。

## disableCDN() / enableCDN()

关闭或启用 CDN。

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `disableCDN()` | 无 | `void` | 当前响应不使用 CDN |
| `enableCDN()` | 无 | `void` | 当前响应允许使用 CDN |

## setCacheTime()

设置 CDN 缓存分钟数。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `minutes` | `number` | 是 | CDN 缓存分钟数 |

**返回：** `void`。

```ts
k.utils.CDN.enableCDN()
k.utils.CDN.setCacheTime(60)
```

在需要绕过 CDN 的接口或预览页面中，可对当前响应关闭 CDN：

```ts
k.api.get("preview", () => {
    k.utils.CDN.disableCDN()
    return {
        now: k.utils.date.formate(k.utils.date.now),
        draft: k.request.queryString.get("id")
    }
})
```

## 相关文档

- [k.utils 概述](./index.md)
