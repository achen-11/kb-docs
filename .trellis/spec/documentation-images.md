# 文档配图存放与引用约定

> 已确认：CLI 站点根 `kb-remote-site/` · 媒体路径 `images/cms/...` · Git 保持现状

## 结论（不必写 `/public`）

VitePress 的 `docs/public/` 会把文件映射到站点**根 URL**，不会多出 `/public` 段：

| 仓库路径 | 本地 `pnpm docs:dev` | 远端（`kb push images` 后） |
|----------|----------------------|------------------------------|
| `docs/public/cms/getting-started/01-login.png` | `/cms/getting-started/01-login.png` | `{baseUrl}/cms/getting-started/01-login.png` |

Markdown **始终**写：

```markdown
![登录页](/cms/getting-started/01-login.png)
```

打包时**不需要**改链接地址。

## 目录

```text
docs/public/cms/              # Git 跟踪（在 docs 下，不进 kb-remote-site ignore）
  getting-started/
    01-login.png
  content/
    data-types-01-list.png

kb-remote-site/images/cms/      # 构建时从 public 复制，供 kb push（gitignore 不变）
```

## 工作流

### 后台截图（三种方式，按场景选）

| 方式 | 适用 | 凭证 |
|------|------|------|
| **Playwright 脚本** | 本地/CI 批量重跑、可复现 | `.env` 的 `KOOBOO_PASS` |
| **Cursor `browser_*` MCP** | Agent 会话内交互后截图 | 你在 **Browser 面板** 已登录后台即可 |
| **cdp-bridge MCP** | 复用本机 **Chrome** 已开 tab | 同上，无需把密码交给终端 |

Agent 配图时：**若 Browser 已登录 redev 后台**，优先 `browser_navigate` → `browser_snapshot` 点按 → `browser_take_screenshot`（可 `ref` 截元素、`fullPage` 截长页），再把 PNG 放到 `docs/public/cms/<subdir>/`。不必强行走 Playwright。

Playwright 适合你不打开 IDE 浏览器、或要一条命令刷全站配图时：

本仓库脚本用 **无头 Chromium** 自动登录 `/_Admin` 并写入 `docs/public/cms/`。密码放在仓库根 **`.env`**（已 gitignore）或命令行环境变量，勿提交 Git。

**首次在本机**（与 `playwright` 包版本一致，当前 **1.58.x**）：

```bash
pnpm install
pnpm exec playwright install chromium
```

**运行**（任选）：

```bash
pnpm screenshots:cms:site
pnpm screenshots:cms:content
pnpm screenshots:cms:commerce
# 或直接
node scripts/cms-commerce-screenshots.mjs
```

凭证：`KOOBOO_USER`、`KOOBOO_PASS`（`.env` 里也支持 `kooboo_user` / `kooboo_pass`）。电商脚本可选 `KOOBOO_PRODUCT_ID`、`KOOBOO_SITE_ID`。

脚本列表：

| 脚本 | 输出目录 |
|------|----------|
| `scripts/cms-screenshots.mjs` | `docs/public/cms/site/` |
| `scripts/cms-content-screenshots.mjs` | `docs/public/cms/content/` |
| `scripts/cms-commerce-screenshots.mjs` | `docs/public/cms/commerce/` |

视口默认 1440×900、`deviceScaleFactor: 2`，与人工浏览器截图清晰度接近。弹窗类图用 `.el-dialog` 元素截图。

### Cursor Browser MCP（`browser_*`）

1. 在 Cursor **Browser** 中打开并登录 `https://www.redev.cn/_Admin/...?SiteId=...`。
2. Agent：`browser_navigate` → `browser_snapshot`（拿 `ref`）→ `browser_click` / `browser_fill` 等打开目标 UI。
3. `browser_take_screenshot`：`filename` 自定；截元素时传 `ref`（来自 snapshot）。
4. 将生成的 PNG **复制或保存到** `docs/public/cms/<subdir>/`（与文中 `/cms/...` 路径一致）。

弹窗、分块图：先 snapshot 定位 `.el-dialog` 或区块，再元素截图；比整页裁剪更稳。

### cdp-bridge（本机 Chrome）

已用 Chrome 登录、且 Browser 面板未用时，可用 **`user-cdp-bridge`**（`browser_batch` → `Page.captureScreenshot`），大 JSON 用：

```bash
node scripts/save-cdp-png.mjs <subdir> <filename.png> <agent-tools路径或 .cdp-scratch/last.json>
```

