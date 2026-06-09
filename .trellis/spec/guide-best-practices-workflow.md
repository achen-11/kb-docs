# 最佳实践文档规划

> 路径：`docs/guide/**` · 面向实际业务场景的 Kooboo 开发最佳实践

## 定位修正

`docs/guide/` 的主轴不是「CLI、Vue、Tailwind 这些开发工具怎么用」，而是「一个真实业务功能在 Kooboo 里应该怎么落地」。

后台 CMS、模板引擎和 KScript API 已经分别回答：

- 后台 CMS：点哪里、配置什么、如何维护数据；
- 模板引擎：Page / Layout / View / Script / Style 如何组织页面；
- KScript API：`k.*` 方法、参数、返回值和示例。

最佳实践要回答更上层的问题：当读者要做登录鉴权、电商结算、WebSocket 实时通信、内容发布、表单提交、通知发送等业务场景时，应该按什么顺序组合后台配置、模板资源、API、CodeBlock、数据表和第三方服务。

旧版素材在 `old-source/dev-guide/`，只能作为工程化和 AI 辅助开发材料，不再作为最佳实践主目录的骨架。

## 内容原则

每篇最佳实践都按同一个场景模板写，避免变成散乱教程：

1. **适用场景**：什么时候需要这套做法，什么时候不需要。
2. **能力拆解**：涉及 CMS、模板、API、数据、第三方服务中的哪些部分。
3. **推荐架构**：页面、API、CodeBlock、数据表/内容类型、外部服务之间怎么分工。
4. **后台准备**：需要先在 CMS 配什么，链接到具体 CMS 文档。
5. **服务端流程**：API / CodeBlock / `k.*` 的职责边界，不重复完整 API 参考。
6. **前端流程**：模板页面、View、Vue/普通 JS、表单或实时连接怎么组织。
7. **安全与失败处理**：验证码、会话、权限、幂等、回调、重试、日志、限流等。
8. **验证清单**：上线前必须手动或脚本验证的关键路径。
9. **相关文档**：链接到 CMS、模板引擎、API 详情。

## 验证原则

最佳实践不能只凭 API 文档和经验编写。每个进入正文阶段的场景，都应在临时 Kooboo 站点中验证核心路径。

验证方式：

- 使用 `cdp_bridge` 进入 `http://localhost:3000/_Admin/` 的本地 Kooboo 后台创建临时站点；不要用 `kb new` 创建站点。
- 使用 Kooboo CLI 的 `kb clone` 克隆临时站点项目；后续只用 `kb pull` / `kb push` 同步资源。
- 临时站点和验证产物放在仓库外，例如 `/tmp/kb-docs-guide-verification/<scenario>/`，不要纳入 git 追踪。
- 使用 CLI 推送 Page、View、API、CodeBlock、Script、Style 等资源。
- 使用 cdp_bridge MCP 或等效 Chrome CDP 工具打开后台和前台页面，完成点击、填写、提交、刷新、重连等真实操作。
- 记录验证结果：站点 URL、测试账号/测试数据、关键截图、API 响应、失败路径和修正记录。
- 正文只写可复现的稳定结论，不把一次性临时数据、账号密码、站点 ID 写入文档。

验证等级：

| 等级 | 说明 | 适用场景 |
|------|------|----------|
| L0 | 只核对现有 CMS / API / 模板文档是否存在 | 场景规划、索引页 |
| L1 | 通过 Kooboo CLI 推送 API / CodeBlock 并用 HTTP 调用验证 | API 组合型场景 |
| L2 | 通过 CDP 操作前台页面完成完整用户流程 | 登录、表单、电商、内容页 |
| L3 | 覆盖失败路径、重复提交、权限、回调、重连、过期等异常 | 认证、支付、WebSocket、通知 |

默认要求：

- P0 场景至少达到 L2。
- 涉及支付、鉴权、WebSocket、验证码、文件上传、外部回调的场景至少达到 L3。
- 工程化支撑类页面可只做 L1，但其中示例命令必须在临时项目中跑通。

## 首批目录

```text
docs/guide/
├── index.md
├── scenarios.md
├── auth/
│   ├── index.md
│   ├── password-login.md
│   ├── email-register-reset.md
│   ├── sms-login.md
│   └── sessions-and-roles.md
├── commerce/
│   ├── checkout.md
│   ├── payment-callbacks.md
│   └── order-fulfillment.md
├── realtime/
│   └── websocket.md
├── content/
│   ├── content-driven-pages.md
│   ├── forms.md
│   ├── file-upload.md
│   └── multilingual-site.md
├── integrations/
│   ├── email-sms-notifications.md
│   ├── openapi-services.md
│   └── scheduled-jobs.md
├── performance/
│   ├── api-cache.md
│   └── page-fragment-cache.md
└── engineering/
    ├── local-development.md
    ├── project-structure.md
    ├── vue.md
    ├── tailwind.md
    └── ai-assisted-development.md
```

说明：

