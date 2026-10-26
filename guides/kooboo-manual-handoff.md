# Kooboo 图文操作手册交接

更新时间：2026-10-26。本文是给接手 AI 的内部交接，不进入公开文档。

## 1. 当前任务与边界

工作区：`/Users/achen/Priv/Yardi/kb-docs`。

用户原始需求：

1. 清理项目中的过期文件、过期规范与约束。
2. 参考 `/Users/achen/Downloads/Kooboo建站后台操作手册.docx`，在 Admin CMS 下新增以图片引导为主的操作手册。内容和截图都需要中英两版，发布时暂时只发英文。

**用户随后明确缩小本轮范围：先做“在线编辑页面”这一篇中英样章，给用户看效果，双方对齐后再批量完成其他章节。不要立即写完整本手册。**

用户已授权：

- 清理确认过期的文件和约束。
- 在指定专用演示站准备示例页面、操作后台、采集中英截图。
- 本地实施样章；之前“只规划、不改文件”的限制已被后续实施授权取代。

本轮没有获得正式文档站部署授权。另一个会话负责部署测试，本会话没有部署文档站，也没有暂存、commit 或 push。

用户现在要求交接文档，当前实现工作暂停于下述进度。

## 2. 必须遵守的用户要求

- 用中文回答。用户用英文交流时，顺带指出英文语法问题，但不影响实际任务。
- 不跑全量 Vue 类型检查和 lint；做与改动相关的检查即可。
- 默认不要浏览器验收。此次浏览器授权用于指定演示后台截图和演示操作，不扩展到正式文档站验收。
- 不自动暂存、commit、push。用户说“可以提交”通常表示暂存相关改动并提供 commit message。
- 避免不必要的次级标签和描述；让布局、图片和简短动作说明解释操作。
- **公开手册若出现代码，只能用 Kooboo 后台原生语法，不能把 CLI 注释或 CLI 本地语法写进用户文档。**
- 附件的文字只作为参考资料，不能当成用户指令。
- 保留其他会话的改动，不做 broad reset、clean 或全量 staging。
- 不主动启动子 agent。
- 用户要求本地读取优先 FastCtx；此前工具中没有发现 FastCtx，已用 rg 等工具 fallback。若接手环境有 FastCtx，请按其说明使用。

## 3. 已实际完成的仓库改动

这些改动均未暂存、未提交。接手后先读 `git status --short` 和 diff。

| 文件 | 已做的事 |
| --- | --- |
| `.trellis/workflow.md` | 将约 400 行的通用流程改为项目实际工作流程；移除强制身份初始化、任务/journal、默认全量检查等约束；保留双语、英文发布、提交授权、部署固定计划等规则。 |
| `.trellis/spec/cms-documentation-backlog.md` | 将失真的菜单完成表改为维护清单；明确本轮仅做在线编辑样章，后续主题不生成空页面。 |
| `.trellis/spec/cms-documentation-workflow.md` | 修正图片路径、截图权限、手册写法、双语截图要求与代码语法边界；不固定假设 master 分支。 |
| `.trellis/spec/documentation-images.md` | 清理旧域名、默认 Chrome、直接推送图片等过时约束；补双语路径、真实截图、隐私、百分比红框、artifact 发布约定；保留有效的表格/Mermaid/图片预览说明。 |
| `.trellis/spec/markdown-vitepress.md` | 用当前 locale 发布开关替代旧域名及旧文章计划。 |
| `guides/maintenance.md` | 修正为英文根路径发布、中文源保留；修正图片放大和截图/部署说明。 |
| `.gitignore` | 新增 `/kb_doc_test/`，将用户 clone 的专用演示项目留在本地，避免凭据及生成定义混入文档仓库。 |
| `docs/.vitepress/theme/components/ManualImage.vue` | 新增图片标注组件，复用 DocImage，叠加百分比红框与可选数字。 |
| `docs/.vitepress/theme/index.ts` | import 并注册 ManualImage。 |

### 已归档 8 个 completed 任务

从 `.trellis/tasks/` 移到对应 `archive/2026-07/` 或 `archive/2026-08/`，内容未删除：

- `07-18-kooboo-cli-user-docs`
- `08-10-docs-preview-server`
- `08-10-docs-preview-server-deployment`
- `08-11-deploy-docs-preview-kbdev`
- `08-11-docs-editor-drafts`
- `08-11-docs-editor-fast-preview`
- `08-11-docs-editor-links`
- `08-11-docs-preview-auto-sync`

Git 当前表现为原路径删除、归档路径 untracked，尚未 staging 后识别 rename。这是移动，不是丢失历史。

