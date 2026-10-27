# 邮箱：SMTP

> SMTP 页用于在支持的环境中配置自定义 SMTP 服务器。它主要面向自托管、本地或非在线服务环境的组织管理员。

## 如何打开

| 项目 | 说明 |
|------|------|
| 菜单路径 | 顶部 **邮箱** -> 左侧 **设置** -> **SMTP** |
| 深链 | `/_Admin/kmail-settings/smtp-setting` |
| 前端路由 | `/kmail-settings/smtp-setting` |
| 可见条件 | 组织管理员，且当前环境不是在线服务环境 |

<DocImage src="/product/mail/smtp-settings.png" alt="邮箱 SMTP 设置（密码已打码）" width="1120" />

## 表单字段

| 字段 | 填什么 |
|------|--------|
| Server | SMTP 服务器域名或 IP |
| Port | SMTP 端口，常见为 `587`、`465` 或服务商指定端口 |
| Username | SMTP 登录用户名 |
| Password | SMTP 登录密码或授权码 |

点击 `Save` 后保存当前配置，并重新加载页面数据。

## 校验规则

| 字段 | 规则 |
|------|------|
| Server | 必填，需符合 URL 或 IP 格式 |
| Port | 必填，必须是合法整数端口 |
| Username | 必填 |
| Password | 必填，长度 2 到 30 个字符 |

密码字段为敏感信息。截图、工单和文档中都应打码。

## 什么时候配置

| 场景 | 建议 |
|------|------|
| 使用 Kooboo 在线邮件能力 | 通常不需要配置此页，且在线服务环境可能不显示入口 |
| 自托管 Kooboo | 按组织邮件策略配置内部或第三方 SMTP |
| 外部 SMTP 账号轮换 | 更新 Password 后保存，并发送测试邮件 |
| 发信失败 | 先核对 Server、Port、Username、Password，再检查网络和服务商限制 |

## 与 IMAP 页的区别

| SMTP 设置页 | IMAP 页 |
|-------------|---------|
| 配置组织使用的自定义 SMTP 服务器 | 展示邮箱客户端连接 Kooboo 邮箱所需的 IMAP/SMTP 参数 |
| 管理后台发信通道 | 生成外部客户端授权码 |
| 仅特定环境可见 | 默认设置菜单可见 |

## 相关

| 文档 | 说明 |
|------|------|
| [IMAP](./imap.md) | 客户端连接参数与授权码 |
| [邮箱地址](./addresses.md) | 默认发件地址 |
| [k.mail](/api/mail/) | 服务端发信 API |