- `auth/`、`commerce/`、`realtime/` 是第一批主场景。
- `content/` 和 `integrations/` 是第二批高频业务场景。
- `engineering/` 保留原规划中的 CLI、项目结构、Vue、Tailwind、AI，但定位为支撑最佳实践，不再占据主目录重心。

## VitePress 侧栏

```text
最佳实践
├── 场景总览
│   ├── 总览
│   └── 场景索引
├── 账号与权限
│   ├── 登录鉴权总览
│   ├── 密码登录
│   ├── 邮箱注册与找回密码
│   ├── 短信验证码登录
│   └── 会话、角色与权限
├── 电商
│   ├── 结算流程
│   ├── 支付回调
│   └── 订单履约
├── 实时通信
│   └── WebSocket
├── 内容与站点
│   ├── 内容驱动页面
│   ├── 表单提交与服务端校验
│   ├── 文件上传
│   └── 多语言站点
├── 通知与集成
│   ├── 邮件与短信通知
│   ├── OpenAPI 外部服务
│   └── 定时任务
├── 性能
│   ├── API 响应缓存
│   └── 页面片段缓存
└── 工程化支撑
    ├── 本地开发
    ├── 项目结构
    ├── Vue 接入
    ├── Tailwind
    └── AI 辅助开发
```

## 场景池总览

启动目标功能前，先以此场景池作为 backlog。P0 是首批必须落地，P1 是高频业务场景，P2 是 API 组合与运营增强场景，P3 是更复杂或依赖具体项目形态的场景。

