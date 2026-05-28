# API 详情

KScript API 完整参考文档（服务端 `k.*`）。

## 分类导航

### 入门

- [快速开始](./getting-started/) — API 基础与快速上手
- [认证与授权](./getting-started/auth.md) — 登录与会话

### 核心

- [k.api](./core/api.md) — API 路由创建
- [k.request](./core/request.md) — HTTP 请求处理
- [k.response](./core/response.md) — HTTP 响应处理
- [k.session](./core/session.md) — 会话状态
- [k.cookie](./core/cookie.md) — Cookie 管理
- [k.security](./core/security.md) — 安全加密

### 数据

- [k.DB](./data/database.md) — 数据库操作
- [k.DB.sqlite](./data/sqlite/) — SQLite
- [k.content](./data/content.md) — 内容管理

### 文件

- [k.file](./file/file.md) — 站点目录文件读写
- [folder](./file/file-folder.md) · [resumable](./file/file-resumable.md) · [数据结构](./file/file-info.md)

### 业务

- [k.commerce](./commerce/commerce.md) — 电商模块
- [k.payment](./payment/) — 支付集成
- [k.account](./account/) — 平台账户（登录、用户、组织、OAuth）

### 站点

- [k.site](./site/site.md) — 站点资源总览
- [pages](./site/page.md) · [layouts](./site/layout.md) · [views](./site/view.md)
- [scripts](./site/js.md) · [styles](./site/css.md)
- [k.module](./site/module.md) — 脚本模块
- [k.label & k.t](./site/label.md) — 多语言

### 网络

- [k.net.httpClient](./network/httpclient.md) — 出站 HTTP
- [k.net.webSocket](./network/websocket.md) — WebSocket

### 日志

- [k.logger](./logger/k-logger.md) — 代码日志

### 计划中文档

以下模块在 backlog 中，尚未发布独立页面：`k.storage`、`k.mail`、`k.emailMarketing`、`k.net.DNS`、`k.utils` 等。清单见仓库 `.trellis/spec/kscript-api-backlog.md`。
