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

截图来源三选一（详见 `.trellis/spec/documentation-images.md`）：

1. **Playwright 脚本**（可复现、适合批量）：`pnpm screenshots:cms:site` 等  
2. **Cursor Browser**（已登录后台时交互截图）  
3. **本机 Chrome + cdp-bridge**

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
  → stabilize-vitepress-dist（去掉资源文件名 hash，避免全站 HTML 联动）
  → export-vitepress-to-kooboo（写入 kb-remote-site/src/）
  → 同步 docs/public 配图 → kb-remote-site/images/
```

Kooboo Page 的 `@k-url` 保留 `index.html` 路径，例如 `<!-- @k-url /cms/index.html -->`，避免 Page API 400。目录 URL（`/cms/`）由远端 **Request Hook** 处理。

## 4. 部署到 Kooboo

### 4.1 推荐流程（增量）

```bash
git pull                                    # 拿到最新 last-manifest.json
# … 修改 docs …
pnpm docs:deploy:kooboo:dry-run             # 查看将 push 的文件
pnpm docs:deploy:kooboo                     # 构建 + 增量 kb push + 更新 manifest
git add docs/ .kooboo-deploy/last-manifest.json
git commit -m "docs: ..."
git push
```

改**一篇**文档时，通常只会 push 少量文件（例如该页 HTML、对应 `.lean.js`、本地搜索索引），而不是全站 2000+ 资源。

### 4.2 相关命令

| 命令 | 作用 |
|------|------|
| `pnpm docs:build:kooboo` | 仅构建并导出到 `kb-remote-site`，不 push |
| `pnpm docs:deploy:kooboo` | 构建 + manifest diff + `kb push` + 更新 manifest |
| `pnpm docs:deploy:kooboo:dry-run` | 不 push，只打印计划 |
| `pnpm docs:manifest:diff` | 已构建前提下，只看与 baseline 的差异 |
| `pnpm docs:manifest:refresh` | 只根据当前 `kb-remote-site` 重写 manifest（不 push） |
| `pnpm docs:sync-images` | 仅把 `docs/public` 配图复制到 `kb-remote-site/images` |

仅改配图、未改 Markdown 时：

```bash
pnpm docs:sync-images
cd kb-remote-site && kb push images/cms/某目录
# 并更新 manifest：pnpm docs:manifest:refresh --skip-build
```

### 4.3 共享 manifest（多人协作）

- 文件：`.kooboo-deploy/last-manifest.json`（**纳入 Git**）
- 含义：上次**成功部署到共享远端**的资源 SHA256 快照，含 `gitCommit`、`gitBranch`
- 每人 deploy 成功后都应 **commit 此文件**，否则同事会重复 push 或基线错乱

**merge 冲突**：两人都在各自分支部署并改了 manifest 时

1. 先解决 `docs/` 内容冲突  
2. `pnpm docs:build:kooboo`  
3. `pnpm docs:deploy:kooboo` 推到远端  
4. 以 deploy 生成的新 manifest 为准提交  

若远端已是最新、只需对齐 Git： `pnpm docs:manifest:refresh`。

### 4.4 删除页面或资源

manifest 会列出 `removed` 项，但 **不会自动删远端**。需要时用 Kooboo CLI 对账清理：

```bash
cd kb-remote-site
kb check -o check-report.json
kb prune --report check-report.json        # 预览
kb prune --report check-report.json --yes # 确认后删除远端多余资源
```

## 5. 路由 Hook（RouteFinding）

VitePress 侧栏使用 `/cms/` 等形式；Kooboo Page 绑定的是 `/cms/index.html`。在站点后台配置 **请求 Hook → RouteFinding → DO**：

```typescript
// VitePress 目录页：/cms/ → /cms/index.html
const url = k.event.url

const slash = url.lastIndexOf('/')
const dot = url.lastIndexOf('.')
if (dot > slash) {
  return
}

if (url === '/') {
  k.event.url = '/index.html'
  return
}

if (url.endsWith('/')) {
  k.event.url = url + 'index.html'
  return
}

if (url.length > 1) {
  k.event.url = url + '/index.html'
}
```

同时开启：**站点设置 → 高级 → 请求 Hook**，以及 Hook 列表页右上角 **Hook 开启**。

## 6. 侧栏 / 配置大改

修改 `docs/.vitepress/config.mts` 可能影响全站 JS 或搜索索引，deploy 时 push 量会变大，属正常现象。改完后务必 `pnpm docs:build` 再部署。

## 7. 测试脚本（维护工具）

```bash
pnpm test:export:kooboo
pnpm test:kooboo-manifest
pnpm test:stabilize-vitepress
```

修改 `scripts/export-vitepress-to-kooboo.mjs`、`kooboo-manifest.mjs` 等后请跑一遍。

## 8. 职责分工建议

| 操作 | 谁来做 | 是否 commit manifest |
|------|--------|----------------------|
| 改单篇文档 | 作者 | 是（deploy 后） |
| 改侧栏/导航 | 维护者 | 是 |
| 全量重建 / 换站点 | 维护者牵头 | 是（全量后 refresh） |
| 仅本地预览 | 任何人 | 否 |

## 9. 相关内部文档

- 配图细则：`.trellis/spec/documentation-images.md`
- CMS 文档工作流：`.trellis/spec/cms-documentation-workflow.md`
- API 文档工作流：`.trellis/spec/api-documentation-workflow.md`
- 环境安装： [setup.md](setup.md)
