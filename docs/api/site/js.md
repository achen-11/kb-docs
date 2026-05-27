# k.site.scripts

> 站点 JavaScript 资源

## 概述

侧边栏中的「js」对应 API **`k.site.scripts`**，用于管理站点 JavaScript 资源。

```ts
k.api.get("scripts", () => {
    return k.site.scripts.all().map((s) => s.name)
})
```

## 相关文档

- [k.site.styles](./css.md)
- [k.site.codes](./site.md) — 代码块与脚本的区别见站点开发文档（待补充）
