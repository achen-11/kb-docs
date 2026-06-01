# CMS 文档 Backlog

> 菜单结构来源：`Kooboo/Frontend/src/router/site.ts` + `locales/zh.yml`

## P0 — 入门与导航

| 状态 | 文档 | 说明 |
|------|------|------|
| ✅ | `cms/index.md` | 概述、学习路径 |
| ✅ | `cms/navigation.md` | 全站菜单与深链 |
| ✅ | `cms/getting-started/login-and-site-list.md` | 登录、站点列表、文件夹、进入管理 |
| ✅ | `cms/getting-started/create-site.md` | 空白 / 导入 / 克隆（不含 AI） |

## P1 — 站点顶栏（菜单自上而下）

| 状态 | 文档 | Frontend 路由 |
|------|------|----------------|
| ✅ | `cms/site/dashboard.md` | `/site` |
| ✅ | `cms/site/media.md` | `/site/media` |
| ✅ | `cms/site/pages.md` | `/site/pages` 列表 |
| ✅ | `cms/site/pages-setting.md` | `page/setting` |
| ✅ | `cms/site/pages-edit-code.md` | `page/edit` |
| ✅ | `cms/site/pages-inline-edit.md` | `inline-design` |

## P1 — 内容与数据（对齐 k.content）

| 状态 | 文档 | Frontend 路由 |
|------|------|----------------|
| ✅ | `cms/content/index.md` | 内容分组概述 |
| ✅ | `cms/content/content-types.md` | `/content/contentTypes` + 字段编辑器配图 |
| ✅ | `cms/content/contents.md` | `/content/contents` |
| ⬜ | `cms/content/data-types.md` | 重定向 stub，保留旧链接 |
| ⬜ | `cms/content/labels.md` | `/content/labels` |
| ⬜ | `cms/content/html-blocks.md` | `/content/htmlblocks` |

## P1 — 页面与开发资源（对齐 templateEngine）

| 状态 | 文档 | Frontend 路由 |
|------|------|----------------|
| ⬜ | `cms/development/layouts.md` | `/development/layouts` |
| ⬜ | `cms/development/views.md` | `/development/views` |
| ⬜ | `cms/development/scripts-styles.md` | `/development/scripts`, `styles` |
| ⬜ | `cms/development/code.md` | `/development/code` |

## P2 — 电商与支付

| 状态 | 文档 | Frontend 路由 |
|------|------|----------------|
| ⬜ | `cms/commerce/overview.md` | `/commerce/settings` |
| ⬜ | `cms/commerce/products.md` | `/commerce/product-management` |
| ⬜ | `cms/settings/integrations-payment.md` | `/system/config` |

## P2 — 站点设置

| 状态 | 文档 | Frontend 路由 |
|------|------|----------------|
| ⬜ | `cms/settings/basic.md` | `/system/settings` |
| ⬜ | `cms/settings/domains.md` | `/system/domains` |
| ⬜ | `cms/settings/multilingual.md` | `/system/settings`（Multilingual 分组） |
| ⬜ | `cms/settings/integrations.md` | `/system/config` |

## P3 — 数据库 / 运维 / 高级

按需从 `navigation.md` 拆文。