`subdir` 为 `content`、`commerce`、`site` 等。

### 日常写文档

1. 截图保存到 `docs/public/cms/...`。
2. 文中引用 `/cms/...`（与上表一致）。
3. `pnpm docs:dev` 即可本地预览图片。

### 发布到 Kooboo 站点

```bash
pnpm docs:build:kooboo
```

会依次：VitePress 构建 → 导出 HTML/JS/CSS → **将 `docs/public/cms` 复制到 `kb-remote-site/images/cms`**（并跳过把 `dist/cms/**` 写入 `content-file`，避免与媒体库重复）。

然后在 CLI 项目目录推送媒体：

```bash
cd kb-remote-site
kb push images/cms
```

仅改图时可只跑复制（需先有 `docs/public` 文件）：

```bash
node scripts/sync-doc-images-to-kooboo.mjs
cd kb-remote-site && kb push images/cms
```

## 与符号链接方案

曾考虑 `docs/public` 链到 `kb-remote-site/images`；当前采用 **构建时复制**，避免 symlink，且 `docs/public` 单独进 Git、与 gitignore 的 `kb-remote-site/*` 不冲突。

## 表格列宽

Markdown **不能**写列宽。本站已在 `docs/.vitepress/theme/custom.css` 统一处理：

| 规则 | 效果 |
|------|------|
| 所有 `th` | `white-space: nowrap`，表头单行 |
| 首列 `th` / `td` | 不换行 + `width: 1%`，按内容收窄，把宽度让给说明列 |

两列表格（`| 列/操作 | 说明 |`）无需额外写法。若某表**必须**让首列折行，用 HTML 包住：`<div class="table-wrap-first">` + `<table>...</table>`。

## Mermaid 流程图（文字勿溢出）

本站 **不是** VitePress 内置 Mermaid，也不是官方 `mermaid.js`，而是构建期插件 [`vitepress-plugin-mermaid-diagram`](https://www.npmjs.com/package/vitepress-plugin-mermaid-diagram)：自研布局 + 静态 SVG，中文标签宽度用启发式估算，**容易比浏览器实际渲染偏窄**，再叠上并排 `subgraph`，就会出现你看到的「字出框」。

### 写作约定（优先遵守）

| 做法 | 说明 |
|------|------|
| 换行用 `\n` | 插件支持 `A[第一行\n第二行]`；**不要**写 `<br/>`（会当普通字符画进 SVG，框宽也算错） |
| 节点文案宜短 | 细节放在下方表格或正文；长句拆成多节点或拆成两张图 |
| 少用并排 subgraph | 两个子图横排时各自可用宽度变窄，中文更易溢出 |
| 复杂关系 | 可改用表格 + 一张简单示意图，不必一张图塞满 |

### 全局可调（次要）

在 `docs/.vitepress/config.mts` 的 `diagramPlugin` 上可加大 `flowchart.nodesep` / `ranksep`，或略调 `theme.fontSize`，只能缓解间距，**不能**从根本上修正中文估宽。

若仍频繁溢出，长期选项是：向插件仓库提 issue（CJK 估宽）、升级插件版本，或评估改回基于官方 Mermaid 的 VitePress 集成（体积与构建更重）。

## 扩展

若 API、模板引擎也要配图，在 `docs/public/` 下增加目录（如 `api/`），并在 `scripts/sync-doc-images-to-kooboo.mjs` 的同步列表里登记，映射为 `images/api/...`，文中写 `/api/...`。

## 样式与点击预览

文档站（VitePress）使用全屏 **ImageLightbox**（`Teleport` 到 `body`，高于侧栏/顶栏）：正文 `.vp-doc` 内的 `<img>` 与 `<DocImage>` 点击可居中放大，点击遮罩、右上角 × 或 **Esc** 关闭。

### 推荐：`<DocImage>` 组件

```markdown
<DocImage src="/cms/getting-started/01-login.png" alt="登录页" width="1120" />
```

带边框样式，并自动参与点击预览。

### 也可用原生标签

```markdown
<img src="/cms/getting-started/01-login.png" alt="说明" class="bordered-image" width="1120" />
```

或 Markdown 语法 `![说明](/cms/...png)`，同样可点击预览。

### 排除预览

给图片加 class `no-zoom` 即可禁用放大（如小图标）。

::: warning 远端 Kooboo 静态页
预览交互仅随 VitePress 主题加载。`docs:build:kooboo` 导出的 HTML **不会**自带该交互。
:::
