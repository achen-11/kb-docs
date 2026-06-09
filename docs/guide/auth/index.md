# 登录鉴权总览

> 账号体系先定边界，再选登录方式。密码、邮箱、短信、会话和角色权限应组合成一条可验证的身份链路，而不是散在页面脚本里的几个表单。

## 先区分账号来源

Kooboo 项目里常见三类身份：

| 身份 | 典型用途 | 推荐边界 |
|------|----------|----------|
| 后台管理员 | 管理 CMS、页面、内容、配置和发布 | 使用 CMS 后台账号、角色和权限，不直接暴露给前台会员流程 |
| 业务会员 | 客户门户、订单查询、报名、资料中心 | 用业务用户表或 KeyValue/SQLite 保存，登录后写入 `k.session` |
| 第三方身份 | OAuth、企业 SSO、社交登录 | 第三方只负责证明身份，站点仍要落本地用户映射和权限 |

不要把后台管理员账号直接当作前台会员账号。后台权限和业务权限的风险边界不同，审计、锁定、重置密码和会话策略也不同。

## 登录方式怎么选

| 场景 | 推荐入口 | 说明 |
|------|----------|------|
| 常规会员登录 | [密码登录 / 登出](/guide/auth/password-login) | 邮箱/用户名 + 密码，适合长期账号体系 |
| 注册确认和找回密码 | [邮箱注册与找回密码](/guide/auth/email-register-reset) | 邮箱 token 必须哈希存储，并设置过期时间 |
| 手机号快速登录 | [短信验证码登录](/guide/auth/sms-login) | 验证码哈希存储，必须做频率限制和重试限制 |
| 资源权限控制 | [会话、角色与权限](/guide/auth/sessions-and-roles) | API 读取 session 后校验角色、组织和资源归属 |

真实项目通常会组合多种方式：密码登录作为基础身份，邮箱用于注册和找回密码，短信用于低摩擦登录或高风险操作验证，角色权限负责登录后的访问边界。

## 推荐分层

```text
Page 表单 / 前端交互
        ↓
Kooboo API: register / login / verify / reset / me / logout
        ↓
业务用户服务：校验、哈希、限流、幂等、审计
        ↓
k.security / k.session / k.cookie / k.mail / k.utils.sms / k.DB
```

前端只负责收集输入、展示状态和跳转。密码验证、验证码校验、token 消费、session 写入、角色判断和失败审计都应在服务端 API 中完成。

## 安全基线

- 密码只保存 `k.security.hashPassword` 的结果，不保存明文或可逆加密值。
- 邮箱重置 token、短信验证码和一次性登录码只保存哈希，响应里不返回原文。
- 登录成功后把最小用户上下文写入 `k.session`，cookie 只保存非敏感显示信息或 remember hint。
- 错误密码、验证码重试、找回密码发送都要做频率限制。
- API 每次读取敏感资源时都重新校验 session、角色和资源归属，不只相信前端隐藏按钮。
- 登出要清理 session 和相关 cookie。
- 邮件/短信通知建议走 outbox，避免发送失败影响核心业务写入。

## 验证路线

按下面顺序验证一套完整登录鉴权能力：

1. 完成 [密码登录 / 登出](/guide/auth/password-login)，确认注册只保存密码哈希，错误密码会累计并锁定账号。
2. 完成 [邮箱注册与找回密码](/guide/auth/email-register-reset)，确认 token 过期、重复消费和密码重置后旧 token 失效。
3. 完成 [短信验证码登录](/guide/auth/sms-login)，确认验证码过期、错误次数、重发间隔和登录 session。
4. 完成 [会话、角色与权限](/guide/auth/sessions-and-roles)，确认未登录、角色不足、跨组织访问和资源归属校验。

这四个场景都已通过临时本地 Kooboo 站点验证。概览页本身不需要单独建站，它负责连接身份设计和具体可运行场景。

## 相关

- [k.account](/api/account/)
- [k.session](/api/session/)
- [k.cookie](/api/cookie/)
- [k.security](/api/security/)
- [k.mail](/api/mail/)
- [k.utils.sms](/api/utils/sms)
- [站点用户（CMS）](/cms/settings/site-users)
- [角色（CMS）](/cms/settings/roles)
- [邮件与短信通知](/guide/integrations/email-sms-notifications)