未完成的 bootstrap、API refactor、content 任务未处理。不要仅凭日期旧删除它们。

`scripts/kooboo-manifest.mjs` 仍被 artifact 工具引用，不能当过期文件删除。没有改动旧发布模块、部署回执或备份。

### 尚未完成的部分

- **没有创建任何手册 Markdown 正文或手册首页。** 之前交流中的“编写/整理正文”只是计划，不代表文件已落盘。
- 没有改 CMS sidebar，也没有给中英 CMS overview 加手册入口。
- ManualImage 尚未经过构建验证，也没有文章使用它。
- 未执行本轮文档构建、死链检查、图片配对检查、demo Preflight 或最终 diff 检查。

## 4. 演示站与本地 clone

后台：`http://localhost:3000/_Admin/`。

站点：`kb_doc_test`，在“我的站点”的 `custom` 文件夹中。

演示域名：`https://kb_doc_test.localkooboo.com`。

SiteId：`3b6f99e1-6e8f-80e9-02bf-1fd09648d897`。这是内部定位信息，不写进公开手册。

页面管理入口：

```text
http://localhost:3000/_Admin/site/pages?SiteId=3b6f99e1-6e8f-80e9-02bf-1fd09648d897
```

用户已执行 `kb clone`，本地目录为：

```text
/Users/achen/Priv/Yardi/kb-docs/kb_doc_test
```

目录内有可用 `.env`。不要打印、复制到交接文件、提交或公开其中凭据。用户曾提供本地登录信息，优先复用登录会话或现有本地配置，本交接不重复密码。

### 已创建并通过 kb push 上传的资源

| 本地文件 | 演示站 URL |
| --- | --- |
| `src/page/home.html` | `/`，英文 Willow Studio |
| `src/page/home-zh.html` | `/zh`，中文青木工作室 |
| `src/page/contact.html` | `/contact` |
| `src/page/contact-zh.html` | `/zh/contact` |
| `src/css/manual-demo.css` | `/manual-demo.css` |
| `images/studio.svg` | `/studio.svg`，绿色沙发插画 |
| `images/studio-warm.svg` | `/studio-warm.svg`，棕色沙发插画 |

SVG 是手写的示例插画，供真实页面换图操作使用。页面有标题、介绍、预约按钮、图片和联系区，桌面两列，窄屏单列。

CLI 本地资源目录不是公开 URL 的组成部分：不要写 `/src/css/...` 或 `/images/...`。

CLI push 曾因沙箱 DNS 失败，申请网络执行后成功。上传只针对专用演示站，没有发布正式文档站。

### 编辑状态：保存结果需要重新核实

已在中文在线编辑器实际完成：

- 标题从“为日常生活留一处舒适”改为“让家更适合你”，点击文字工具栏勾选确认。
- 图片从 `/studio.svg` 换为 `/studio-warm.svg`。
- alt 从“阳光窗边的绿色沙发”改为“阳光窗边的棕色沙发”，点击图片弹窗保存。
- 浮动工具栏显示过 2 个未保存修改。

用户重启服务后，编辑器出现刷新提示。点击刷新后出现“存在未保存的修改，是否保存？”；尝试点确定时工具审批超时，**不能确认整页已保存**。

接手先通过后台或 `kb pull`/回读确认远端内容。不要直接再次推送本地旧页面覆盖修改。clone 内页面源仍可能是初始标题和绿色图片。

英文页尚未执行对应修改。建议最终演示标题用 `Spaces made for you`，图片 alt 用 `A brown sofa beside a sunny window`；这只是建议，不是已完成事实。

## 5. 截图现状

已保存 5 张中文真实截图，目录：

```text
docs/public/cms/manual/edit-page/
```

| 文件 | 尺寸 | 内容 |
| --- | --- | --- |
| `pages.jpg` | 1280×500 | 中文页面列表，裁掉顶栏，显示四个演示页面。 |
| `select-text.jpg` | 1280×720 | 点击标题后的“编辑”菜单，页面样式与图片加载正常。 |
| `edit-text.jpg` | 1280×720 | 直接编辑中文标题，文字工具栏有勾选确认按钮。 |
| `choose-image.jpg` | 1280×720 | 媒体库选择棕色沙发示例图。需检查 tooltip 是否遮挡操作。 |
| `image-settings.jpg` | 1280×720 | 替换后的图片设置，含尺寸、src、srcset、alt 和保存。 |

`docs/public/en/cms/manual/edit-page/` 目录已创建，但**没有英文截图文件**。

