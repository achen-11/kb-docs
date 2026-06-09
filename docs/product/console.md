# 控制台

> 控制台是 Kooboo 的账户与组织级工作台。先在这里处理域名、组织、数据中心、AI Provider、会员与账务，再回到具体站点继续做 CMS 配置。

## 如何打开

| 项目 | 说明 |
|------|------|
| 顶部入口 | 点击顶部导航右侧的 **控制台** 图标 |
| 常用深链 | `/_Admin/kconsole` |
| 兼容旧路径 | `/_Admin/Console` |
| 前端路由 | `/kconsole` |
| 页面层级 | 账户 / 组织级页面，通常不带 `SiteId` |

控制台不是某个站点内部菜单。它更适合处理“域名属于哪个组织、谁能管理组织、余额够不够、AI Key 配好了没有”这类共用事项。

<DocImage src="/product/console/console-overview.png" alt="控制台概述：域名列表与左侧控制台菜单" width="1120" />

::: tip 菜单可见性

| 身份 | 左侧可见菜单 |
|------|--------------|
| 所有组织成员 | 域名、组织 |
| 仅组织管理员 | 数据中心、Google SC、会员、AI 配置、订单、余额、续费 |

当前前端路由里仍保留 `bandwidth`、`cdn`、`resourceCDN`、`topupBandwidth` 等子页，但默认左侧菜单没有直接显示它们；是否可用，以你的环境入口为准。

:::

## 子菜单

| 菜单 | 深链 | 文档 | 主要用途 |
|------|------|------|----------|
| 域名 | `/_Admin/kconsole` | [域名](./console/domains.md) | 添加域名、购买域名、绑定站点、DNS、续费、转移码 |
| 组织 | `/_Admin/kconsole/organization` | [组织](./console/organization.md) | 成员、部门、组织切换、组织创建 |
| 数据中心 | `/_Admin/kconsole/serviceDataCenter` | [数据中心](./console/data-centers.md) | 启用/禁用数据中心、设置默认数据中心、跳转数据中心 |
| Google SC | `/_Admin/kconsole/searchConsole` | [Google SC](./console/google-search-console.md) | Search Console 授权、站点验证、Analytics、Sitemap |
| 会员 | `/_Admin/kconsole/member` | [会员](./console/membership.md) | 查看当前计划、购买或续费会员 |
| AI 配置 | `/_Admin/kconsole/consoleAIConfig` | [AI 配置](./console/ai-config.md) | 配置组织级 AI Provider API Key |
| 订单 | `/_Admin/kconsole/consoleOrder` | [订单](./console/orders.md) | 查看订单、继续支付未支付订单 |
| 余额 | `/_Admin/kconsole/balance` | [余额](./console/balance.md) | 查看当前余额、充值、核对收支记录 |
| 续费 | `/_Admin/kconsole/renew` | [续费](./console/renewals.md) | 统一查看域名和会员续费项 |

## 无左侧菜单的子页

| 子页 | 深链 | 从哪里进入 | 写入文档 |
|------|------|------------|----------|
| 域名绑定 | `/_Admin/kconsole/DomainBinding?id={domainId}` | 域名列表点击域名名称 | [域名](./console/domains.md#绑定站点) |
| DNS 记录 | `/_Admin/kconsole/domainDNS?domainName=example.com` | 域名列表点击 DNS 设置动作 | [域名](./console/domains.md#dns-记录) |
| 域名购买 | `/_Admin/kconsole/domainSearch` | 域名页点击 `域名购买` | [域名](./console/domains.md#购买域名) |
| 部门 | `/_Admin/kconsole/departments` | 组织页点击 `部门` | [组织](./console/organization.md#部门) |
| 结账页 | `/_Admin/kconsole/checkOrder?orderId={orderId}` | 购买、充值、续费、订单支付流程 | [订单](./console/orders.md#结账页) |

## 建议配置顺序

| 场景 | 建议顺序 |
|------|----------|
| 新组织开始接入 Kooboo | [组织](./console/organization.md) -> [余额](./console/balance.md) -> [域名](./console/domains.md) |
| 购买并绑定域名到站点 | [域名](./console/domains.md#购买域名) -> [域名绑定](./console/domains.md#绑定站点) -> [CMS：域名管理](/cms/settings/domains.md) |
| 配置 Google Search Console | [Google SC](./console/google-search-console.md) -> 完成身份验证 -> 验证站点 -> Analytics / Sitemap |
| 给站点接入 AI | [余额](./console/balance.md) -> [AI 配置](./console/ai-config.md) -> [CMS：AI 服务](/cms/settings/ai-service.md) |
| 处理未支付或即将到期项目 | [订单](./console/orders.md) -> [结账页](./console/orders.md#结账页) -> [续费](./console/renewals.md) |

## 与站点后台的分工

| 控制台做 | 站点后台做 |
|----------|------------|
| 管理账户下的域名、DNS、域名购买、域名续费 | 给某个站点绑定域名、设置主域名、配置 SSL |
| 管理组织成员、组织切换、部门 | 管理某个站点的用户、角色、站点权限 |
| 管理组织级 AI Provider API Key | 管理某个站点的 AI 服务、MCP、AI 函数 |
| 查看余额、订单、会员、续费 | 配置站点内容、页面、Hook、Cookie、服务集成 |

站点级配置请回到 [后台 CMS](/cms/)；KScript 签名与脚本示例请看 [API 文档](/api/) 与 [模板引擎](/templateEngine/)。

## 相关

| 文档 | 说明 |
|------|------|
| [充值与账单](./billing.md) | 余额、充值、订单、续费的账务总览 |
| [CMS：域名管理](/cms/settings/domains.md) | 某个站点的域名绑定与访问入口 |
| [CMS：AI 服务](/cms/settings/ai-service.md) | 站点级 AI 服务、MCP、AI 函数 |
| [CMS：站点用户](/cms/settings/site-users.md) | 站点内部账号 |
| [CMS：角色权限](/cms/settings/roles.md) | 站点内部 feature 权限 |
