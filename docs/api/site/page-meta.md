# k.page

> 当前 HTTP 请求所渲染页面的元数据（标题、Meta 标签等）

## 概述

`k.page` 作用于**当前正在输出的页面**，不用于管理站点内的页面列表。页面 CRUD 请使用 [k.site.pages](./page.md)。

## setTitle()

```ts
k.page.setTitle("首页 - 我的站点")
```

## setNameMeta() / setPropertyMeta() / setHttpEquivMeta()

```ts
k.page.setNameMeta("description", "站点描述")
k.page.setPropertyMeta("og:title", "分享标题")
k.page.setHttpEquivMeta("refresh", "30;url=/next")
```

## 相关文档

- [k.site.pages](./page.md)
