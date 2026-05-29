# k.site

> 当前站点的版本化数据库访问入口（页面、布局、脚本、样式等资源）

## 概述

`k.site` 是 Kooboo **当前站点**内容的统一入口。通过 `pages`、`layouts`、`views`、`scripts`、`styles` 等子 API 进行 CRUD，并支持创建站点、导入导出等管理操作。

::: warning 与 k.file 的区别
- **k.site**：站点结构化资源（页面、布局、代码块等），带版本与路由。
- **k.file**：站点目录下的任意文本/二进制文件，见 [k.file](../file/file.md)。
:::

## 子模块导航

| 成员 | 文档 |
|------|------|
| `k.site.pages` | [page.md](./page.md) |
| `k.site.layouts` | [layout.md](./layout.md) |
| `k.site.views` | [view.md](./view.md) |
| `k.site.scripts` | [js.md](./js.md) |
| `k.site.styles` | [css.md](./css.md) |
| `k.site.codes` | [code.md](./code.md) — API 与 CodeBlock（`codeType`） |
| `k.site.files` | 站点文件仓库（与 k.file 配合说明待补充） |

## 常用方法（节选）

### List()

列出当前用户可访问的站点摘要（多站点场景）。

### createSite() / Get()

创建或按名称获取站点数据库实例（多站点管理场景；日常业务通常直接使用当前站点的 `k.site`）。

### diskSpace

查询站点占用空间，例如 `k.site.diskSpace.getSiteSize()`。

```ts
k.api.get("siteSize", () => {
    return k.site.diskSpace.getSiteSize()
})
```

## 相关文档

- [k.page](./k-page.md) — 当前渲染页的元数据（`k.page.setTitle` 等）
- [k.module](./module.md) — 脚本模块上下文
- [k.label](./label.md) — 多语言 `k.t` / `k.label`
