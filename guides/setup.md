# 环境安装与本地开发

面向第一次参与 **kb-docs** 的同事：从 clone 到本地预览、具备部署能力。

## 1. 前置要求

| 工具 | 版本建议 | 用途 |
|------|----------|------|
| [Node.js](https://nodejs.org/) | 20 LTS 或更高 | 运行 VitePress 与脚本 |
| [pnpm](https://pnpm.io/) | 10.x（见 `package.json` 的 `packageManager`） | 包管理 |
| [Kooboo CLI](https://www.kooboo.com)（`kb`） | 最新稳定版 | 部署到远端站点 |
| Git | 任意较新版本 | 协作与 manifest 同步 |

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

用于 **Playwright 自动截图** 脚本登录 Kooboo 后台，本地开发文档本身不依赖此文件。

```bash
cp .env.example .env
# 编辑 KOOBOO_USER、KOOBOO_PASS
```

首次跑截图脚本还需安装 Chromium：

```bash
pnpm exec playwright install chromium
```

### 3.2 `kb-remote-site/.env`（部署必需）

`kb-remote-site/` 是 Kooboo CLI 项目目录，**`kb push` 在此读取凭据**。该目录下除 `.env.example` 外内容默认不进 Git（构建时生成 `src/`）。

```bash
mkdir -p kb-remote-site
cp kb-remote-site/.env.example kb-remote-site/.env
# 向团队索取文档站的 URL、用户名、密码并填入
```

若目录里还没有 `package.json`、`tsconfig.json`，向同事索取或在该目录执行一次 Kooboo CLI 站点初始化 / `kb pull type` 拉取类型定义：

```bash
cd kb-remote-site
kb pull type    # 生成 kooboo.d.ts
cd ..
```

## 4. 本地开发（VitePress）

```bash
pnpm docs:dev
```

浏览器打开终端提示的地址（通常 `http://localhost:5173`）。

- 文档源文件在 `docs/`，改 Markdown 会热更新。
- 配图放在 `docs/public/`，文中用根路径引用，例如 `/cms/site/pages.png`（**不要**写 `/public/...`）。

本地预览 **不包含** Kooboo 上的 Request Hook 路由重写；若需验证 `/cms/` 这类目录 URL，请在部署后的远端站点测试。

构建检查（不部署）：

```bash
pnpm docs:build
pnpm docs:preview   # 预览构建产物
```

## 5. 与 Git 同步部署基线

Pull 后请确认带有 **`.kooboo-deploy/last-manifest.json`**。这是团队共享的「上次已部署到远端」资源指纹，用于增量 `kb push`。

```bash
git pull
ls .kooboo-deploy/last-manifest.json
```

若文件缺失，在有人完成全量部署并提交 manifest 之前，你的首次 `docs:deploy:kooboo` 会按全量变更处理。

## 6. 首次部署（可选）

在确认 `kb-remote-site/.env` 正确后：

```bash
# 先预览将推送哪些资源
pnpm docs:deploy:kooboo:dry-run

# 确认后执行（会 kb push，需网络与站点权限）
pnpm docs:deploy:kooboo
```

成功后请 **提交** 更新后的 `.kooboo-deploy/last-manifest.json`（通常与文档改动同一 PR）。

## 7. 远端站点：Request Hook（一次性）

文档站依赖 Kooboo **RouteFinding** Hook，将 `/cms/` 等目录 URL 重写到 `/cms/index.html`。Hook 需在 Kooboo 后台手动配置（CLI 不同步 Hook）。

配置步骤与代码见 [维护指南 · 路由 Hook](maintenance.md#路由-hook-routefinding)。

## 8. 常见问题

**`pnpm docs:dev` 报错找不到模块**

```bash
rm -rf node_modules docs/.vitepress/cache
pnpm install
```

**`kb push` 认证失败**

检查 `kb-remote-site/.env` 中 `KOOBOO_SITE_URL`、`KOOBOO_USERNAME`、`KOOBOO_PASSWORD`。

**本地图片不显示**

确认文件在 `docs/public/` 下，且 Markdown 使用 `/cms/...` 形式路径。

---

下一步：[文档站维护指南](maintenance.md)
