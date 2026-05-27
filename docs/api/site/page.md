# k.site.pages

> 站点页面的增删改查与路由

## 概述

通过 `k.site.pages` 管理 Kooboo 页面资源（名称、URL、body、关联布局等）。

::: info
当前页渲染时的标题与 Meta 使用全局 [k.page](./page-meta.md)（`k.page.setTitle` 等），不要与 `k.site.pages` 仓库混淆。
:::

## add()

创建页面。

| 字段 | 类型 | 说明 |
|------|------|------|
| name | `string` | 页面名称 |
| url | `string` | 路由路径 |
| body | `string` | 页面 HTML/布局占位内容 |
| layoutName | `string` | 可选，布局名称 |

```ts
k.api.post("addPage", () => {
    k.site.pages.add({
        name: "test-page",
        url: "/test-page",
        body: `<layout id="main">
            <placeholder id="Main"><h1>测试</h1></placeholder>
        </layout>`,
        layoutName: "main"
    })
    const page = k.site.pages.getByUrl("/test-page")
    return { id: page?.id, name: page?.name }
})
```

## 更多方法

`get`、`getByUrl`、`update`、`delete` 等方法与 Kooboo 页面模型一致，完整列表以 `old-source/kooboo.d.ts` 与源码 `PageRepository` 为准。本文档将随 ai-check 验证逐步补全。

## 相关文档

- [k.site](./site.md)
- [k.site.layouts](./layout.md)
