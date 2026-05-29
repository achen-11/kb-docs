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