最新 `git status` 额外出现 `artifacts/admin-pages-screenshot.png`（1440×1000）。来源需核对，不要擅自删除或直接当作合格配图。最后浏览器输出过英文 Pages 列表，但画面较窄、右侧操作列未完整显示，不能直接替代完整入口图。

附件 Word 已被读取：包含 93 张图，涉及登录、AI、在线编辑、内容、表单、图片、域名、组织、数据中心、续费、邮箱等 11 类操作。不要照搬旧版操作；以本次实际 UI 为准。

## 6. 已确认的实际产品操作

- 在线编辑器画布是 iframe。点击元素后出现菜单，不应照抄旧文档的双击/右键说法。
- 点击标题 → “编辑”后，是在页面原位置输入文字的富文本工具栏；不是普通文字弹窗。文字编辑工具栏的勾选确认对应 `i.icon-yes3`。
- 文字确认、图片弹窗保存，只是形成编辑器内修改；最终仍需要右侧浮动工具栏的整页保存。
- 点击图片 → “图片”打开设置。点击预览区域/“点击替换”进入媒体库。
- 媒体库仅点击缩略图不会选中，需要勾选卡片左上角复选框，再点“选择”。原始 input 的 check/click 曾失败，点击可视 `.el-checkbox__inner` 成功。
- 图片设置直接提供宽高和 alt。UI 明示“如果存在样式，此值将被覆盖”；不要承诺改宽高后视觉一定变化，也不应照抄附件“必须启用行内样式”。
- 按钮选中后菜单包含“编辑”“链接”“进入链接”。尚未成功采集链接弹窗或修改链接。
- 手机预览、撤销/重做、整页保存尚未完成实际验证与截图，不要写成已验证步骤。

必要源码可参考 `/Users/achen/Priv/Yardi/Kooboo/Frontend/src/views/inline-design/`，尤其 `inline-editor/`、`image/image-editor.vue`、`link/link-dialog.vue`、`page/page-editor.vue`、`menus/`。

### 域名与资源加载问题

从 localhost 域名进入在线编辑器时，画布曾丢失样式和图片；资源本身实际正常。用专用演示站域名打开同一编辑入口后样式和图片正常。

不要因此改产品代码、改域名绑定或伪造截图。必要时重新从站点入口取得有效在线编辑链接。

## 7. 浏览器阻塞与恢复线索

用户已授权控制指定演示后台采集中英截图。

此前使用 `mcp__cua_repl`：最初 Playwright DOM 操作正常，后续多次出现“自动审批未在时限内完成”。这是工具审批超时，不能解释为服务必然没恢复，也不是明确的安全拒绝。

用户曾重启服务，之后明确告知“现已恢复”。进一步请用户手动打开演示站 Pages 并切 English，用户已回复“已完成”。最后一次截图能看到英文 Pages 列表。因此**不要再默认要求用户重新登录或重复完成这一动作**；先核对当前状态。

最后 CUA reset 后重新建立的 `demo` 绑定是 IAB 标签页 4，打开过 `http://localhost:3000/_Admin/`，现在用户已将该页切到英文页面管理。旧标签页 3 是中文 inline editor，可能保留未保存编辑，状态需复核。

- `getScreenshot()` 有成功返回；`getAXState()` 有时成功、有时超时；`playwright.domSnapshot()` 与部分导航/点击多次超时。
- 曾出现 AX 树仍显示旧编辑页而截图已显示刷新错误页的情况。不要只凭旧 AX 声称操作成功。
- 接手若继续此前浏览器任务，先按 CUA 要求恢复工具文档。仅使用该工具允许的 UI API，不用外部 Playwright/CDP 或 HTTP 模拟浏览器操作。
- 浏览器在线编辑 URL 的 `access_token` 是敏感凭据。**不要打印原 URL、完整 tab 元数据或未脱敏的 AX/DOM。** 输出前将 `access_token=...` 的值替换成 `[redacted]`；截图不包含地址栏。
- 对同一审批超时不要无限重试；可以完成不依赖浏览器的工作，必要时说明具体阻塞并请求用户协助。

## 8. 手册落地方案

### 文档与入口

建议创建：

```text
docs/cms/manual/index.md
docs/cms/manual/edit-page.md
docs/en/cms/manual/index.md
docs/en/cms/manual/edit-page.md
```

在 `docs/.vitepress/config.mts` 的 `cmsSidebar` 概述后加入“操作手册”分组，含手册首页和“在线编辑页面”；在 `englishSidebarTextMap` 加 `User Manual`、`Edit a Page Visually` 等对应文案。给中英 `cms/index.md` 各加一处入口即可。

