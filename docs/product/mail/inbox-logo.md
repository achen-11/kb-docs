# 邮箱：Inbox Logo

> Inbox Logo 页用于维护 BIMI Logo 与 VMC URL，让支持的邮箱客户端在品牌识别场景中展示收件箱标识。

## 如何打开

| 项目 | 说明 |
|------|------|
| 菜单路径 | 顶部 **邮箱** -> 左侧 **设置** -> **Inbox Logo** |
| 深链 | `/_Admin/kmail-settings/inbox-logo` |
| 前端路由 | `/kmail-settings/inbox-logo` |
| 可见身份 | 组织管理员 |

<DocImage src="/product/mail/inbox-logo-overview.png" alt="邮箱 Inbox Logo 设置：Logo 与 VMC URL" width="1120" />

## 页面结构

页面分成两张配置卡片：

| 卡片 | 说明 |
|------|------|
| Logo | 当前 Logo URL、说明和更新输入框 |
| VMC | 当前 VMC URL、说明和更新输入框 |

页面展示的标题、说明、当前 URL 由后端返回。输入框只填写新的 URL，点击 `Update` 保存。

## 更新 Logo

1. 准备可公网访问的 Logo 文件 URL。
2. 在 Logo 卡片输入 URL。
3. 点击 `Update`。
4. 保存后页面重新加载当前 URL。

URL 必须通过格式校验，空值会提示必填。

## 更新 VMC

1. 准备 VMC 文件 URL。
2. 在 VMC 卡片输入 URL。
3. 点击 `Update`。
4. 保存后检查当前 URL 是否更新。

VMC 通常涉及证书与域名验证。后台只保存 URL；证书申请、DNS 与邮箱客户端支持情况需要结合域名配置核对。

## 建议顺序

| 场景 | 顺序 |
|------|------|
| 首次配置品牌标识 | 准备 Logo/VMC 文件 -> 上传到可访问地址 -> 更新 URL -> 发送测试邮件 |
| 更换 Logo | 替换文件 -> 更新 Logo URL -> 等待客户端缓存刷新 |
| 客户端不显示 Logo | 检查 URL、DNS、DMARC、BIMI/VMC 要求和客户端支持 |

## 相关

| 文档 | 说明 |
|------|------|
| [安全报告](./security-report.md) | 查看 DMARC 报告 |
| [控制台：域名 DNS](../console/domains.md#dns-记录) | 维护域名 DNS |
