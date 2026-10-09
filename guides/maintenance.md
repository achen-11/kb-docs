# 文档站维护指南

日常改文档、配图、侧边栏、构建与 **增量部署** 到 Kooboo 的流程说明。

## 1. 文档在哪里

| 路径 | 内容 |
|------|------|
| `docs/` | 所有对外文档 Markdown |
| `docs/en/` | 英文版（与中文版路径对应） |
| `docs/.vitepress/config.mts` | 侧栏、导航、`rewrites`、Vite 构建选项 |
| `docs/public/` | 静态文件（截图等），URL 对应站点根路径 |

主要栏目与侧栏在 `config.mts` 的 `cmsSidebar`、`apiSidebar`、`guideSidebar` 等中维护。新增页面后记得把链接加进侧栏。

## 2. 写文档

### 2.1 基本约定

- 链接优先**省略扩展名**：`[页面](/cms/site/pages)`，与 VitePress 一致。
- 中文为默认语言；英文放在 `docs/en/...`，侧栏在 `config.mts` 的 `enSidebar`。
- API 文档遵循 `.trellis/spec/api-documentation-workflow.md`（无 `@k-url`、无 `code/` 路径等）。

### 2.2 配图

| 仓库路径 | 文中引用示例 |
|----------|----------------|
| `docs/public/cms/site/foo.png` | `/cms/site/foo.png` 或 `<DocImage src="..." />` |

推荐组件（带边框、可点击放大，仅 VitePress 本地/dev 有效）：

```markdown
<DocImage src="/cms/site/pages-list.png" alt="页面列表" width="1120" />
```

截图来源（详见 `.trellis/spec/documentation-images.md`）：

1. **`@chrome` / 本机 Chrome 操作**（推荐）：复用已登录后台的 Chrome 标签，完成交互和截图
2. **Browser 面板**：适合临时查看、点按和补充截图
3. **既有批量截图脚本**：仅用于维护旧截图批处理，不作为新文档默认采集方式

配图文件 **提交到 Git**；部署时复制到 `kb-remote-site/images/` 再 push。

### 2.3 本地检查

```bash
pnpm docs:dev              # 目视检查排版与图片
pnpm docs:build            # 确保能完整构建
pnpm check:dead-links      # 死链扫描
```

## 3. 构建与导出原理（简）

```text
docs/*.md
  → vitepress build
  → docs/.vitepress/dist
  → stabilize-vitepress-dist（固定全局入口、外置运行时数据，并将页面模块 hash 统一为 stable）
  → export-vitepress-to-kooboo（写入 kb-remote-site/src/）
  → 同步 docs/public 配图 → kb-remote-site/images/
```

Kooboo Page 的 `@k-url` 保留 `index.html` 路径，例如 `<!-- @k-url /cms/index.html -->`，避免 Page API 400。导出器会把 VitePress 的站内相对链接、目录链接和无扩展名链接转换为实际 Page URL（例如 `/cms/index.html`、`/cms/site/pages.html`），因此站内导航不依赖 Request Hook。

构建产物必须遵守以下稳定 URL 契约：

```text
/assets/releases/<release>/vitepress-app.js
/assets/releases/<release>/vitepress-style.css
/assets/releases/<release>/vitepress-runtime-data.js
/assets/releases/<release>/<page>.md.stable.js
/assets/releases/<release>/<page>.md.stable.lean.js
```

页面模块不能直接去掉 hash 段。VitePress 运行时会根据 `window.__VP_HASH_MAP__` 拼接模块文件名，因此 stabilizer 必须同时重写物理文件名、`content-file/hashmap.json` 和公共 `/assets/releases/<release>/vitepress-runtime-data.js`。页面 HTML 只引用这份公共 Script，不再重复内联全站 hash map 和 site data。完整规则见 `.trellis/spec/kooboo-docs-deployment-sop.md`。

## 4. 部署到 Kooboo（artifact 分支 + `kb deploy`）

导出器默认根据资源内容生成 `<release>`，所有运行时资源发布到 `/assets/releases/<release>/`。先执行并完整验证资源计划，再执行页面计划；保留旧版本资源以支持页面逐步切换和回滚。同一版本路径不得覆盖为不同内容。每次发布固定 plan、源快照和 receipt，失败时只用原计划恢复。

页面的 canonical 通过 `@k-canonical` 导出指令写入 Kooboo Page 的 `customHeader`，保留其他自定义头部；验收需检查公开 HTTP 中实际输出的 canonical。生产发布必须锁定现有 Site ID，不创建站点或换绑域名。

### 4.1 两个仓库状态

发布流程使用两个独立 Git 状态：

- `kb-docs/main`：Markdown、VitePress 配置和图片源码。
- artifact 分支或独立 worktree：只保存最终 Kooboo 资源，例如 `src/page`、`src/js`、`src/css`、`content-file` 和 `images`。

