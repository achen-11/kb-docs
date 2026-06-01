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