| 优先级 | 分类 | 场景 | 主要组合能力 | 最低验证 |
|--------|------|------|--------------|----------|
| P0 | 账号与权限 | 密码登录 / 登出 | `k.security`、`k.session`、`k.cookie`、`k.DB.keyValue`、API、表单 | L3 |
| P0 | 账号与权限 | 邮箱注册与找回密码 | `k.security`、`k.mail`、`k.DB.keyValue`、token 哈希存储、API | L3 |
| P0 | 账号与权限 | 短信验证码登录 | `k.utils.sms`、`k.security`、`k.session`、验证码哈希存储、限流、API | L3 |
| P0 | 账号与权限 | 会话、角色与权限 | `k.session`、`k.cookie`、`k.DB.keyValue`、CMS 用户/角色、API 权限校验 | L3 |
| P0 | 电商 | 购物车到结算 | `k.commerce.product`、`cart`、`order`、`discount`、`shipping`、`currency` | L3 |
| P0 | 电商 | 支付发起与回调 | `k.payment`、`k.commerce.order`、回调验签、幂等、日志 | L3 |
| P0 | 电商 | 订单履约与通知 | `k.commerce.order`、发货状态、`k.mail`、短信通知 | L2 |
| P0 | 实时通信 | WebSocket 实时消息 | `k.net.webSocket`、session/token 鉴权、心跳、重连、日志 | L3 |
| P1 | 内容与站点 | 内容驱动列表/详情页 | CMS 内容类型、`k.content`、Page、View、模板绑定 | L2 |
| P0 | 内容与站点 | 表单提交与服务端校验 | Page、`k.api`、`k.request`、`k.response`、JSON body、字段校验 | L2 |
| P1 | 内容与站点 | 文件上传 | `k.request`、`k.response`、`k.file`、`k.media`、权限、失败恢复 | L3 |
| P1 | 内容与站点 | 多语言站点 | CMS 多语言、`k.label`、SPA 多语言、URL 语言切换 | L2 |
| P1 | 通知与集成 | 邮件/短信验证码与业务通知 | `k.mail`、`k.utils.sms`、队列/重试、日志 | L3 |
| P1 | 通知与集成 | OpenAPI 外部服务调用 | CMS OpenAPI、`k.openApi`、OAuth2、错误处理 | L2 |
| P1 | 通知与集成 | 定时任务 | `k.site.runJob`、CodeBlock、过期清理、批处理日志 | L2 |
| P1 | 数据 | SQLite 业务模块 CRUD | `k.DB.sqlite`、API、CodeBlock service、分页筛选 | L2 |
| P1 | 数据 | KeyValue 配置与缓存 | `k.DB.keyValue`、`k.cache`、配置读取、失效策略 | L2 |
| P1 | 媒体与文件 | 媒体库选择与前台展示 | CMS 媒体库、`k.media`、Page/View、图片路径 | L2 |
| P1 | 媒体与文件 | 大文件/断点上传 | `k.file.resumable`、上传 API、权限、失败恢复 | L3 |
| P1 | 站点资源 | 动态菜单与导航 | CMS 菜单、`k.site.menus`、View、模板循环 | L2 |
| P2 | 搜索与筛选 | 内容搜索页 | `k.content`、`k.request`、分页、筛选、URL 参数 | L2 |
| P2 | 搜索与筛选 | 商品搜索与筛选 | `k.commerce.product`、分类、价格、库存、分页 | L2 |
| P2 | 安全 | CSRF / 重复提交防护 | `k.session`、`k.security`、token、幂等键 | L3 |
| P2 | 安全 | 密码哈希与敏感信息保护 | `k.security`、日志脱敏、配置边界 | L2 |
| P2 | 安全 | 访问控制与 API 防越权 | CMS 角色、业务用户、API 权限校验 | L3 |
| P2 | 性能 | 页面片段缓存 | `k.cache`、View、失效策略、后台更新联动 | L2 |
| P0 | 性能 | API 响应缓存 | `k.api`、`k.cache`、Page、权限隔离、过期策略 | L2 |
| P2 | 日志与排错 | 业务日志与错误追踪 | `k.logger`、API 错误结构、CMS 日志入口 | L2 |
| P2 | 运营 | AB 测试落地 | CMS AB 测试、cookie/session、页面变体、统计 | L2 |
| P2 | 运营 | 页面交互埋点 | CMS 页面交互、`k.request`、日志/存储 | L2 |
| P2 | 支付 | 多支付方式选择 | CMS Payment 配置、`k.payment` 多 provider、订单状态 | L3 |
| P2 | 支付 | 退款/取消订单 | `k.payment`、`k.commerce.order`、状态机、通知 | L3 |
| P2 | 电商 | 优惠券与会员价 | `k.commerce.discount`、`membership`、`customer`、价格重算 | L3 |
| P2 | 电商 | 库存扣减与超卖防护 | `k.commerce.product`、订单状态、幂等、并发验证 | L3 |
| P2 | 会员 | 会员资料与地址簿 | `k.commerce.customer`、`address`、账号体系、权限 | L2 |
| P2 | 会员 | 收藏/愿望清单 | `k.commerce.wishlist`、session/user、前台组件 | L2 |
| P2 | 集成 | 对象存储上传与公开访问 | CMS Storage 配置、`k.storage`、文件权限、URL | L2 |
| P2 | 集成 | Webhook 接收与验签 | API、`k.security`、日志、重试、幂等 | L3 |
| P2 | 集成 | HTTPClient 调用第三方接口 | `k.net.httpClient`、错误码、超时、重试 | L2 |
| P2 | 安全 | URL 解析与安全跳转 | `k.request`、URL 白名单、`k.response.redirect` | L2 |
| P2 | 网络 | WebSocket 进度推送 | `k.net.webSocket`、长任务、前端状态机 | L3 |
| P2 | 模块 | 可安装业务模块 | `k.module`、模块 config/task/localFile、路由资源 | L2 |
| P2 | 模块 | 模块导入导出与升级 | `k.module`、版本、配置迁移、回滚 | L2 |
| P2 | 站点资源 | 代码生成资源与回滚 | `k.site.pages/views/scripts/styles/codes`、日志、预览 | L2 |
| P3 | 复杂应用 | CRM 管理后台 | SQLite、API 分层、Vue、权限、导入导出 | L3 |
| P3 | 复杂应用 | 内容审核流 | `k.content`、角色权限、状态机、通知、日志 | L3 |
| P3 | 复杂应用 | 预约/报名系统 | 表单、库存名额、短信邮件、定时提醒、支付可选 | L3 |
| P3 | 复杂应用 | 客服/聊天 | WebSocket、账号、消息存储、已读状态、通知 | L3 |
| P3 | 复杂应用 | 文件资料库 | `k.file`、`k.media`、权限、搜索、预览/下载 | L3 |
| P3 | 复杂应用 | 多租户/组织切换 | `k.account.organization`、权限、数据隔离、URL 策略 | L3 |
| P3 | 复杂应用 | 报表与导出 | SQLite、`k.utils.office`、定时任务、权限 | L3 |
| P3 | 复杂应用 | Sitemap / SEO 自动化 | CMS SEO、`k.utils.sitemap`、页面资源、定时更新 | L2 |
| P3 | 复杂应用 | 图片处理与缩略图 | `k.utils.image`、媒体库、上传、缓存 | L2 |
| P3 | 复杂应用 | PDF/截图生成 | `k.utils.puppeteer`、`k.utils.screenShot`、任务队列 | L2 |

## 场景入选规则

一个场景进入目标功能前，应满足至少两条：

- 需要组合两个以上 KScript API 或 CMS + API + 模板三者之一。
- 是真实业务功能，而不是单个方法说明。
- 有明确失败路径或安全边界，值得形成最佳实践。
- 可以用 Kooboo CLI + CDP 在临时站点中验证。
- 能反向补齐现有 CMS、模板引擎、API 文档之间的链接。

## P0 场景：账号与权限

### 登录鉴权总览

路径：`docs/guide/auth/index.md`

职责：

- 解释 Kooboo 里常见身份体系：站点用户、会员/业务用户、管理员、第三方 OAuth。
- 对比密码登录、邮箱验证码/链接、短信验证码、OAuth 登录。
- 给出推荐分层：前端表单 → API → CodeBlock service → `k.account` / `k.session` / `k.cookie` / `k.security` / 邮件短信能力。
- 明确哪些能力应写进 CMS 文档，哪些应链接 API 文档。

相关文档：

