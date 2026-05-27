# k.site.styles

> 站点样式（CSS）资源

## 概述

侧边栏中的「css」对应运行时 `k.site.styles`（`StyleRepository`）。

```ts
k.api.get("styles", () => {
    return k.site.styles.all().map((s) => s.name)
})
```

## 相关文档

- [k.site.scripts](./js.md)
- [k.site](./site.md)
