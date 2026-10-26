# 环境安装与本地开发

面向第一次参与 **kb-docs** 的同事：从 clone 到本地预览、具备部署能力。

## 1. 前置要求

| 工具 | 版本建议 | 用途 |
|------|----------|------|
| [Node.js](https://nodejs.org/) | 20 LTS 或更高 | 运行 VitePress 与脚本 |
| [pnpm](https://pnpm.io/) | 10.x（见 `package.json` 的 `packageManager`） | 包管理 |
| [Kooboo CLI](https://www.kooboo.com)（`kb`） | 最新稳定版 | 部署到远端站点 |
| Git | 任意较新版本 | 文档源码和 artifact 部署历史 |

安装 pnpm（若尚未安装）：

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
```

安装 Kooboo CLI 后确认：

```bash
kb --help
```

## 2. 克隆仓库

```bash
git clone <仓库地址> kb-docs
cd kb-docs
pnpm install
```

## 3. 环境变量

### 3.1 仓库根目录 `.env`（可选）

用于少量既有批量截图脚本登录 Kooboo 后台。本地开发文档本身不依赖此文件；新文档配图和最佳实践验收优先使用 `@chrome` / 本机 Chrome 操作。

```bash
cp .env.example .env
# 编辑 KOOBOO_USER、KOOBOO_PASS
```

如确需维护旧批量截图脚本，按对应脚本依赖另行准备；新文档配图不要把该路径作为默认流程。

### 3.2 artifact worktree `.env`（部署必需）

`kb-remote-site/` 是构建过程中的临时 Kooboo 导出目录，不再承担部署历史。正式部署在独立 artifact Git worktree 中执行，`kb deploy` 在该目录读取凭据。

```bash
export KOOBOO_ARTIFACT_DIR=/absolute/path/to/kb-docs-kooboo-artifact
cp kb-remote-site/.env.example "$KOOBOO_ARTIFACT_DIR/.env"
# 向团队索取文档站的 URL、用户名、密码并填入
```

artifact 目录必须是独立 Git worktree 根目录；脚本不会自动创建分支或 commit。`.env` 和 `.kooboo/` 默认不会进入 artifact commit。

若需要类型定义，可以在 artifact worktree 中执行：

```bash
cd "$KOOBOO_ARTIFACT_DIR"
kb pull type    # 生成 kooboo.d.ts
```

## 4. 本地开发（VitePress）

```bash
pnpm docs:dev
```

要在本地同时看中文，用 `DOCS_PREVIEW_ZH=1`。中文页面在 `/zh/`，例如 `http://localhost:5173/zh/cms/manual/edit-page`。这个变量只在 `vitepress dev` 生效；`pnpm docs:build` 和部署会忽略它，站点仍然只发布英文。

```bash
DOCS_PREVIEW_ZH=1 pnpm docs:dev
# 或
pnpm docs:dev:zh
```

浏览器打开终端提示的地址（通常 `http://localhost:5173`）。

- 文档源文件在 `docs/`，改 Markdown 会热更新。
- 配图放在 `docs/public/`，文中用根路径引用，例如 `/cms/site/pages.png`（**不要**写 `/public/...`）。

本地预览 **不包含** Kooboo 上的 Request Hook 路由重写；若站点启用了简洁目录 URL，再到部署后的远端站点验证 `/cms/` 等地址。

构建检查（不部署）：

```bash
pnpm docs:build
pnpm docs:preview   # 预览构建产物
```

## 5. 准备 artifact 部署历史

构建生成资源后，将它们镜像到 artifact worktree：

```bash
pnpm docs:artifact:prepare
```

检查并提交 artifact worktree。部署时需要两个 commit：

- `KOOBOO_DEPLOY_FROM`：最后一次确认部署成功的 artifact commit。
- `KOOBOO_DEPLOY_TO`：本次准备部署的 candidate commit，默认可使用 artifact `HEAD`。

旧 `.kooboo-deploy/last-manifest.json` 只用于迁移期诊断，不能作为远端成功证据。

## 6. 首次部署（可选）

在确认 artifact worktree `.env` 正确，并已经提交 candidate artifact 后：

```bash
export KOOBOO_DEPLOY_FROM=<last-successful-artifact-commit>
export KOOBOO_DEPLOY_TO=<candidate-artifact-commit>

# 先生成计划，不写远端
pnpm docs:deploy:kooboo:dry-run

# 确认站点 ID、plan digest、操作数量和 hash 后，执行同一份固定计划
pnpm docs:deploy:kooboo:exact

# 计划包含删除时必须显式批准
pnpm docs:deploy:kooboo:exact -- --apply-deletes

# 中断或部分失败后保留原 plan/receipt，只重试未完成项
pnpm docs:deploy:kooboo:exact -- --resume
```

计划默认位于 artifact worktree 的 `.kooboo/deploy-plan.json`，成功回执位于 `.kooboo/deploy-receipt.json`。`exact` 不读取全量远端资源清单；`resume` 会校验 plan digest 并跳过回执中已经成功的操作。图片较多时建议从 `--concurrency 2` 开始。

回执成功且命令退出码为 0 后，还必须运行真实站点验收：

```bash
KOOBOO_VERIFY_URL=https://docs.localkooboo.com pnpm docs:verify:kooboo
```

只有部署回执和线上验收都通过，才可以推进 last-successful artifact commit。完整闸门见 `.trellis/spec/kooboo-docs-deployment-sop.md`。

## 7. 远端站点：Request Hook（一次性）

导出器会把站内导航转换为 `/cms/index.html` 等实际 Page URL，基础浏览不依赖 Hook。若需要兼容用户直接访问 `/cms/` 等简洁目录 URL，可在 Kooboo 后台手动配置 **RouteFinding** Hook（CLI 不同步 Hook）。

配置步骤与代码见 [维护指南 · 路由 Hook](maintenance.md#路由-hook-routefinding)。

## 8. 常见问题

**`pnpm docs:dev` 报错找不到模块**

```bash
rm -rf node_modules docs/.vitepress/cache
pnpm install
```

**`kb deploy` 认证失败**

检查 artifact worktree `.env` 中 `KOOBOO_SITE_URL`、`KOOBOO_USERNAME`、`KOOBOO_PASSWORD`，以及可选的 `KOOBOO_SITE_ID`。

**本地图片不显示**

确认文件在 `docs/public/` 下，且 Markdown 使用 `/cms/...` 形式路径。

---

下一步：[文档站维护指南](maintenance.md)
