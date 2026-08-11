# Journal - wg (Part 1)

> AI development session journal
> Started: 2026-03-24

---



## Session 1: k-query 文档重构 & k.logger 文档更新

**Date**: 2026-04-15
**Task**: k-query 文档重构 & k.logger 文档更新

### Summary

(Add summary)

### Main Changes

## 完成的工作

### 1. k-query 文档重构
- **位置**: `docs/templateEngine/k-query.md`
- **新增 Commerce 查询**: product/list, product/item, category/list, category/item, cart/item, order/item
- **新增多语言查询**: culture/list, culture/get
- **新增键值查询**: keyValue/item
- **新增菜单查询**: menu/item
- **新增 IndexedDB 查询**: indexeddb/page, list, item
- **同步更新**: Kooboo 源码中的文档 (`Kooboo.Sites/AI/Skills/packages/kooboo-coding/references/Frontend/k-query.md`)

### 2. k.logger 文档更新
- **位置**: `docs/api/logger/k-logger.md`
- 添加 message 参数类型提示（需要 JSON.stringify 转换对象）
- 添加后台查看路径提示：**开发 → 代码日志**

### 3. VitePress 配置修复
- **位置**: `docs/.vitepress/config.mts`
- 修复 sidebar 链接从 `/k-query.md` → `/templateEngine/k-query.md`
- 新增 `templateEngine/index.md` 避免 404

### 4. 测试验证
- 创建 k-query 测试页面 `k-query-test.html`
- 通过 curl 验证 commerce 查询正常工作

**更新的文件**:
- `docs/templateEngine/k-query.md`
- `docs/templateEngine/index.md`
- `docs/api/logger/k-logger.md`
- `docs/.vitepress/config.mts`
- `old-source/kb-doc/src/page/k-query-test.html`
- `Kooboo/.../k-query.md`


### Git Commits

| Hash | Message |
|------|---------|
| `d4de740` | (see git log) |
| `2d4da97` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: 补全 k.DB.sqlite API 文档并通过 curl 验证

**Date**: 2026-04-16
**Task**: 补全 k.DB.sqlite API 文档并通过 curl 验证

### Summary

根据 Kooboo 源码（SqliteDatabase.cs / RelationalDatabase.cs / kooboo.d.ts）补全了 k.DB.sqlite 文档，新增 getTables / getTable / operators / transaction 四个方法说明，移除了不适用的 procedure。同步更新了 k.DB 总览页的 SQLiteDB 类型定义。编写并推送了 ai-check 测试接口（k-db-test.ts），通过 curl 验证全部 9 个 action 均正常返回。

### Main Changes

- Added environment-gated VitePress edit links based on the real `PageData.filePath`.
- Added the authenticated, read-only Vue editor and hardened Node document service.
- Added editor and preview systemd deployment configuration, tests, and operations guidance.
- Deployed `codex/docs-editor-phase2` to kbdev on ports 4173 and 4174.

### Git Commits

(No commits - planning session)

### Testing

- [OK] 10 focused Node tests passed before deployment; the installer regression test added later also passed.
- [OK] Vue editor production build and VitePress public/internal builds passed.
- [OK] Public builds contained no internal edit link; Chinese and English internal links were verified.
- [OK] Server authentication, document metadata, preview status, logout, browser navigation, and console checks passed.
- [OK] `kb-docs-preview`, `kb-docs-preview-sync.timer`, `kb-docs-editor`, and `Kooboo.Web` remained active.

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: 补全 k.DB.sqlite API 文档并通过 curl 验证

**Date**: 2026-04-16
**Task**: 补全 k.DB.sqlite API 文档并通过 curl 验证

### Summary

根据 Kooboo 源码补全 k.DB.sqlite 文档，新增 getTables / getTable / operators / transaction，移除 procedure。同步更新 k.DB 总览页。推送并通过 curl 验证全部 9 个 action。

### Main Changes



### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: 补全 k.DB.sqlite API 文档并通过 curl 验证

**Date**: 2026-04-16
**Task**: 补全 k.DB.sqlite API 文档并通过 curl 验证

### Summary

根据 Kooboo 源码补全 k.DB.sqlite 文档，新增 getTables/getTable/operators/transaction，移除 procedure。同步更新 k.DB 总览页。推送并通过 curl 验证全部 9 个 action。

### Main Changes

- docs/api/data/sqlite/index.md
- docs/api/data/database.md
- old-source/kb-doc/src/api/ai-check/k-db-test.ts

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

## Session: Update AI Claw product docs

**Date**: 2026-08-04
**Task**: AI Claw / AI Chat documentation refresh

### Summary

对照 Frontend 新版 AI Claw UI，按 CMS 文档 SOP 重写产品文档并刷新截图。

### Main Changes

- docs/product/ai-chat.md — 重写：右侧工作区、执行策略、数据/设计/设置面板
- docs/product/ai-floating-assistant.md — 对齐执行策略、可移动/缩放浮窗，并移除已下线的侧栏模式
- docs/index.md — 首页描述更新
- docs/public/product/ai-chat/* — 新截图
- scripts/product-ai-screenshots.mjs — 适配新 UI 捕获流程

### Git Commits

docs(product): 更新 AI Claw 文档与截图

### Testing

- [OK] 本机 localhost Admin 登录后核对 AI Claw 各 tab
- [OK] Playwright 采集 overview / fix / task / data / design / settings / code 截图
- [OK] node --check scripts/product-ai-screenshots.mjs

### Status

[OK] **Completed**

### Next Steps

- 用户确认后可 git commit；push 需二次确认


## Session 5: Deploy Phase 2 documentation editor

**Date**: 2026-08-11
**Task**: Deploy Phase 2 documentation editor

### Summary

Implemented and deployed environment-gated VitePress edit links plus an authenticated read-only Vue editor on kbdev; verified Git sync, release status, path security, browser navigation, and Kooboo.Web isolation.

### Main Changes



### Git Commits

| Hash | Message |
|------|---------|
| `3b1ae44` | (see git log) |
| `abc9cf0` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