artifact worktree 必须与 `kb-docs` 分开。脚本不会创建分支、提交 commit 或修改部署基线。

首次使用时准备一个已经初始化的 artifact worktree，并设置：

```bash
export KOOBOO_ARTIFACT_DIR=/absolute/path/to/kb-docs-kooboo-artifact
```

该目录需要是 Git worktree 根目录，并自行配置 `.env`。`.env` 和 `.kooboo/` 会被排除，不进入 artifact commit。

### 4.2 推荐流程

```bash
# … 修改 docs …
pnpm docs:artifact:prepare                  # 构建并同步最终资源到 artifact worktree

# 在 artifact worktree 中检查并提交生成资源；由人工或 CI 完成 Git 操作

export KOOBOO_DEPLOY_FROM=<last-successful-artifact-commit>
export KOOBOO_DEPLOY_TO=<candidate-artifact-commit>
pnpm docs:deploy:kooboo:dry-run             # 生成并预览部署计划
pnpm docs:deploy:kooboo:exact                # 按已审核的固定计划精确上传、校验并生成回执

# 回执成功后仍必须验证真实 HTTP 路由和浏览器水合
KOOBOO_VERIFY_URL=https://docs.localkooboo.com pnpm docs:verify:kooboo
```

`dry-run` 生成 `.kooboo/deploy-plan.json` 后，先核对目标站点 ID、plan digest、操作数量和每项 hash。审核通过后必须执行这同一份计划，不能在失败后重新生成计划。若计划包含删除，执行 exact 时追加 `--apply-deletes`。

发布中断或部分失败时，保留原 plan 和 `.kooboo/deploy-receipt.json`，使用：

```bash
pnpm docs:deploy:kooboo:exact -- --resume
```

`--resume` 会校验 plan digest，并跳过回执中已成功的操作，只重试失败或未完成项。不要重新执行已经成功的全量资源。

CLI 对比的是上一次确认成功的 artifact commit 与本次 candidate commit，不依赖工作目录，也不是只看 candidate 的父 commit。部署成功后，CI 或发布人才能推进 `KOOBOO_DEPLOY_FROM` 对应的部署基线。

默认回执保存在 artifact worktree 的 `.kooboo/deploy-receipt.json`。只要上传、删除或变更资源校验存在失败，命令都会返回非零退出码，部署基线不得推进。

`Push success`、部署回执或 `kb check --level 1` 都不能单独证明站点可运行。曾出现远端资源对象与 `routeName` 均存在、CLI 也显示 `in_sync`，但 `/assets/app.js`、`/assets/style.css` 实际仍为 404。必须以 `docs:verify:kooboo` 的真实 HTTP 与浏览器结果作为最终发布闸门。

### 4.3 相关命令

| 命令 | 作用 |
|------|------|
| `pnpm docs:build:kooboo` | 仅构建并导出到 `kb-remote-site`，不 push |
| `pnpm docs:artifact:prepare` | 构建、导出并镜像到 artifact worktree，不提交、不部署 |
| `pnpm docs:artifact:prepare:skip-build` | 已完成导出时只同步 artifact worktree |
| `pnpm docs:deploy:kooboo:dry-run` | 根据 artifact commit range 生成计划，不写远端 |
| `pnpm docs:deploy:kooboo` | 调用 `kb deploy` 执行计划并生成回执 |
| `pnpm docs:deploy:kooboo:exact` | 执行已审核的固定计划，不调用全量远端 inventory |
| `pnpm docs:deploy:kooboo:legacy` | 旧 manifest 发布器，仅用于迁移期应急 |
| `pnpm docs:verify:kooboo` | 检查关键资源、页面水合、所有 HTTP 失败和浏览器错误 |
| `pnpm docs:sync-images` | 仅把 `docs/public` 配图复制到 `kb-remote-site/images` |

仅改配图、未改 Markdown 时：

```bash
pnpm docs:sync-images
pnpm docs:artifact:prepare:skip-build
# 提交 artifact 变更后走同一套 dry-run / deploy 流程
```

### 4.4 部署基线与多人协作

- artifact commit 是可审计的完整部署产物。
- `KOOBOO_DEPLOY_FROM` 必须指向最后一次收到成功回执的 artifact commit。
- `KOOBOO_DEPLOY_TO` 指向本次 candidate commit，未设置时脚本使用 artifact worktree 的 `HEAD`。
- 同一站点只允许一个发布者同时运行；CI 应配置 concurrency group。
- 失败时保留 plan 和 receipt，但不得推进已部署基线。使用同一 plan 执行 `docs:deploy:kooboo:exact -- --resume`，只补偿失败项。
- 图片较多时默认从 `--concurrency 2` 开始；本地实测并发 5 会触发 `Upload/Image: Collection was modified`，确认目标环境稳定后再提高。

`.kooboo-deploy/last-manifest.json` 与 `docs:manifest:*` 仅保留给旧方案迁移和诊断。它们不能证明远端发布成功，不再作为推荐部署基线。

