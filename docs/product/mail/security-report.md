# 邮箱：安全报告

> 安全报告页展示 DMARC 报告，用于观察哪些来源代表你的域名发送邮件，以及这些邮件是否通过验证。

## 如何打开

| 项目 | 说明 |
|------|------|
| 菜单路径 | 顶部 **邮箱** -> 左侧 **设置** -> **安全报告** |
| 深链 | `/_Admin/kmail-settings/security-report` |
| 前端路由 | `/kmail-settings/security-report` |

<DocImage src="/product/mail/security-report-overview.png" alt="邮箱安全报告：DMARC 报告列表" width="1120" />

## 报告列表

| 列 | 说明 |
|----|------|
| Report Domain | 发送 DMARC 报告的域名 |
| Our Domain | 被报告的你的域名 |
| Date | 报告开始日期 |
| Mail Count | 报告覆盖的邮件数量 |
| Status | 通过或拒绝 |
| From IP | 发送来源 IP |
| Mail From | 邮件 Envelope From |

列表来自 `mailreport/DmarcList`。如果列表为空，通常表示当前账号还没有收到可展示的 DMARC 聚合报告，或域名的 DMARC 配置尚未产生报告。

## 怎么看

| 现象 | 建议检查 |
|------|----------|
| 来源 IP 不认识 | 核对是否有第三方系统在代发邮件 |
| 状态为 Reject | 检查 SPF、DKIM、DMARC 对齐 |
| 邮件数量突然增加 | 检查是否有异常发送或营销活动 |
| 没有报告 | 确认域名 DNS 中是否配置 DMARC 报告地址 |

安全报告只负责展示结果。DNS 记录维护请到 [控制台：域名](../console/domains.md#dns-记录)，业务发信请结合 [k.mail](/api/mail/) 排查。

## 相关

| 文档 | 说明 |
|------|------|
| [控制台：域名 DNS](../console/domains.md#dns-记录) | 查看和添加 DNS 记录 |
| [SMTP](./smtp.md) | 自定义 SMTP 发送通道 |
| [k.mail](/api/mail/) | 服务端发信能力 |
