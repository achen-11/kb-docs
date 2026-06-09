# 邮箱：IMAP

> IMAP 页展示外部邮件客户端需要的 IMAP/SMTP 连接参数，并可为默认邮箱生成授权码。

## 如何打开

| 项目 | 说明 |
|------|------|
| 菜单路径 | 顶部 **邮箱** -> 左侧 **设置** -> **IMAP** |
| 深链 | `/_Admin/kmail-settings/imap-setting` |
| 前端路由 | `/kmail-settings/imap-setting` |
| 前置条件 | 已在 [邮箱地址](./addresses.md) 中设置默认地址 |

<DocImage src="/product/mail/imap-settings.png" alt="邮箱 IMAP 与 SMTP 客户端参数" width="1120" />

## 页面结构

页面分成左右两张配置卡片：

| 卡片 | 内容 |
|------|------|
| IMAP Setting | Server、Username、Port、SSL |
| SMTP Setting | Server、Username、Port、SSL |

`Username` 使用当前默认邮箱地址。若尚未设置默认地址，页面会显示“去设置”入口，点击后回到邮箱地址页。

## 生成授权码

有默认邮箱地址时，页面顶部显示 `Generate Authorization Code` 按钮。

1. 点击 `Generate Authorization Code`。
2. 弹窗展示新的 IMAP/SMTP 授权码。
3. 复制授权码，填入外部客户端的密码位置。
4. 妥善保存；界面提示仅最新授权码有效。

授权码等同于客户端登录密码，不要贴进文档、截图或工单正文。若泄露，重新生成新的授权码。

## 外部客户端填写方式

| 客户端字段 | 对应页面字段 |
|------------|--------------|
| IMAP Server | IMAP Setting -> Server |
| IMAP Username | IMAP Setting -> Username |
| IMAP Port | IMAP Setting -> Port |
| IMAP SSL | IMAP Setting -> SSL |
| SMTP Server | SMTP Setting -> Server |
| SMTP Username | SMTP Setting -> Username |
| SMTP Port | SMTP Setting -> Port |
| SMTP SSL | SMTP Setting -> SSL |
| Password | 生成的授权码 |

## 常见问题

| 现象 | 排查 |
|------|------|
| 看不到生成授权码按钮 | 先设置默认邮箱地址 |
| 客户端提示密码错误 | 重新生成授权码，并确认客户端使用最新授权码 |
| 客户端能收不能发 | 核对 SMTP Server、Port、SSL 与授权码 |
| 默认邮箱不对 | 回 [邮箱地址](./addresses.md) 修改默认地址 |

## 与 KScript 的关系

| IMAP 页面 | KScript API |
|-----------|-------------|
| 给外部客户端展示连接参数和授权码 | 站点脚本中如需收信、解析或发信，使用 [k.mail](/api/mail/) |
| 用户手工配置客户端 | 业务自动化读取邮件、发通知由 API 负责 |

## 相关

| 文档 | 说明 |
|------|------|
| [邮箱地址](./addresses.md) | 默认地址设置 |
| [SMTP](./smtp.md) | 自定义 SMTP 设置 |
| [k.mail](/api/mail/) | 邮件 API |
