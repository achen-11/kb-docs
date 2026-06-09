# 邮箱

> Kooboo 邮箱是账户级邮件工作台：日常收发邮件、维护邮箱地址和联系人、配置 IMAP/SMTP、查看 DMARC 报告，并为邮件扩展模块提供入口。

## 如何打开

| 项目 | 说明 |
|------|------|
| 顶部入口 | 点击顶部导航左侧的 **邮箱** 按钮 |
| 邮箱深链 | `/_Admin/kmail/inbox` |
| 设置深链 | `/_Admin/kmail-settings/addresses` |
| 前端路由 | `/kmail`、`/kmail-settings`、`/mail-module-editor` |
| 页面层级 | 账户 / 组织级页面，通常不带 `SiteId` |

邮箱不是某个站点后台菜单。它更适合处理“哪些邮箱地址能收发信、谁是默认发件地址、如何给外部客户端生成授权码、邮件模块是否启用”这类账户级事项。若新增邮箱地址时看不到域名或页面提示邮箱不可用，先到 [控制台：域名](./console/domains.md) 确认域名已经接入 Kooboo DNS。

<DocImage src="/product/mail/mail-overview.png" alt="邮箱概述：收件箱、地址分组与邮件列表" width="1120" />

::: tip 菜单可见性

| 身份 / 环境 | 可见入口 |
|-------------|----------|
| 组织成员 | 收件箱、已发送、草稿、垃圾邮件、已删除、邮箱地址、联系人、安全报告、IMAP |
| 组织管理员 | 额外可见邮件扩展模块、Inbox Logo |
| 组织管理员且非在线服务环境 | 额外可见 SMTP 设置 |

前端路由中保留了 `/_Admin/kmail-settings/migration` 邮件迁移页，但当前左侧菜单默认注释隐藏。是否开放，以实际环境入口为准。

:::

## 邮箱主界面

| 菜单 / 入口 | 深链 | 文档 | 主要用途 |
|-----------|------|------|----------|
| 收件箱 | `/_Admin/kmail/inbox` | [邮件列表](./mail/messages.md) | 查看收件、按地址筛选、标记已读、移动或删除邮件 |
| 已发送 | `/_Admin/kmail/sent` | [邮件列表](./mail/messages.md) | 查看发出的邮件和投递状态 |
| 草稿 | `/_Admin/kmail/draft` | [邮件列表](./mail/messages.md) | 继续编辑自动保存或手动保存的草稿 |
| 垃圾邮件 | `/_Admin/kmail/spam` | [邮件列表](./mail/messages.md) | 查看 Spam，并可将邮件标记为非垃圾邮件 |
| 已删除 | `/_Admin/kmail/trash` | [邮件列表](./mail/messages.md) | 恢复邮件或永久删除邮件 |
| 文件夹 | `/_Admin/kmail/folder` | [邮件列表](./mail/messages.md#文件夹) | 使用自定义文件夹归档邮件 |
| 搜索结果 | `/_Admin/kmail/searchEmail` | [邮件列表](./mail/messages.md#搜索邮件) | 从右上搜索框进入，按关键字查找邮件 |
| 日历 | `/_Admin/kmail/calendar` | [日历](./mail/calendar.md) | 创建日程、邀请参与人、处理邮件会议邀请 |
| 写邮件 | `/_Admin/kmail/compose` | [撰写邮件](./mail/compose.md) | 新建邮件、回复、全部回复、转发、再次编辑 |

邮箱页面进入后会清除顶部邮箱红点，并每 5 分钟检查新邮件。若你正在收件箱，列表会尝试刷新并显示新邮件提示；若你在其它邮箱页，只显示新邮件提示。

## 邮箱设置

| 设置页 | 深链 | 文档 | 主要用途 |
|--------|------|------|----------|
| 邮箱地址 | `/_Admin/kmail-settings/addresses` | [邮箱地址](./mail/addresses.md) | 新建普通、通配、群组、转发地址，设置默认地址和签名 |
| 联系人 | `/_Admin/kmail-settings/contacts` | [联系人](./mail/contacts.md) | 维护常用联系人 |
| 安全报告 | `/_Admin/kmail-settings/security-report` | [安全报告](./mail/security-report.md) | 查看 DMARC 报告 |
| IMAP | `/_Admin/kmail-settings/imap-setting` | [IMAP](./mail/imap.md) | 查看 IMAP/SMTP 客户端参数，生成授权码 |
| 邮件扩展模块 | `/_Admin/kmail-settings/mail-module` | [邮件扩展模块](./mail/modules.md) | 创建、导入、安装、启停邮件模块，进入模块编辑器 |
| Inbox Logo | `/_Admin/kmail-settings/inbox-logo` | [Inbox Logo](./mail/inbox-logo.md) | 配置 BIMI Logo 与 VMC URL |
| SMTP | `/_Admin/kmail-settings/smtp-setting` | [SMTP](./mail/smtp.md) | 在支持环境中配置自定义 SMTP |

## 建议配置顺序

| 场景 | 顺序 |
|------|------|
| 首次启用邮箱 | [控制台：域名](./console/domains.md) -> [邮箱地址](./mail/addresses.md) -> 设置默认地址 -> [IMAP](./mail/imap.md) |
| 让站点发送业务通知 | [邮箱地址](./mail/addresses.md) -> 设置默认发件地址 -> [k.mail](/api/mail/) -> 业务 API 或定时任务 |
| 日常处理邮件 | [邮件列表](./mail/messages.md) -> 搜索 / 文件夹 -> [撰写邮件](./mail/compose.md) |
| 接入外部客户端 | [邮箱地址](./mail/addresses.md) -> 设置默认地址 -> [IMAP](./mail/imap.md) -> 生成授权码 |
| 扩展邮件工作流 | [邮件扩展模块](./mail/modules.md) -> 模块编辑器 -> 启用模块 -> 测试收发 |
| 安排邮件会议 | [邮箱地址](./mail/addresses.md) -> 设置默认地址 -> [日历](./mail/calendar.md) -> 新建日程 |

## 与站点后台和 KScript 的分工

| 邮箱后台做 | 站点后台 / KScript 做 |
|------------|----------------------|
| 配置邮箱地址、默认发件地址、签名、IMAP 授权码 | 在站点 API、Job、Hook 中使用 [k.mail](/api/mail/) 发信或收信 |
| 管理邮件列表、文件夹、联系人和 DMARC 报告 | 在业务流程中决定什么时候发邮件、发给谁、记录什么日志 |
| 管理邮件扩展模块和模块文件 | 模块内部脚本细节参考 [k.mail](/api/mail/) 与 [模块 API](/api/module/) |
| 配置账户级 SMTP 或 Inbox Logo | 站点后台继续配置内容、页面、服务集成、AI 服务等站点级能力 |

产品文档只说明后台入口、表单和保存方式；KScript 函数签名与脚本示例请看 [API 文档](/api/)。

## 相关

| 文档 | 说明 |
|------|------|
| [k.mail](/api/mail/) | KScript 邮件 API |
| [邮件与短信通知](/guide/integrations/email-sms-notifications.md) | 业务通知最佳实践 |
| [控制台](./console.md) | 域名、余额与组织 |
| [CMS：服务集成](/cms/settings/integrations/) | 站点级第三方服务配置 |