- `docs/api/account/`
- `docs/api/session/`
- `docs/api/cookie/`
- `docs/api/security/`
- `docs/api/mail/`
- `docs/api/utils/sms.md`
- `docs/cms/settings/site-users.md`
- `docs/cms/settings/roles.md`

验证状态：

- 已补充概览页，用于串联已验证的密码登录、邮箱注册与找回密码、短信验证码登录、会话角色权限四个 L3 场景；概览页不单独建站验证。

### 密码登录

路径：`docs/guide/auth/password-login.md`

覆盖：

- 登录表单字段和基础校验；
- API 接收用户名/邮箱/手机号 + 密码；
- 密码哈希、失败次数、错误提示边界；
- session/cookie 写入；
- 登录后跳转；
- 登出；
- 验证清单：弱密码、重复注册、错误密码、连续失败锁定、当前用户、登出后未登录状态。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、弱密码、注册、重复注册、错误密码、正确登录、当前用户、审计不暴露明文/哈希、登出、连续失败锁定、CDP 前台完整按钮流和 `kb pull`。

### 邮箱注册与找回密码

路径：`docs/guide/auth/email-register-reset.md`

覆盖：

- 注册表单；
- 邮箱唯一性；
- 邮件验证码或重置链接；
- token 过期和一次性使用；
- 找回密码；
- 注册成功后的登录策略；
- 邮件发送失败和重试。

验证状态：

- 已通过本地临时 Kooboo 站点验证弱密码、注册、重复注册、未验证登录、确认邮箱、确认 token 一次性使用、已验证登录、未知邮箱找回防枚举、找回已知邮箱、弱密码重置、重置密码、重置 token 一次性使用、旧密码失败、新密码成功、邮件发送失败记录、邮件重试、审计不暴露明文/哈希/token、CDP 前台完整按钮流和 `kb pull`。

### 短信验证码登录

路径：`docs/guide/auth/sms-login.md`

覆盖：

- 手机号格式；
- 验证码发送频率限制；
- 验证码存储和过期；
- 登录/注册合一的选择；
- 短信服务配置；
- 防刷和错误提示。

验证状态：

- 已通过本地临时 Kooboo 站点验证非法手机号、发送验证码、重复发送限流、错误验证码、三次错误锁定、锁定后正确验证码拒绝、正确验证码登录、当前用户、验证码复用拒绝、登出后 401、短信发送失败记录、短信重试、审计不暴露明文/哈希、CDP 前台完整状态流和 `kb pull`。

### 会话、角色与权限

路径：`docs/guide/auth/sessions-and-roles.md`

覆盖：

- session、cookie、remember me 的边界；
- 页面级权限和 API 级权限；
- CMS 角色配置与业务权限的区别；
- 未登录、无权限、会话过期的处理。

验证状态：

- 已通过本地临时 Kooboo 站点验证未登录 401、成员读取自有资源、成员跨组织越权、成员访问管理员报表拒绝、成员修改自有项目、成员修改机密项目拒绝、组织经理读取本组织机密项目、组织经理修改机密项目拒绝、管理员全局报表、管理员跨组织读取、登出后 401、CDP 前台完整状态流和 `kb pull`。

## P0 场景：电商结算

### 结算流程

路径：`docs/guide/commerce/checkout.md`

职责：

- 串起商品、购物车、地址、配送、优惠、税费、货币、订单、支付。
- 给出推荐流：商品页 → 购物车 → 收货信息 → 价格确认 → 创建订单 → 发起支付。
- 说明哪些数据来自 CMS 电商后台，哪些逻辑应放 API / CodeBlock。

相关文档：

- `docs/cms/commerce/`
- `docs/api/commerce/commerce.md`
- `docs/api/commerce/product.md`
- `docs/api/commerce/cart.md`
- `docs/api/commerce/order.md`
- `docs/api/commerce/shipping.md`
- `docs/api/commerce/discount.md`
- `docs/api/payment/`

关键点：

- 下单前重新计算价格，不信任前端金额；
- 库存、优惠、配送和税费都需要在服务端确认；
- 支付前创建 pending 订单；
- 支付失败、取消、重复提交要有明确状态。

验证状态：

- 已通过本地临时 Kooboo 站点 `guide_checkout_0609052302` 验证结算预览、前端金额篡改、无效优惠码、库存不足、缺少幂等键、无效地址、下架商品、pending 订单创建、重复幂等键返回同一订单、库存扣减、订单查询、CDP 前台完整状态流和 `kb pull`。

### 支付回调

路径：`docs/guide/commerce/payment-callbacks.md`

覆盖：

- 支付发起与支付回调分离；
- 回调验签；
- 幂等更新订单；
- 回调日志；
- 前端轮询或跳转查询订单状态；
- 不在前端直接信任支付结果。

验证状态：

- 已通过本地临时 Kooboo 站点 `guide_payment_callbacks_06090534` 验证支付发起、重复发起、缺少幂等键、订单不存在、已支付订单不可再次支付、错误签名、金额不匹配、合法回调更新订单为 paid、重复回调幂等返回、状态持久化、CDP 前台完整状态流和 `kb pull`。

