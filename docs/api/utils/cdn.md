# k.utils.CDN

> 当前站点 CDN 开关与缓存时间

## 概述

`k.utils.CDN` 控制**当前请求上下文**中 CDN 行为（属性名 **`CDN`**，大小写敏感）。

## disableCDN() / enableCDN()

关闭或启用 CDN。

## setCacheTime()

设置 CDN 缓存分钟数。

```ts
k.utils.CDN.enableCDN()
k.utils.CDN.setCacheTime(60)
```

## 相关文档

- [k.utils 概述](./index.md)
