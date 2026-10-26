# 文档配图存放与引用

## 双语图片

| 语言 | 源文件 | 公开图片路径 |
|------|--------|--------------|
| 中文 | `docs/public/cms/<section>/<name>.jpg` | 后续中文页面使用对应中文图 |
| 英文 | `docs/public/en/cms/<section>/<name>.jpg` | `/en/cms/<section>/<name>.jpg` |

中英文件使用相同名称与步骤。英文后台真实截图不能由覆盖中文界面文字生成。

`DocImage` 与 `ManualImage` 可写中性路径，按当前页面语言解析：

```html
<DocImage src="/cms/manual/edit-page/text-editor.jpg" alt="编辑文字" width="1120" />
```

普通 Markdown 图片不会经过组件的语言解析；使用它时应明确写对应语言的资源路径。不要在引用中加入 `/public` 或 `/docs`。

## 采集

1. 默认由用户手动采集；Agent 控制浏览器或运行批量截图脚本需要用户授权。
2. 只使用指定演示站。先准备有示例文字、图片与链接的页面，不以空列表替代操作过程。
3. 切换后台语言后分别采集。保持相同主题、相近视口与相同步骤。
4. 保存原始截图，检查加载状态、浮层位置和清晰度；裁剪时保留定位操作所需的上下文。
5. 图片不得包含密码、授权码、真实邮件或业务数据。演示账号资料和不必要的顶栏区域应避开。
6. 图片放入上述源码目录，和 Markdown 一起检查。截图来源、采集日期与补图清单放在维护记录中。

截图授权只覆盖指定演示任务，不自动扩展为生产站验收或账户操作。既有 `screenshots:cms:*` 脚本保留用于已授权的旧图片维护，不是写作必跑步骤。

## 手册标注

手册使用 `ManualImage` 在原图上叠加红框与可选编号；坐标以图片宽高的百分比表示。英文与中文可分别定位，不要求不同语言的控件恰好同宽。

```html
<ManualImage
  src="/cms/manual/edit-page/text-editor.jpg"
  alt="修改文字后点击保存"
  :marks="[{ x: 20, y: 35, w: 50, h: 24, label: '1' }]"
/>
```

标注用于指明点击或填写位置，不重复添加长说明。原始截图仍可通过 `DocImage` 的点击放大查看。

## 构建与发布

`docs:build:kooboo` 将静态图片复制到 `kb-remote-site/images/`。本地目录前缀 `images/` 不属于公开 URL；例如 `images/en/cms/example.jpg` 对应 `/en/cms/example.jpg`。

图片与页面一起进入 artifact 的固定部署计划，遵循 [发布 SOP](kooboo-docs-deployment-sop.md)。不要单独运行宽范围 `kb push images` 绕过计划、回读与回执。

只改图时可以运行 `pnpm docs:sync-images` 和 `pnpm docs:artifact:prepare:skip-build` 准备产物，再走相同的计划和发布流程；这两步本身不会部署。

## 表格列宽

Markdown **不能**写列宽。本站已在 `docs/.vitepress/theme/custom.css` 统一处理：

| 规则 | 效果 |
|------|------|
| 所有 `th` | `white-space: nowrap`，表头单行 |
| 首列 `th` / `td` | 不换行 + `width: 1%`，按内容收窄，把宽度让给说明列 |

两列表格（`| 列/操作 | 说明 |`）无需额外写法。若某表**必须**让首列折行，用 HTML 包住：`<div class="table-wrap-first">` + `<table>...</table>`。

## Mermaid 流程图（文字勿溢出）

本站 **不是** VitePress 内置 Mermaid，也不是官方 `mermaid.js`，而是构建期插件 [`vitepress-plugin-mermaid-diagram`](https://www.npmjs.com/package/vitepress-plugin-mermaid-diagram)：自研布局 + 静态 SVG。仓库通过 `pnpm-workspace.yaml` 和 `patches/vitepress-plugin-mermaid-diagram@0.3.2.patch` 修正了插件的 CJK 估宽，将汉字、日文假名、韩文及全角标点按 `1em` 计算，避免中文节点丢失左右内边距。

### 写作约定（优先遵守）

| 做法 | 说明 |
|------|------|
| 换行用 `\n` | 插件支持 `A[第一行\n第二行]`；**不要**写 `<br/>`（会当普通字符画进 SVG，框宽也算错） |
| 节点文案宜短 | 细节放在下方表格或正文；长句拆成多节点或拆成两张图 |
| 少用并排 subgraph | 两个子图横排时各自可用宽度变窄，中文更易溢出 |
| 复杂关系 | 可改用表格 + 一张简单示意图，不必一张图塞满 |

### 全局可调（次要）

在 `docs/.vitepress/config.mts` 的 `diagramPlugin` 上可加大 `flowchart.nodeSpacing` / `rankSpacing`，用于调整节点之间的距离；这不会改变节点文字的内部留白。

升级插件版本时必须运行 `pnpm test:mermaid-diagram`；若上游已经修复同一问题，应删除本地补丁并重新核对中英文流程图。复杂关系仍应优先拆图，不要依赖无限扩大的单张 SVG。

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

导出到 Kooboo 的页面同样加载 VitePress 主题脚本。图片放大依赖主题正常加载与水合；不能把构建成功当成浏览器交互已验收。