### 订单履约

路径：`docs/guide/commerce/order-fulfillment.md`

覆盖：

- 已支付、待发货、已发货、已完成、退款等状态；
- 发货信息；
- 邮件/短信通知；
- 后台订单管理与前台订单查询的边界。

验证状态：

- 已通过本地临时 Kooboo 站点 `guide_order_fulfillment_06090542` 验证缺物流发货拒绝、未支付订单发货拒绝、未发货签收拒绝、正常发货、重复发货幂等、通知 outbox、签收、完成、最终状态、CDP 前台完整状态流和 `kb pull`。

## P0 场景：WebSocket

路径：`docs/guide/realtime/websocket.md`

职责：

- 说明实时消息、进度推送、在线状态、客服/聊天、协作编辑等场景何时使用 WebSocket。
- 给出连接、鉴权、心跳、重连、消息格式、错误处理的推荐结构。
- 链接 `k.net.webSocket`，但不重复 API 参考。

相关文档：

- `docs/api/net/websocket.md`
- `docs/api/session/`
- `docs/api/security/`
- `docs/api/logger/`

关键点：

- 握手阶段校验登录态或临时 token；
- 消息必须有 `type`、`requestId` 或业务 id；
- 客户端要处理断线重连和重复消息；
- 服务端要记录异常和关键业务事件；
- 不把敏感权限只放在前端判断。

验证状态：

- 已通过本地临时 Kooboo 站点 `guide_websocket_06090550` 验证无效 token 拒绝、短期 token 签发、Node 22 `ws://` 和 `wss://` 真实 WebSocket 连接、`ping/pong`、连接列表、HTTP 服务端 push、`echo.ack`、任务进度完成、非法消息错误帧、关闭帧和 `kb pull`。CDP 页面加载通过；当前 Chrome/CDP profile 下浏览器内 WSS 直连返回 1006，未标记为页面按钮流通过。

## P1 场景：内容与站点

### 内容驱动页面

路径：`docs/guide/content/content-driven-pages.md`

覆盖：

- 内容类型；
- 内容夹；
- 内容条目；
- Page / View 渲染；
- `k.content` 查询；
- 列表、详情、分类、标签。

验证状态：

- 已通过本地临时 Kooboo 站点验证 CMS `Article` 数据类型/内容夹初始化、`k.content.Article.add/all/find`、公开列表过滤草稿、分类筛选、搜索、detail、缺失 slug 404、草稿 404、CDP 前台分类切换和 `kb pull`。

### 表单提交与服务端校验

路径：`docs/guide/content/forms.md`

覆盖：

- 表单字段；
- 服务端校验；
- 防重复提交；
- 提交后通知。

验证状态：

- 已通过本地临时 Kooboo 站点验证 Page + API + `k.api.post` 的失败/成功路径。

### 文件上传

路径：`docs/guide/content/file-upload.md`

覆盖：

- 文件字段；
- 上传权限；
- 媒体/文件存储；
- 大文件/断点上传；
- 上传失败恢复；
- 上传后业务记录。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、缺文件、非法类型、PNG 上传、list、delete、重复 delete、CDP 前台 FormData 上传预览和 `kb pull`。

### 多语言站点

路径：`docs/guide/content/multilingual-site.md`

覆盖：

- CMS 多语言配置；
- label；
- 内容多语言；
- URL 与语言切换；
- SPA 多语言接口。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、seed、中文/英文字典、不支持语言回退、英文内容 fallback、CDP 前台语言切换、`k.site.labels` seed 和 `kb pull`。

### 动态菜单与导航

路径：`docs/guide/content/dynamic-navigation.md`

覆盖：

- CMS 菜单；
- `k.site.menus` 读取和初始化菜单；
- API 按身份/角色过滤菜单树；
- 当前路径高亮；
- Page / View 渲染导航；
- 受限菜单与服务端权限边界。

验证状态：

- 已通过本地临时 Kooboo 站点验证 CMS 菜单创建、`k.site.menus` 读取、访客/会员过滤、当前项高亮、CDP 前台点击和 `kb pull`。

## P2 场景：搜索与筛选

### 内容搜索页

路径：`docs/guide/search/content-search.md`

覆盖：

- 内容索引字段设计；
- `k.request.queryString` 读取关键词、分类、分页参数；
- 服务端过滤已发布内容；
- 标题、摘要、分类、路径、标签的关键词匹配；
- 分类筛选；
- `page`、`pageSize` 归一化与越界处理；
- 空结果和草稿过滤；
- Page 前台完成搜索、下一页、分类筛选和清空流程。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、seed、index、关键词搜索、分类筛选、分页、空结果、草稿过滤、CDP 前台完整按钮流和 `kb pull`。

## P2 场景：站点资源

### 代码生成资源与回滚

路径：`docs/guide/site-resources/resource-rollback.md`

覆盖：