### 4.5 删除页面或资源

Git range 中的删除会进入部署计划，但实际执行前必须显式批准：

```bash
pnpm docs:deploy:kooboo:dry-run
pnpm docs:deploy:kooboo:exact -- --apply-deletes
```

CLI 会先上传支撑资源，再上传 Page；只有所有 upsert 成功后才执行删除。首页等受保护资源仍需按 CLI 的保护规则处理。命名迁移产生的旧页面模块必须等新版本通过 `docs:verify:kooboo` 后再精确清理，禁止在验收前宽范围 prune。

## 5. 路由 Hook（RouteFinding）

导出后的站内链接已经指向 `/cms/index.html` 等实际 Page URL。若还希望用户直接输入、收藏或从外部访问 `/cms/` 这类简洁目录 URL，则在站点后台配置 **请求 Hook → RouteFinding → DO**：

```typescript
// VitePress 目录页：/cms/ → /cms/index.html
const url = k.event.url || '/'

if (url !== '/' && url.endsWith('/')) {
  const lastSlash = url.lastIndexOf('/')
  const lastDot = url.lastIndexOf('.')

  if (lastDot <= lastSlash) {
    k.event.url = url + 'index.html'
  }
}
```

同时开启：**站点设置 → 高级 → 请求 Hook**，以及 Hook 列表页右上角 **Hook 开启**。

## 6. 侧栏 / 配置大改

修改 `docs/.vitepress/config.mts` 可能影响全站 JS 或搜索索引，deploy 时 push 量会变大，属正常现象。改完后务必 `pnpm docs:build` 再部署。

## 7. 快速发布的判定与排障

### 7.1 先看计划规模

版本目录发布中，单篇文档改变也可能生成新 `<release>`，因此完整资源集和引用它们的页面都会进入计划。先检查版本路径和计划范围，再执行分阶段上传与验证。

如果约 210 个 Page 都发生变化，确认是资源版本切换带来的引用变化；同时检查运行时数据没有重新内联进每个 HTML。固定完整快照后再发布。

### 7.2 `Page/all` 失败不是一律增加 timeout

- 如果请求等待到客户端 timeout 才结束，可以适当增加 `--timeout` 继续取证。
- 如果请求在 1 秒内快速返回 HTTP 400 `Arg_NullReferenceException`，增加 timeout 无效，通常表示远端 Page、Route 或 Relation 清单存在异常。
- 对照测试中，纯净本地站点包含 211 个 Page 时，`Page/all` 约 134ms 成功返回。因此 Page 数量会放大异常概率，但不是本次故障的直接原因。

遇到快速 400 时，停止依赖全量 inventory，锁定已经审核的 plan digest、站点 ID 和操作 hash，改用 `docs:deploy:kooboo:exact`。exact 路径按精确名称和原 ID 更新资源，不调用 `Page/all`；失败后用 `--resume` 继续。

### 7.3 不推进基线的条件

以下任一情况发生时，保留 plan 与 receipt，不得更新 last-successful artifact commit：

- 写入、删除或 SHA-256 回读存在失败；
- plan digest 或目标站点 ID 不一致；
- 真实 HTTP 出现 4xx/5xx；
- VitePress 未水合、浏览器 console/page error；
- 点击搜索并查询 `k.net` 没有结果。

## 8. 测试脚本（维护工具）

```bash
pnpm test:export:kooboo
pnpm test:kooboo-manifest
pnpm test:kooboo-artifact
pnpm test:stabilize-vitepress
```

修改 `scripts/export-vitepress-to-kooboo.mjs`、`kooboo-manifest.mjs` 等后请跑一遍。

部署后还必须运行：

```bash
KOOBOO_VERIFY_URL=https://docs.localkooboo.com pnpm docs:verify:kooboo
```

该检查必须覆盖全局 JS/CSS、页面模块、VitePress 水合、全部 4xx/5xx、控制台 error 和未捕获异常，不能只确认 Page 返回 200。

## 9. 职责分工建议

| 操作 | 谁来做 | 是否 commit manifest |
|------|--------|----------------------|
| 改单篇文档 | 作者 | 提交 docs；artifact 由发布者生成 |
| 改侧栏/导航 | 维护者 | 提交 docs；artifact 由发布者生成 |
| 生成 artifact commit | CI 或唯一发布者 | 是 |
| 执行远端部署 | CI 或唯一发布者 | 成功后推进 deployed baseline |
| 仅本地预览 | 任何人 | 不生成 artifact commit |

## 10. 相关内部文档

- 配图细则：`.trellis/spec/documentation-images.md`
- CMS 文档工作流：`.trellis/spec/cms-documentation-workflow.md`
- API 文档工作流：`.trellis/spec/api-documentation-workflow.md`
- Kooboo 发布与线上验收：`.trellis/spec/kooboo-docs-deployment-sop.md`
- 环境安装： [setup.md](setup.md)