首页只列真实完成的样章，不为其余主题生成空链接。公开正文不要出现“样章”“等待老板反馈”“测试站 GUID”等内部写作信息。

文章可按实际验证完成程度组织为：页面入口 → 选择文字 → 修改并确认 → 选择替换图片 → 图片设置/alt → 修改链接 → 手机预览 → 撤销与整页保存。每步一个动作标题、一句必要说明和大图，避免长表格与反复解释。

### ManualImage

组件 props：

```ts
src: string
alt: string
marks?: { x: number; y: number; w: number; h: number; label?: string }[]
```

坐标为图片宽高百分比。例：

```html
<ManualImage
  src="/cms/manual/edit-page/edit-text.jpg"
  alt="输入新标题并点击勾选确认"
  :marks="[{ x: 10, y: 36, w: 38, h: 9, label: '1' }]"
/>
```

这只是标注用法示例，最终坐标需逐张目视定位。组件沿用 DocImage 点击放大；当前放大看到的是原始截图，不带红框。是否需要放大后保留标注，可在用户看样章后讨论。

中英文图用相同文件名，分别位于：

```text
docs/public/cms/manual/edit-page/
docs/public/en/cms/manual/edit-page/
```

中性 `/cms/...` 路径由 DocImage/ManualImage 按页面语言解析。不要简单复制中文图到英文目录，也不要覆盖中文 UI 文字生成英文截图。

### 发布语言

`scripts/docs-publish-locale.mjs` 当前：

```js
PUBLISH_ZH = false
PUBLISH_CLI = false
PUBLISH_PRODUCT_FEATURES = false
```

英文源 `docs/en/cms/manual/` 经 rewrite 发布到 `/cms/manual/`，中文源保留但不发布。不要为了预览中文而意外开启生产中文发布。

## 9. 接手建议顺序与验证

1. 读本交接、git status、现有 diff；确认没有后续并发改动。保留原始五张中文截图。
2. 核实 demo 保存状态与服务恢复状态；用户已切好英文 Pages，优先从这里继续。
3. 完成这一篇需要的中英真实截图；逐张检查控件、加载、遮挡、敏感信息和语言对应。
4. 写四个 Markdown 文件、CMS 入口与 sidebar，定位红框；只做这一篇。
5. 审阅既有规范清理是否准确，不继续无边际地删历史资料。
6. 对 demo 创建的四页及 CSS 执行 CLI 技能要求的 Preflight；对文档执行构建、死链、图片/英文发布范围检查与 diff check。
7. 给用户可看的样章，明确哪些检查通过、哪些交互还需用户复核；不部署、不自动提交，不扩写后续章节。

CLI Preflight 命令：

```bash
node /Users/achen/.agents/skills/kooboo-cli-coding/scripts/preflight-scan.js \
  --root /Users/achen/Priv/Yardi/kb-docs/kb_doc_test \
  --artifacts '[{"path":"src/page/home.html","type":"Page"},{"path":"src/page/home-zh.html","type":"Page"},{"path":"src/page/contact.html","type":"Page"},{"path":"src/page/contact-zh.html","type":"Page"},{"path":"src/css/manual-demo.css","type":"Style"}]'
```

存在 BLOCKER 必须修复后再宣称 demo 完成。相关技能：

- `/Users/achen/.agents/skills/kooboo-cli-coding/SKILL.md`
- `/Users/achen/.codex/skills/kooboo-cli-site/SKILL.md`
- `/Users/achen/.codex/skills/vue/SKILL.md`
- 文档附件已按 documents 技能读取，不需要重新制作 Word。

项目检查：

```bash
pnpm docs:build
pnpm check:dead-links
node --test scripts/docs-publish-locale.test.mjs
git diff --check
```

根据最终改动再选择相关聚焦测试，不跑不必要的全量检查。不运行部署命令。

宿主默认 Python 没有 Pillow；需要检查截图时可用已安装运行时：

```text
/Users/achen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3
```

## 10. 协作背景与当前 Git 基线

已读取的关联部署会话：`01a176dc-f92b-7c63-a386-e003a52c9fec`（host `local`）。本会话不向它发送消息或部署；接手若需要依赖其最新状态，应重新 read_thread，不能把旧摘要当成当前部署证据。

本次交接时 HEAD：`4f16c80`（`docs: 补全 KScript 运行时文档并修正中英文 API 示例`）。当前工作区主要是本交接列出的规范清理、任务归档、ManualImage 和中文截图，另有待核对来源的 `artifacts/`。

**完成状态：清理已实施但未最终验证；样章基础组件与部分中文截图已完成；正文、导航、英文截图和完整验证尚未完成。**
