# 最佳实践

> 面向真实业务场景，把后台 CMS、模板引擎和 KScript API 组合成可验证的落地流程。

## 这部分文档解决什么问题

后台 CMS 文档说明功能在哪里，模板引擎文档说明页面资源如何组织，API 文档说明 `k.*` 方法怎么调用。最佳实践关注更接近项目的问题：一个业务功能应该拆成哪些后台配置、页面资源、API、CodeBlock 和验证步骤。

## 已落地场景

| 场景 | 组合能力 |
|------|----------|
| [密码登录 / 登出](./auth/password-login.md) | `k.security` + `k.session` + `k.cookie` + KeyValue 用户记录 + 失败锁定 |
| [邮箱注册与找回密码](./auth/email-register-reset.md) | `k.security` + `k.mail` + token 哈希存储 + outbox 重试 + 密码重置 |
| [短信验证码登录](./auth/sms-login.md) | `k.utils.sms` + `k.security` + 验证码哈希存储 + 频率限制 + session |
| [会话、角色与权限](./auth/sessions-and-roles.md) | `k.session` + `k.cookie` + 角色/组织/资源归属校验 + API 权限边界 |
| [购物车到结算](./commerce/checkout.md) | `k.commerce.product` + `cart` + `order` + `discount` + `shipping` + 幂等订单创建 |
| [支付发起与回调](./commerce/payment-callbacks.md) | `k.payment` + `k.commerce.order` + HMAC 验签 + eventId 幂等 + 状态回查 |
| [订单履约与通知](./commerce/order-fulfillment.md) | `k.commerce.order` + 状态机 + 发货幂等 + 通知 outbox + timeline |
| [WebSocket 实时通信](./realtime/websocket.md) | `k.net.webSocket` + 短期 token + requestId 消息 + 服务端 push + 重连策略 |
| [内容驱动列表/详情页](./content/content-driven-pages.md) | CMS 内容类型/内容夹 + `k.content` + API 列表/详情 + Page 渲染 |
| [表单提交与服务端校验](./content/forms.md) | Page + API + `k.api` + 请求 body 校验 |
| [动态菜单与导航](./content/dynamic-navigation.md) | CMS 菜单 + `k.site.menus` + API 过滤 + Page 渲染 |
| [文件上传](./content/file-upload.md) | `k.request.files` + `k.media` + FormData + 上传失败处理 |
| [多语言站点](./content/multilingual-site.md) | CMS 多语言 + Label + SPA 多语言 + API fallback + Page 切换 |
| [API 响应缓存](./performance/api-cache.md) | API + `k.cache` + Page 观察缓存命中/清理 |
| [页面片段缓存](./performance/page-fragment-cache.md) | `k.cache` + HTML 片段 + 发布失效 |
| [URL 解析与安全跳转](./security/safe-redirect.md) | `k.request` + URL 白名单 + `k.response.redirect` |
| [CSRF 与重复提交防护](./security/csrf-idempotency.md) | `k.session` + `k.security` + CSRF token + 幂等键 |
| [密码哈希与敏感信息保护](./security/password-hash.md) | `k.security.hashPassword` + `verifyPassword` + 脱敏审计 |
| [访问控制与 API 防越权](./security/access-control.md) | `k.session` + 资源归属校验 + 角色例外 |
| [KeyValue 配置与缓存](./data/keyvalue-config.md) | `k.DB.keyValue` + `k.cache` + Page 观察配置更新 |
| [SQLite 业务模块 CRUD](./data/sqlite-crud.md) | `k.DB.sqlite` + API CRUD + 分页筛选 + Page 操作 |
| [媒体库选择与前台展示](./media/media-gallery.md) | CMS 媒体库 + `k.media` + Page 图片选择预览 |
| [内容搜索页](./search/content-search.md) | 内容索引 + `k.request.queryString` + 关键词/分类/分页过滤 |
| [代码生成资源与回滚](./site-resources/resource-rollback.md) | `k.site.pages/styles/scripts/codes` + 版本日志 + 预览回滚 |
| [HTTPClient 调用第三方接口](./integrations/httpclient-services.md) | `k.net.httpClient` + API 代理 + 上游错误处理 |
| [邮件与短信通知](./integrations/email-sms-notifications.md) | `k.mail` + `k.utils.sms` + outbox + 模板渲染 + 失败重试 + 脱敏日志 |
| [OpenAPI 外部服务](./integrations/openapi-services.md) | CMS Open API + `k.openApi` + API key 授权 + 生成类型 + 上游错误映射 |
| [Webhook 接收与验签](./integrations/webhook-signature.md) | `k.request.body` + `k.security.hmacSha256` + eventId 幂等 |
| [定时任务](./integrations/scheduled-jobs.md) | `src/job` SiteJob + `k.site.runJob` + 批处理日志 |
| [业务日志与错误追踪](./troubleshooting/business-logging.md) | `k.logger` + traceId + 统一错误结构 + 脱敏日志 |
| [统一 API 响应与错误结构](./troubleshooting/api-error-contract.md) | `k.response.statusCode` + 统一 envelope + traceId + 非 2xx body |
| [页面交互埋点](./operations/interaction-tracking.md) | Page 事件 + `k.request` + KeyValue 聚合 + 日志 |
| [AB 测试落地](./operations/ab-testing.md) | Cookie 分流 + KeyValue 统计 + 转化事件 |
| [Sitemap / SEO 自动化](./operations/sitemap-seo.md) | `k.utils.sitemap` + KeyValue 页面清单 + `/sitemap.xml` Page |

## 规划中的场景

| 分类 | 场景 |
|------|------|
| 账号与权限 | 密码登录、邮箱注册与找回密码、短信验证码登录、会话与角色权限 |
| 电商 | 购物车到结算、支付回调、订单履约、优惠与库存 |
| 实时通信 | WebSocket 实时消息、长任务进度推送 |
| 内容与站点 | 内容驱动页面、动态菜单、表单与文件上传、多语言站点 |
| 安全 | URL 解析与安全跳转、CSRF 与重复提交、密码哈希与敏感信息保护、访问控制与 API 防越权 |
| 数据 | KeyValue 配置与缓存、SQLite 业务模块 CRUD |
| 搜索与筛选 | 内容搜索页、商品搜索与筛选 |
| 站点资源 | 代码生成资源与回滚、可安装业务模块、模块导入导出与升级 |
| 媒体与文件 | 媒体库选择与前台展示、文件上传、大文件/断点上传 |
| 通知与集成 | HTTPClient 第三方接口、Webhook 接收与验签、定时任务、邮件短信通知、OpenAPI 外部服务 |
| 性能 | 页面片段缓存、API 响应缓存、缓存失效 |
| 日志与排错 | 业务日志、错误追踪、API 错误结构 |
| 运营 | 页面交互埋点、AB 测试落地、Sitemap / SEO 自动化 |

## 相关

- [后台 CMS](/cms/)
- [模板引擎](/templateEngine/)
- [API 详情](/api/)