- `k.site.pages.add/updateBody/delete/getLogs/getByLog`；
- `k.site.styles.add/updateBody/delete`；
- `k.site.scripts.add/updateBody/delete`；
- `k.site.codes.add/delete` 生成 Api 和 CodeBlock；
- 生成后预览 URL 验证；
- 动态 API 根路径验证；
- Page 版本日志读取和旧版本回滚；
- 删除动态资源后的对象状态验证；
- Page 前台完成 generate、update、rollback、state、cleanup 流程。

验证状态：

- 已通过本地临时 Kooboo 站点验证动态创建 Page、Style、Script、Api Code、CodeBlock，预览 v1，更新 v2，`getLogs` + `getByLog(logId)` 回滚 v1，动态 API JSON 响应，CDP 前台完整按钮流和 `kb pull`。

## P1 场景：通知与集成

### 邮件与短信通知

路径：`docs/guide/integrations/email-sms-notifications.md`

覆盖：

- 注册/找回密码验证码；
- 订单通知；
- 表单提交通知；
- 发送失败记录和重试；
- 频率限制。

验证状态：

- 已通过本地临时 Kooboo 站点 `guide_email_sms_06090601` 验证订单通知入队、重复入队幂等、验证码通知、无效手机号拒绝、缺模板拒绝、供应商失败、重试发送、脱敏状态查询、CDP 前台完整状态流和 `kb pull`。

### OpenAPI 外部服务

路径：`docs/guide/integrations/openapi-services.md`

覆盖：

- CMS 配置 OpenAPI；
- API 封装调用；
- OAuth2 或密钥管理；
- 错误处理和日志。

验证状态：

- 已通过本地临时 Kooboo 站点 `guide_openapi_06090608` 验证 CMS Open API 定义保存、`kb pull type` 生成 `_api_partner_orders_Get` / `_api_partner_shipment_Post`、未授权拒绝、API key 授权、订单查询、发货同步、上游 502 错误映射、CDP 前台完整按钮流和 `kb pull`。

### 定时任务

路径：`docs/guide/integrations/scheduled-jobs.md`

覆盖：

- 定时同步；
- 订单超时取消；
- 清理过期验证码/token；
- 批量通知。

验证状态：

- 已通过本地临时 Kooboo 站点验证 `src/job` + `@jobConfig` 推送 SiteJob、`k.site.runJob` 手动触发、过期 token 清理、运行日志写入、CDP 前台完整按钮流和 `kb pull`。

## P0 场景：性能

### API 响应缓存

路径：`docs/guide/performance/api-cache.md`

覆盖：

- API 计算结果缓存；
- `k.cache.getOrCreate`；
- 缓存键设计；
- 清理缓存；
- 前台观察缓存命中；
- 权限和上下文隔离。

验证状态：

- 已通过本地临时 Kooboo 站点验证 `k.cache` 的首次生成、二次命中、清理后再生成、CDP 前台操作和 `kb pull`。

### 页面片段缓存

路径：`docs/guide/performance/page-fragment-cache.md`

覆盖：

- View 或页面片段的缓存；
- 后台内容更新后的失效；
- 缓存键与语言/分类/用户上下文；
- 不缓存敏感个性化内容。

验证状态：

- 已通过本地临时 Kooboo 站点验证 HTML 片段首次未命中、二次命中、发布新版本后失效、清理后再生成、CDP 前台片段注入 DOM 和 `kb pull`。

## P2 场景：安全

### URL 解析与安全跳转

路径：`docs/guide/security/safe-redirect.md`

覆盖：

- 登录后 returnUrl；
- 支付/OAuth 回跳；
- 站内相对路径白名单；
- 外部绝对 URL 和协议相对 URL 拦截；
- `k.response.redirect` 安全执行；
- fallback 页面和拦截提示。

验证状态：

- 已通过本地临时 Kooboo 站点验证安全相对路径、外部绝对 URL、协议相对 URL、302 Location、CDP 前台危险目标回退、安全目标站内跳转和 `kb pull`。

### CSRF / 重复提交防护

路径：`docs/guide/security/csrf-idempotency.md`

覆盖：

- session 保存 CSRF token；
- `k.security.shortGuid()` 生成不可预测 token；
- 幂等键按业务动作生成；
- 缺 token、错误 token、重复幂等键的失败结构；
- 重复提交返回上一次处理结果；
- Page 前台按钮流和 API cookie 会话验证。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、缺 token、获取 token、合法提交、同一幂等键重复提交、CDP 前台完整按钮流和 `kb pull`。

### 密码哈希与敏感信息保护

路径：`docs/guide/security/password-hash.md`

覆盖：

- `k.security.hashPassword` 保存密码哈希；
- `k.security.verifyPassword` 验证登录密码；
- 弱密码、错误密码、重复注册的稳定失败结构；
- KeyValue 保存用户记录但不保存明文密码；
- API 响应和审计输出不返回 `passwordHash` 本体；
- Page 前台注册、登录、错误密码和审计验证。

验证状态：

- 已通过本地临时 Kooboo 站点验证注册、正确登录、错误密码、弱密码、存储审计、CDP 前台完整按钮流和 `kb pull`。

### 访问控制与 API 防越权

路径：`docs/guide/security/access-control.md`

