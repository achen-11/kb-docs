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
| ✅ | `cms/content/contents-folders-list.md` | `/content/contents` |
| ✅ | `cms/content/contents-folder-settings.md` | 设置弹窗 + 关联数据 |
| ✅ | `cms/content/contents-entries.md` | 条目编辑 |
| ✅ | `cms/content/labels.md` | `/content/labels` |
| ✅ | `cms/content/html-blocks.md` | `/content/htmlblocks` |
| ✅ | `cms/content/files.md` | `/content/files`（编辑菜单） |
| 🟡 | `cms/content/tag-attributes.md` | `/content/text` · KConfig / `k-config` |

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

### 数据库（`docs/cms/database/`）

| 状态 | 文档 | Frontend 路由 |
|------|------|----------------|
| ✅ | `database/index.md` | 概述 |
| ✅ | `database/table.md` | `/database/table` |
| ⬜ | `database/table-relation.md` | `/database/table-relation` |
| ⬜ | `database/key-value.md` | `/database/key-value` |
| ⬜ | `database/sqlite-table.md` | `/database/sqlite-table` |
| ⬜ | `database/mysql-table.md` | `/database/mysql-table` |
| ⬜ | `database/sqlserver-table.md` | `/database/sqlserver-table` |
| ⬜ | `database/sql-logs.md` | `/database/sql-logs` |

子路由（无独立菜单）：`/database/table/columns`、`/data`、`/edit-data` — 写入对应表类型篇目。

运维 / 站点设置等仍按需从 `navigation.md` 拆文。
