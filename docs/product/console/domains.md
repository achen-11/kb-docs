# 控制台：域名

> 管理账户下的域名资产：添加已有域名、购买新域名、绑定站点、维护 DNS、续费、转移码与数据中心。

## 如何打开

| 项目 | 说明 |
|------|------|
| 菜单路径 | 顶部 **控制台** -> 左侧 **域名** |
| 深链 | `/_Admin/kconsole` |
| 前端路由 | `/kconsole` |
| 可见身份 | 所有组织成员可见；购买、续费、DNS、数据中心等动作通常需要组织管理员 |

域名页管理的是“账户拥有的域名”。如果你要把域名设为某个站点的访问入口，还需要在站点后台继续配置 [CMS：域名管理](/cms/settings/domains.md)。

<DocImage src="/product/console/domains-overview.png" alt="控制台域名列表" width="1120" />

## 域名列表

页面顶部工具栏：

| 按钮 | 说明 |
|------|------|
| `新建` | 添加已有域名到当前账户 |
| `域名购买` | 组织管理员可见，进入域名搜索与购买页 |

列表重点：

| 列 | 说明 |
|----|------|
| 域名 | 点击域名名称进入 **域名绑定** 子页 |
| 数据中心 | 在线服务环境显示；管理员可点击后更换域名数据中心 |
| 到期时间 | 域名到期日期 |
| Record | DNS 记录数量 |
| Site | 绑定站点数量 |
| Action | 在线服务环境显示，含续费、转移码、DNS 设置等动作 |

## 添加已有域名

点击 `新建` 后会打开 **New Local Domain** 弹窗。

| 区域 | 说明 |
|------|------|
| DNS 提示 | 在线服务环境会提示可用 DNS Server，以及可用于通配域名的 CNAME |
| `Domain` | 填入要接入账户的根域名，例如 `example.com` |
| `Create` | 保存后返回域名列表 |

添加后先观察列表里的 `Record`、`Site` 和到期时间，再决定是否进入 DNS 或绑定页。

## 绑定站点

从域名列表点击域名名称，会进入：

```text
/_Admin/kconsole/DomainBinding?id={domainId}
```

<DocImage src="/product/console/domains-binding.png" alt="控制台域名绑定列表" width="1120" />

绑定页顶部有 `新建` 按钮，列表显示：

| 列 | 说明 |
|----|------|
| Domain | 完整绑定域名，例如 `www.example.com` |
| Site | 已绑定站点名称；点击会打开 `/_Admin/site?SiteId={siteId}` |
| Preview | 用当前域名预览站点 |

新建绑定弹窗需要填写：

| 字段 | 填什么 |
|------|--------|
| `Domain` | 子域名前缀，例如 `www`；右侧会自动拼接当前根域名 |
| `Site` | 从当前账户的站点列表中选择要绑定的站点 |

保存后，建议回到 [CMS：域名管理](/cms/settings/domains.md) 检查站点侧域名、主域名和 SSL 状态。

## DNS 记录

从域名列表的 DNS 设置动作进入：

```text
/_Admin/kconsole/domainDNS?domainName=example.com
```

<DocImage src="/product/console/domains-dns.png" alt="控制台 DNS 记录列表" width="1120" />

DNS 记录页顶部有 `添加` 按钮，表格显示：

| 列 | 说明 |
|----|------|
| Host | 主机记录 |
| Record Type | 记录类型 |
| Record Value | 记录值 |
| TTL | 缓存时间 |

添加记录弹窗：

| 字段 | 说明 |
|------|------|
| `Host Record` | 主机记录，右侧会拼接当前域名 |
| `Record Type` | 从后端返回的 DNS 类型列表中选择 |
| `Record Value` | 目标值，例如 IP、CNAME、TXT 内容等 |
| `Priority` | 仅 `MX` 类型显示 |
| `TTL` | 从预设 TTL 列表中选择 |

页面底部有返回按钮，保存或删除记录后列表会刷新。

## 购买域名

组织管理员点击 `域名购买` 进入：

```text
/_Admin/kconsole/domainSearch
```

<DocImage src="/product/console/domains-search.png" alt="控制台域名购买搜索页" width="1120" />

搜索区包含：

| 控件 | 说明 |
|------|------|
| 搜索框 | 输入域名前缀，例如 `kooboo`；也可以输入带后缀的域名 |
| 后缀复选框 | 默认选中 `.com`、`.net`、`.site`、`.dev`，可追加其它后缀 |
| `Search` | 搜索可注册状态与价格 |

结果列表显示域名、价格、状态与 `Immediately Get` 操作。可注册域名点击后会打开创建订单弹窗：

| 字段 | 说明 |
|------|------|
| Domain | 当前选择的域名，只读 |
| Period | 年限，1 到 10 年 |
| Amount | 按价格和年限计算出的总额 |
| Contact Information | 可选择自动使用 Kooboo 信息，或自定义姓名、电话、邮箱、地址 |

确认后会生成订单并跳转到 [订单结账页](./orders.md#结账页)。

## 续费、转移码与数据中心

| 操作 | 从哪里点 | 后续页面 |
|------|----------|----------|
| 续费 | 域名列表 Action 列的 `Renew` | 选择续费年限后进入 [结账页](./orders.md#结账页) |
| 转移码 | 域名列表 Action 列的转移图标 | 弹窗展示 transfer code |
| 更换数据中心 | 点击数据中心列 | 选择目标数据中心，确认后保存 |

域名续费弹窗的年限范围是 1 到 10 年。保存后会创建域名续费订单，而不是直接扣费。

## 常见工作流

| 场景 | 顺序 |
|------|------|
| 接入已有域名 | 新建 -> 按提示配置 DNS Server 或 CNAME -> 域名绑定 -> 回 CMS 域名管理核对 |
| 购买新域名并建站 | 域名购买 -> 创建订单 -> 结账 -> 域名绑定 -> 回 CMS 配置主域名 |
| 给域名补 DNS 记录 | 域名列表 -> DNS 设置 -> 添加记录 -> 回外部工具验证解析 |
| 域名即将到期 | 域名列表 -> 续费 -> 结账页付款 -> 续费页复核 |

## 与站点后台的分工

| 控制台域名 | CMS 域名管理 |
|------------|--------------|
| 账户级域名资产、DNS、购买、续费、转移码、数据中心 | 某个站点的域名绑定、Base URL、主域名、SSL |
| 深链 `/_Admin/kconsole` | 深链 `/_Admin/system/domains?SiteId={GUID}` |

## 相关

| 文档 | 说明 |
|------|------|
| [控制台概述](../console.md) | 控制台菜单地图 |
| [订单](./orders.md) | 域名购买、续费后的支付页 |
| [续费](./renewals.md) | 查看域名续费项 |
| [CMS：域名管理](/cms/settings/domains.md) | 站点级域名配置 |
