# k.site.views

> 可复用的视图（View）片段

## 概述

View 用于在页面或布局中引用的 HTML 片段。通过 `k.site.views` 管理。

```ts
k.api.get("views", () => {
    return k.site.views.all().map((v) => v.name)
})
```

## 相关文档

- [k.site](./site.md)
- [k.site.layouts](./layout.md)
