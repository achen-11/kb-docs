# KScript API 文档 Backlog

> 生成日期：2026-05-27  
> **权威来源（优先级）**：**Kooboo 服务端 C# 源码**（如 `Kooboo.Sites/Scripting/k.cs`、`*Repository.cs`）→ `old-source/kooboo.d.ts` → `old-source/api/` → kooboo-coding skill。详见 `.trellis/spec/api-documentation-workflow.md`「数据源优先级」。  
> **范围**：仅服务端 `k.*` API（不含模板引擎）

## TaskBanner 项目划分

| TaskBanner 项目 | `project_id` | 用途 |
|-----------------|--------------|------|
| **KB-Docs** | `736837a913b24f248d39ff056c198b04` | 本仓库：VitePress 文档、`docs/api`、ai-check、backlog |
| **Kooboo** | `8c4166c325be4c87a2a29700a3bcfc5c` | Kooboo **平台源码**（如 `Kooboo.Sites`、功能开发），**不要**放文档站任务 |

Agent 在本仓库工作时：创建/更新任务只用 **KB-Docs**；查平台行为、改 C# 源码时再关联 Kooboo 项目（或仅在评论里写源码路径）。

### 当前 Sprint（TaskBanner，2026-05-27）

| # | 任务 | displayId |
|---|------|-----------|
| Epic | [Epic] KScript API 文档化（kb-docs） | 1001 |
| P0 | 修复 API 侧边栏 10 个死链 | 1002 |
| P0 | payment 文档收尾并清理 @k-url | 1003 |
| P0 | 修正 getting-started 错误示例 | 1004 |
| P0 | 对齐 api/index.md 与导航结构 | 1005 |
| P1 | k.site.pages 完整文档 + ai-check | 1006 |
| P1 | k.site.layouts 完整文档 + ai-check | 1007 |

### 任务命名建议

```
[模块] 简短标题
例：[k.site] pages.md + ai-check
    [P0] 修复侧边栏死链
    [k.payment] 提交并清理 @k-url
```

### 任务描述模板（粘贴到 TaskBanner `content`）

