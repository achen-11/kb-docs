# k.site.layouts

> 站点布局（Layout）资源管理

## 概述

布局定义页面的公共框架与 placeholder。通过 `k.site.layouts` 进行增删改查。

```ts
k.api.get("layouts", () => {
    return k.site.layouts.all().map((l) => ({ name: l.name, id: l.id }))
})
```

完整 API 以源码 `LayoutRepository` 与 `kooboo.d.ts` 为准，文档与 ai-check 验证进行中。

## 相关文档

- [k.site.pages](./page.md)
- [k.site.views](./view.md)
