# 产品功能

> Kooboo 站点后台之外的常用产品入口：控制台、邮箱、市场、开发者模式与 AI。

## 功能地图

| 功能 | 入口 | 适合谁 |
|------|------|--------|
| [控制台](./console.md) | 顶部 **控制台** 图标，`/_Admin/kconsole` | 组织管理员、运维、账务人员 |
| [邮箱](./mail.md) | 顶部 **邮箱** 按钮，`/_Admin/kmail` | 站点运营、客服、实施人员 |
| [市场](./market.md) | 顶部 **市场** 图标，`/_Admin/templates` | 新站点创建者、模板维护者 |
| [开发者模式](./developer-mode.md) | 站点后台顶部 **开发者模式** 图标 | 前端/模板开发者 |
| [AI Claw / AI Chat](./ai-chat.md) | 站点后台顶部 **AI** 按钮 | 站点管理员、实施人员、开发者 |
| [AI 悬浮助手](./ai-floating-assistant.md) | 站点后台右下角浮窗 | 正在操作后台的用户 |

## 账户级与站点级

| 层级 | 典型功能 | URL 特征 |
|------|----------|----------|
| 账户级 | 控制台、邮箱、市场、组织、余额、订单、续费 | 不一定带 `SiteId` |
| 站点级 | 开发者模式、AI Claw、AI 悬浮助手、站点 AI 服务 | 通常带 `SiteId={站点GUID}` |

如果你要配置某个站点的页面、内容、集成、Cookie 或 AI 服务，请回到 [后台 CMS](/cms/)。如果你要写 KScript 或模板，请看 [API 详情](/api/) 与 [模板引擎](/templateEngine/)。

## 推荐阅读顺序

| 目标 | 阅读 |
|------|------|
| 准备账户、域名、余额与组织 | [控制台](./console.md) -> [组织](./console/organization.md) -> [余额](./console/balance.md) -> [域名](./console/domains.md) |
| 准备站点与模板 | [市场](./market.md) -> [快速开始](/quick-start/) |
| 日常开发站点资源 | [开发者模式](./developer-mode.md) -> [模板引擎](/templateEngine/) |
| 配置邮件通知或收发邮件 | [邮箱](./mail.md) -> [k.mail](/api/mail/) |
| 使用 AI 辅助建站或管理 | [AI 配置](./console/ai-config.md) -> [AI Claw / AI Chat](./ai-chat.md) -> [AI 悬浮助手](./ai-floating-assistant.md) -> [AI 服务](/cms/settings/ai-service.md) |
