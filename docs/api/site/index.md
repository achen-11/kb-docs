# k.site

> 当前站点的版本化数据库访问入口（页面、布局、脚本、样式等资源）

## 概述

`k.site` 是 Kooboo **当前站点**内容的统一入口。通过 `pages`、`layouts`、`views`、`scripts`、`styles`、`menus` 等子 API 进行 CRUD，并支持创建站点、导入导出等管理操作。

::: warning 与 k.file、CMS 文件库的区别
- **k.site**：站点结构化资源（页面、布局、View、Script 等），带版本与路由。
- **k.file**：站点磁盘目录上的文件 KScript 读写，**无**后台专用管理页，见 [k.file](../file/file.md)。
- **内容 → 文件**（CmsFile）：后台 [CMS 文件库](/cms/content/files)，有 URL、**无**对应 `k.site.files` / `k.file` 路径，见 [后台：文件](/cms/content/files)。
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
| `k.site.menus` | [menu.md](./menu.md) — 前台导航菜单 |

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

- [模板引擎：Layout / Page / View](/templateEngine/) — HTML 侧如何引用布局与视图
- [k.page](../page/) — 当前渲染页的元数据（`k.page.setTitle` 等）
- [k.module](../module/) — 脚本模块上下文
- [k.label](../label/) — 多语言 `k.t` / `k.label`
- [后台：文件](/cms/content/files) — CMS 文件库（非 `k.file`）