```markdown
## 模块 ID
k.xxx.yyy

## 文档
- 新：`docs/api/...`
- 旧：`old-source/api/...`
- 源码：`Kooboo/.../*.cs`（只读参考，任务归属 KB-Docs）

## 验收
- [ ] ai-check + curl
- [ ] 文档无 CLI 语法（@k-url、code/）
- [ ] `npm run docs:build`
- [ ] 更新 backlog 本文件对应行

## Backlog
见 `.trellis/spec/kscript-api-backlog.md`
```

## 摘要

| 指标 | 数量 | 说明 |
|------|------|------|
| 顶层 `k.*` 模块（源码公开） | **~35** | 自 `k.cs` 统计，不含 `[KIgnore]` |
| 可拆分子模块（建议单独提交） | **~80+** | commerce 12、payment 动态、site 15+、utils 20+、DB 5、file 3… |
| 已有 `docs/api` 页面 | **41** | 含 payment 未提交稿 |
| 侧边栏死链 | **10** | config 已配但文件不存在 |
| 旧文档可参考 (`old-source/api`) | **~50+** | 未全部迁移 |
| **预估待完成（含子模块）** | **~55–65** | 见下表「待办」 |

### 完成度（粗算）

| 状态 | 模块数 | 含义 |
|------|--------|------|
| ✅ 已文档化 | ~28 | `docs/api` 有正文，commerce 子模块齐全 |
| 🟡 进行中 | ~11 | payment 本地稿未提交；部分仅概述 |
| 🔴 待新建 | ~35+ | 无文档或仅 index/侧边栏占位 |
| ⚪ 内部/低优 | ~8 | `k.openApi`、`k.stapScript`、KIgnore 属性等 |

---

## 来源对照说明

### `kooboo.d.ts` 与源码差异（写文档时以源码为准）

| 项 | d.ts | 源码 `k.cs` | 建议 |
|----|------|-------------|------|
| `k.media` | ❌ 顶层未列出 | ✅ `KMedia Media` | 需补文档与 d.ts 生成流程 |
| `k.user` / `k.organization` | 在 `k.account` 内 | `[KIgnore]` 独立属性 | 文档归 `k.account` |
| `k.sql` / `k.mysql` 等 | 部分在 `KDB` | 多数字段 `[KIgnore]` | 文档写 `k.DB.sqlite` + `k.DB.getDB()` |
| `k.site` 类型名 | `kSiteDb` | `class kSiteDb` | d.ts 可能用别名，以 C# 成员为准 |
| `k.payment` | `kPay` | `Kooboo.Sites.Payment.kPay` + 动态 provider | 提供商列表查 `PaymentContainer` / IOC |

### 顶层 `k` 对象（源码 + d.ts 合并）

| JS 名 | C# 类型 | 文档 | 旧文档 | ai-check | 备注 |
|-------|---------|------|--------|----------|------|
| `k.api` | `KApi` | ✅ | k-api.md | 需核对 | |
| `k.request` | `Request` | ✅ | k-request.md | | |
| `k.response` | `Response` | ✅ | k-response.md | | |
| `k.session` | `Session` | ✅ | k-session.md | | |
| `k.cookie` | `Cookie` | ✅ | k-cookie.md | | |
| `k.security` | `Security` | ✅ | k-security.md | | |
| `k.DB` | `KDB` | ✅ 概述 | k-DB.md | | 子库见下 |
| `k.content` | `KContent` | ✅ | k-content.md | | |
| `k.file` | `FileIO` | ✅ | k-file.md | | 子模块见下 |
| `k.commerce` | `KCommerce` | ✅ + 12 子页 | k-commerce/* | 部分已有 | |
| `k.payment` | `kPay` | 🟡 index+10 提供商 | k-payment.md | 待提交 | 动态 gateway |
| `k.logger` | `KLogger` | ✅ | k-logger.md | | |
| `k.label` / `k.t` | 方法 | ✅ label.md | k-label.md | | |
| `k.site` | `kSiteDb` | 🔴 | k-site/* | | **大模块，宜拆分** |
| `k.page` | `KPage` | ✅ | site/k-page.md | | 与 `k.site.pages` 区分 |
| `k.module` | `KModule` | 🔴 侧边栏 | k-module.md | | 仅模块上下文部分 API |
| `k.net` | `KNET` | ✅ | net/* | | 见子表 |
| `k.mail` | `Mail` | ✅ | business/mail.md | | |
| `k.emailMarketing` | `KEmailMarketing` | 🔴 | k-emailMarketing.md | | |
| `k.account` | `KAccount` | ✅ | k-account.md | | login/user/org/oauth |
| `k.storage` | `KStorage` | ✅ | data/storage.md | | |
| `k.cache` | `KCache` | ✅ | core/cache.md | | |
| `k.template` | `KTemplate` | 🔴 | k-template.md | | 模板市场，非页面模板 |
| `k.market` | `KMarket` | 🔴 | k-market.md | | |
| `k.state` | `kState` | ✅ | core/state.md | | |
| `k.integration` | `KIntegration` | 🔴 | — | | |
| `k.privacy` | `KPrivacy` | 🔴 | — | | cookieConsent |
| `k.analytics` | `kAnalytics` | 🔴 | — | | |
| `k.google` | `KGoogle` | 🔴 | — | | |
| `k.ai` | `KAI` | 🔴 | — | | |
| `k.media` | `KMedia` | ✅ | site/media.md | | |
| `k.utils` | `KUtils` | 🔴 | k-utils/ (空) | | **宜按子工具拆分** |
| `k.inlineEditor` | `KInline` | 🔴 | k-inlineEditor.md | | |
| `k.starter` | `KKoobox` | 🔴 | — | | koobox |
| `fromSite` | 方法 | 🔴 | k-fromSite.md | | |
| `k.openApi` | `KOpenApi` | ⚪ | k-openApi.md | | C# `[KIgnore]`，低优 |
| `k.stapScript` | StapTest | ⚪ | — | | 扩展测试，低优 |
| getting-started/auth | — | 🔴 侧边栏 | — | | 需新建 |

---

## 子模块 Backlog

### 数据 `k.DB`

| ID | 建议文档路径 | 状态 | 源码 |
|----|--------------|------|------|
| `k.DB` 概述 | `docs/api/data/database.md` | ✅ | `KDB.cs` |
| `k.DB.sqlite` | `docs/api/data/sqlite/` | ✅ | `SqliteDatabase.cs` |
| `k.DB.mysql` | `docs/api/data/mysql.md` | 🔴 | `MysqlDatabase.cs` |
| `k.DB.sqlServer` | `docs/api/data/sqlserver.md` | 🔴 | `SqlServerDatabase.cs` |
| `k.DB.mongo` | `docs/api/data/mongo.md` | 🔴 | `KDB.Mongo` |
| `k.DB.indexedDb` / worm | `docs/api/data/indexeddb.md` | 🔴 | `kDatabase` / `KWormDb` |
| `k.DB.getDB(type)` | 合入 database 概述 | 🔴 | `KDB.getDB` |

### 文件 `k.file`

| ID | 文档路径 | 状态 |
|----|----------|------|
| `k.file` | `file/file.md` | ✅ |
| `k.file` 文件夹 | `file/file-folder.md` | ✅ |
| `k.file.resumableUpload` | `file/file-resumable.md` | ✅ |
| 类型 `FileInfo` 等 | `file/file-info.md` | ✅ |

### 电商 `k.commerce`（12 子模块）

| 子模块 | 文档 | 状态 |
|--------|------|------|
| product, category, cart, order, customer | `commerce/*.md` | ✅ |
| discount, address, loyalty, membership | | ✅ |
| shipping, wishlist, currency, settings | | ✅ |

> commerce 首期可标 **完成**；仅需补 ai-check 全覆盖与 `commerce.md` 概述核对。

### 支付 `k.payment`

| ID | 文档 | 状态 | 备注 |
|----|------|------|------|
| `k.payment` 概述 | `payment/index.md` | 🟡 | 工作区未提交 |
| alipay, wechat, paypal, stripe… | `payment/*.md` | 🟡 | 10 篇 |
| wechat H5 流程 | `payment/wechat-h5-flow.md` | 🟡 | 需清理文档内 `@k-url` |
| 动态 `k.payment.get(name)` | 合入 index | 🔴 | 查 `IPaymentMethod` 实现类 |

### 站点 `k.site`（**建议 8–10 次提交**）

源码：`Kooboo.Sites/Scripting/Global/kSiteDb.cs`

| 子模块 (JS) | 建议文档 | 旧文档 | 状态 |
|-------------|----------|--------|------|
| `k.site` 概述 + List/Get/CreateSite | `site/site.md` | k-site/index.md | 🔴 侧边栏 |
| `k.site.pages` | `site/page.md` | k-site/pages.md | ✅ ai-check 已 push |
| `k.site.layouts` | `site/layout.md` | k-site/layouts.md | ✅ ai-check 已 push |
| `k.site.views` | `site/view.md` | k-site/views.md | ✅ |
| `k.site.scripts` | `site/js.md` | k-site/scripts.md | ✅ |
| `k.site.styles` | `site/css.md` | k-site/styles.md | ✅ |
| `k.site.codes` | `site/code.md` | k-site/codes.md | ✅ |
| `k.site.files` | 与 `k.file` 交叉说明 | k-site/files.md | 🔴 |
| `k.site.formValues` | `site/form-values.md` | k-site/formValues.md | 🔴 |
| `k.site.editLog` | `site/edit-log.md` | k-site/editLog.md | 🔴 |
| `k.site.event` | — | — | ⏸️ 已下架：事件在控制台配置，暂不写 KScript 文档 |
| `k.site.labels` | 与 `k.label` 合并或互链 | — | 🔴 |
| `k.site.images` / `htmlBlocks` / `textContent` | 按需拆分 | — | 🔴 P3 |
| `k.site.menus` / `multilingual` / `user` | 按需 | — | 🔴 P3 |

### 页面元数据 `k.page`（当前页）

| ID | 文档 | 状态 |
|----|------|------|
| `k.page` setTitle/setMeta… | `site/k-page.md` | ✅ |

### 模块 `k.module`

| ID | 文档 | 状态 |
|----|------|------|
| `k.module` BaseUrl/Config/Task… | `site/module.md` | 🔴 侧边栏 |

### 网络 `k.net`

| 子模块 | 建议文档 | 旧文档 | 状态 |
|--------|----------|--------|------|
| `k.net.httpClient` | `net/httpclient.md` | k-net/httpClient.md | ✅ |
| `k.net.webSocket` | `net/websocket.md` | k-net/webSocket.md | ✅ |
| `k.net.url` (Curl) | `net/url.md` | k-net/url.md | ✅ |
| `k.net.DNS` | `net/dns.md` | k-net/DNS.md | ✅ |
| `k.net.IP` | `net/ip.md` | k-net/IP.md | ✅ |

### 工具 `k.utils`（**建议按子目录多次提交**）

d.ts `KUtils` 子属性 → 每项可独立一篇或合并为 3–4 组：

| 子模块 | 分组建议 | 优先级 |
|--------|----------|--------|
| `xml`, `uri`, `string`/`date`, `compression` | utils/基础 | P2 |
| `clientJS`, `dom`, `inlineHtml`, `image`, `screenShot` | utils/Web | P2 |
| `sms`, `office`, `sitemap` | utils/集成 | P3 |
| `community`, `CRM`, `CDN` | utils/业务 | P3 |
| `sshClient`, `sftpClient`, `telnetClient`, `puppeteer` | utils/远程 | P3 |
| `google`, `template`, `ninjible`, `IP` | utils/第三方 | P3 |
| `sleep`, `ping`, `bytesToString`… | 合入 utils 根文档 | P2 |

### 业务 / 运营类

| 模块 | 建议路径 | 旧文档 | 优先级 |
|------|----------|--------|--------|
| `k.mail` | `business/mail.md` | k-mail.md | ✅ |
| `k.emailMarketing` | `business/email-marketing.md` | k-emailMarketing.md | P2 |
| `k.account` | `account/index.md` + login/user/org/oauth | k-account.md | ✅ |
| `k.storage` | `data/storage.md` | k-storage.md | ✅ |
| `k.cache` | `core/cache.md` | k-cache.md | ✅ |
| `k.template` (商店) | `store/template.md` | k-template.md | P3 |
| `k.market` | `store/market.md` | k-market.md | P3 |
| `k.state` | `core/state.md` | k-state.md | ✅ |
| `k.integration` | `integration/index.md` | — | P3 |
| `k.privacy` | `privacy/index.md` | — | P3 |
| `k.analytics` | `analytics/index.md` | — | P3 |
| `k.google` | `integration/google.md` | — | P3 |
| `k.ai` | `ai/index.md` | — | P3 |
| `k.media` | `site/media.md` | — | ✅ |
| `k.inlineEditor` | `editor/inline.md` | k-inlineEditor.md | P3 |
| `k.starter` | `koobox/starter.md` | — | P3 |

### 入门与其它

| 项 | 路径 | 状态 |
|----|------|------|
| 快速开始 | `getting-started/index.md` | ✅ 需修 async/ctx 示例 |
| 认证与授权 | `getting-started/auth.md` | 🔴 死链 |
| API 索引 | `api/index.md` | 🟡 部分链向未建页 |

---

## 建议执行顺序（P0 → P3）

### P0 — 结构与债务（1–2 次提交）

1. 修复 **10 个侧边栏死链**（或暂从 config 移除）
2. 统一 `api/index.md` 与 `file` 路径（`k.file` 不在 `site/`）
3. 提交/审阅 **payment** 文稿，清理 `@k-url`
4. 修正 **getting-started** 中错误 `async/ctx` 示例

### P1 — 高频站点 / 网络（按子模块提交）

5. `k.site` 概述 → pages → layouts → views → scripts/styles → codes → event…
6. `k.net.httpClient` → webSocket → url

### P2 — 数据扩展与业务

7. `k.DB.mysql` / sqlServer / mongo（若产品仍支持）
8. `k.mail`, `k.emailMarketing`, `k.account`, `k.storage`
9. `k.utils` 基础组 + Web 组

### P3 — 长尾

10. analytics, privacy, ai, media, integration, koobox…

---

## 每个模块的标准工单（复制到 task notes）

```text
模块 ID:
源码: Kooboo/.../*.cs
d.ts: old-source/kooboo.d.ts (核对)
旧文档: old-source/api/...
新文档: docs/api/...
ai-check: old-source/kb-doc/src/api/ai-check/k-{module}-test.ts
验证: curl https://kb-doc.redev.cn/api/ai-check/...
DoD: 文档无 @k-url / code/ 路径；build 通过；侧边栏无死链
```

---

## TaskBanner 集成（MCP `user-TaskBanner`）

### 项目

| 字段 | 值 |
|------|-----|
| 项目名 | **Kooboo** |
| `project_id` | `8c4166c325be4c87a2a29700a3bcfc5c` |

> 现有任务 #1001–#1007 多为 `references/K-Script/utils/`（另一文档树）。**kb-docs** 任务标题建议前缀：`[kb-docs]`，避免与旧路径混淆。

### 三层分工（避免重复记账）

| 层 | 工具 | 用途 |
|----|------|------|
| 战略 / 全量清单 | 本文件 `kscript-api-backlog.md` | 模块矩阵、优先级、DoD、源码对照 |
| 会话 / 规范 | Trellis `task.py` + `api-documentation-workflow.md` | 分支、journal、流程约束 |
| 执行 / 看板 | **TaskBanner** | 当前在做哪一项、review、阻塞讨论 |

### 推荐任务粒度

- **Epic（1 条）**：`[kb-docs] KScript API 文档化` → content 链到本 backlog
- **可交付（每条 = 一次 PR）**：`[kb-docs] k.site.pages` / `[kb-docs] P0: 侧边栏死链`
- **不在 TaskBanner 建 80 条**：子模块按需创建；完成后再建下一条

### 状态与 Agent 约定

| TaskBanner | 含义 | Agent 动作 |
|------------|------|------------|
| `todo` | 未开始 | 仅规划 |
| `in_progress` | 当前模块 | 写文档 + ai-check；会话开始 `k_update_task` |
| `review` | 文稿/PR 待你看 | **不自动 commit/push** |
| `completed` | 已合并且 curl 通过 | `k_add_comment` 附验证摘要；同步改本 backlog 表 |

完成时评论模板：

```markdown
## 完成
- 文档: `docs/api/...`
- ai-check: `ai-check/k-xxx-test.ts`
- curl: （关键 URL + 结果摘要）
- 备注: （阻塞/需你确认的点）
```

### MCP 常用调用

```text
k_list_projects          → 取 project_id / module_ids / tag_ids
k_list_tasks             → project_id=8c4166c325be4c87a2a29700a3bcfc5c, status=todo
k_create_task            → 新建 [kb-docs] 模块任务
k_update_task            → status / progress / content
k_add_comment            → ai_completion 记录验证结果
```

### 优化建议（TaskBanner / 流程）

1. **在 Kooboo 项目下配置 modules**（如 `core` / `data` / `site` / `net` / `utils`），创建任务时填 `module_ids`，看板可按域筛选。（当前 `modules: []` 为空）
2. **配置 tags**：`p0-debt` `needs-check` `blocked` `d.ts-gap`，便于过滤。
3. **标题规范**：`[kb-docs] <k.path> — <动作>`，例如 `[kb-docs] k.net.httpClient — 文档+ai-check`。
4. **content 固定四段**：目标 / 源码路径 / 验收（DoD）/ TaskBanner task_id 写回 backlog 可选。
5. **单进行中的 `in_progress`**：同一时期只标 1 条 in_progress，减少并行混乱。
6. **阻塞用 assignee + comment**：行为不确定时 `review` + `k_add_comment` @你，而不是在 loop 里硬试。

---

## 维护

- 完成模块后在本文件将对应行 `🔴` → `✅`，并注明 commit / ai-check / **TaskBanner #displayId**
- 发现 d.ts 与源码不一致时，在「来源对照」表追加一行，**文档以源码为准**
- Kooboo 源码路径：`/Users/achen/Priv/Yardi/Kooboo/`（本机）；协作者需自行 clone