覆盖：

- `k.session` 保存当前用户和角色；
- 订单 ownerId 资源归属校验；
- 未登录、资源不存在、跨用户访问的稳定失败结构；
- 客服/运营角色的显式服务端例外；
- API 响应不依赖前端隐藏按钮；
- Page 前台模拟 Alice、Bob 和客服访问订单。

验证状态：

- 已通过本地临时 Kooboo 站点验证未登录拒绝、Alice 访问自己订单、Alice/Bob 跨用户越权拒绝、Bob 访问自己订单、客服访问客户订单、CDP 前台完整按钮流和 `kb pull`。

## P1 场景：数据

### KeyValue 配置与缓存

路径：`docs/guide/data/keyvalue-config.md`

覆盖：

- CMS 键值存储；
- `k.DB.keyValue` 字符串读写；
- JSON 配置解析和默认值；
- `k.cache` 缓存解析结果；
- 配置更新后的缓存失效；
- Page 观察配置读取、更新和清理。

验证状态：

- 已通过本地临时 Kooboo 站点验证默认写入、首次读取未命中、二次读取命中、更新后失效、删除后回退默认配置、CDP 前台操作和 `kb pull`。

### SQLite 业务模块 CRUD

路径：`docs/guide/data/sqlite-crud.md`

覆盖：

- `k.DB.sqlite.execute` 幂等建表和索引；
- `k.DB.sqlite.query` 参数化列表查询；
- API 创建、更新、删除业务记录；
- 状态、优先级、标题和 ID 校验；
- 分页、状态筛选和关键字搜索；
- `k.DB.sqlite.transaction` 批量 seed；
- Page 前台完成完整 CRUD 流程；
- 删除不存在 ID、标题过短等失败结构。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、seed、状态筛选、非法创建、创建、更新、搜索、删除、删除不存在 ID、CDP 前台完整按钮流和 `kb pull`。

## P1 场景：媒体与文件

### 媒体库选择与前台展示

路径：`docs/guide/media/media-gallery.md`

覆盖：

- CMS 媒体库与 `k.media` 的职责边界；
- `k.media.folderFiles` 列出业务目录图片；
- `k.media.get` 按路径或 ID 读取媒体详情；
- API 归一化媒体字段；
- 选择路径的目录边界校验；
- Page 前台渲染图库和当前选择；
- 空列表、越界路径、媒体不存在的失败结构。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、seed、list、select、越界路径、reset 后不存在、CDP 前台生成图库/选择/清空和 `kb pull`。

## P2 场景：集成

### HTTPClient 调用第三方接口

路径：`docs/guide/integrations/httpclient-services.md`

覆盖：

- 服务端代理第三方接口；
- `k.net.httpClient.createJsonContent`；
- `k.net.httpClient.send`；
- Header、timeout 和状态码处理；
- 上游 2xx / 5xx 响应转换；
- Page 触发成功和失败路径。

验证状态：

- 已通过本地临时 Kooboo 站点验证 mock 第三方成功响应、真实 500 响应、代理 API 成功结构、上游失败结构、CDP 前台操作和 `kb pull`。

### Webhook 接收与验签

路径：`docs/guide/integrations/webhook-signature.md`

覆盖：

- `k.request.body` 读取 raw body；
- `k.request.headers` 读取签名 Header；
- `k.security.hmacSha256` 计算 HMAC 签名；
- 时间戳窗口防重放；
- eventId 幂等处理；
- 缺签名、错误签名、过期时间戳、重复事件的失败结构；
- Page 前台模拟第三方回调。

验证状态：

- 已通过本地临时 Kooboo 站点验证合法 Webhook、重复 eventId、错误签名、过期时间戳、CDP 前台完整按钮流和 `kb pull`。

## P2 场景：日志与排错

### 业务日志与错误追踪

路径：`docs/guide/troubleshooting/business-logging.md`

覆盖：

- API 统一返回 traceId；
- `k.logger.information` / `warning` / `error` 分级记录；
- 参数校验失败、业务成功、异常捕获三类路径；
- 密码、token、邮箱等敏感字段脱敏；
- `k.logger.query` 按 category、level、keyword 查询日志；
- Page 前台触发请求并按 traceId 回查日志。

验证状态：

- 已通过本地临时 Kooboo 站点验证成功结算、校验失败、模拟异常、Information/Warning/Error 日志回查、敏感字段脱敏、CDP 前台完整按钮流和 `kb pull`。

### 统一 API 响应与错误结构

路径：`docs/guide/troubleshooting/api-error-contract.md`

覆盖：

- 成功和失败统一 envelope；
- `k.response.statusCode` 设置 HTTP 状态；
- 400、401、404、409、500 常见错误；
- 字段级 `errors`；
- `traceId`、`retryable`、`timestamp`；
- Page 前台读取非 2xx 响应 body。

验证状态：

- 已通过本地临时 Kooboo 站点验证 200、400、401、404、409、500 的 HTTP status 与响应结构、CDP 前台非 2xx body 展示和 `kb pull`。

## P2 场景：运营

### 页面交互埋点

路径：`docs/guide/operations/interaction-tracking.md`

覆盖：

- Page 元素使用稳定 anchorId 和 eventName；
- `k.request.body` 接收事件 payload；
- `k.request.headers` 和 `clientIp` 补充上下文；
- `k.DB.keyValue` 保存轻量聚合统计；
- `k.logger` 记录事件审计；
- 缺事件名、缺锚点 ID 的失败结构；
- Page 前台点击锚点并查看 summary。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、三类事件上报、缺字段失败、summary 聚合、CDP 前台完整按钮流和 `kb pull`。

### AB 测试落地

路径：`docs/guide/operations/ab-testing.md`

覆盖：

- Cookie 固定访客 variant；
- API 分流并记录 impression；
- 转化事件归因到当前 variant；
- `k.DB.keyValue` 保存 A/B 轻量聚合统计；
- 转化率计算；
- Page 前台展示 variant 并触发转化；
- 与 CMS AB 测试文档的职责边界；
- 缺少 variant Cookie 时的失败结构。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、首次分流、重复分流 sticky、转化、summary、缺 Cookie 转化失败、CDP 前台完整按钮流和 `kb pull`。

### Sitemap / SEO 自动化

路径：`docs/guide/operations/sitemap-seo.md`

覆盖：

- `k.DB.keyValue` 保存页面清单；
- `k.utils.sitemap.create().append().build()` 生成 sitemap XML；
- 公开 `/sitemap.xml` Page 设置 XML Content-Type；
- 已发布页面过滤；
- 多语言 alternate URL；
- `lastmod`、`changefreq`、`priority` 的服务端归一化；
- API 提供 seed、entries、xml、touch、reset 验证入口；
- Page server script 不默认依赖 TypeScript `import` 导入 CodeBlock 的运行时边界。

验证状态：

- 已通过本地临时 Kooboo 站点验证 reset、seed、entries、xml、touch `/docs`、缺 path、未知 path、公开 `/sitemap.xml` Content-Type、CDP 前台完整按钮流和 `kb pull`。

## 工程化支撑

工程化支撑章节保留，但必须服务于业务场景，不作为最佳实践主轴：

| 页面 | 定位 |
|------|------|
| `guide/engineering/local-development.md` | Kooboo CLI 本地开发、pull/push/sync |
| `guide/engineering/project-structure.md` | API、CodeBlock、Page、View、Script、Style 的目录组织 |
| `guide/engineering/vue.md` | 复杂前端交互页的 Vue 接入 |
| `guide/engineering/tailwind.md` | 页面样式和 CMS 编辑器 Tailwind 配置边界 |
| `guide/engineering/ai-assisted-development.md` | AI 辅助模块开发和 review notes |

## 实施顺序

1. 重写 `docs/guide/index.md`：用业务场景索引替换原占位页。
2. 新增 `docs/guide/scenarios.md`：完整列出场景池、优先级、主要组合 API、验证等级。
3. 在 `docs/.vitepress/config.mts` 增加场景型 `guideSidebar`。
4. 先落 P0 页面骨架、核心正文和验证记录：
   - `auth/index.md`
   - `auth/password-login.md`
   - `auth/email-register-reset.md`
   - `auth/sms-login.md`
   - `auth/sessions-and-roles.md`
   - `commerce/checkout.md`
   - `commerce/payment-callbacks.md`
   - `commerce/order-fulfillment.md`
   - `realtime/websocket.md`
5. 再补 P1 内容、集成、数据、媒体、站点资源场景。
6. P2 按 API 组合价值和验证成本挑选，不一次性写完。
7. P3 只在有真实项目需求或验证样例后写，避免凭空设计复杂应用。
8. 最后迁移工程化支撑篇，把旧 `old-source/dev-guide/` 的 CLI、Vue、AI 辅助内容重写后放入 `engineering/`。
9. 每一批完成后运行 `pnpm docs:build` 和 `pnpm check:dead-links`。
10. 每个 P0/P1 场景正文合并前，必须完成对应验证等级并保存验证摘要；临时站点和验证产物不得纳入 git。

## 验收标准

- 最佳实践首屏按业务场景组织，而不是按工具组织。
- `docs/guide/scenarios.md` 覆盖不少于 40 个常见业务场景或 KScript API 组合场景。
- 登录鉴权、电商结算、WebSocket 至少有独立页面规划、侧栏入口和验证方案。
- 每个场景页都有能力拆解、推荐架构、安全/失败处理、验证清单和相关文档。
- 每个 P0 场景至少达到 L2 验证；涉及鉴权、支付、WebSocket、验证码、回调的 P0 场景达到 L3。
- 验证产物保存在仓库外或明确 ignored 的临时目录，不进入 git 追踪。
- 旧 CLI / Vue / Tailwind / AI 内容不会占据主目录，只作为工程化支撑。
- 文中不出现旧文档的 `beta-badge` HTML。
- `pnpm docs:build` 通过。
- `pnpm check:dead-links` 没有新增 guide 相关死链。
