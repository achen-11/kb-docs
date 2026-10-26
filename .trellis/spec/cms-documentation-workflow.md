# Kooboo 后台 CMS 文档流程

> 路径：`docs/cms/**` · 面向站点管理员与实施人员
> 公开站点只发布英文 `docs/en/cms/**`；中文源文件按本流程保留对照。

## 目标

帮助**新用户**在 Kooboo 后台完成配置与日常操作，并能与 [模板引擎](/templateEngine/)、[KScript API](/api/) 文档衔接。

## 权威来源（优先级）

1. **Kooboo Frontend** — `Kooboo/Frontend/src/router/site.ts`（站点后台菜单与路由）
2. **菜单文案** — `Kooboo/Frontend/locales/zh.yml`（`common.*`）
3. **AI 技能** — `Kooboo.Sites/AI/Skills/packages/kooboo-cms-guide/SKILL.md`（`/_Admin` 深链、`SiteId`）
4. **场景参考** — `kooboo-coding/references/Scenario/`（多语言、支付、邮件等后台入口）
5. **页面实现** — `Kooboo/Frontend/src/views/**`（字段含义、按钮逻辑）

编写时以 Frontend 为准；与旧版 kooboo.com 文档冲突时，以当前 Frontend 为准。

## 与 API / 模板引擎分工

| 文档 | 读者 | 内容 |
|------|------|------|
| `docs/cms/**` | 后台操作 | 点哪里、填什么、先配什么 |
| `docs/templateEngine/**` | 前端模板 | Layout / Page / k-data |
| `docs/api/**` | 脚本开发 | `k.content`、`k.commerce` 等 |

API 页中的「须在后台配置」应链接到对应 `docs/cms/` 文章，不再在 API 正文展开后台截图流程。

## 后台 URL 约定

站点后台 SPA 构建产物在 `/_Admin/`，路由与 Frontend 一致：

```text
/_Admin{route-path}?SiteId={站点GUID}
```

示例：

| 菜单 | 路径 |
|------|------|
| 页面 | `/_Admin/site/pages?SiteId=...` |
| 数据类型 | `/_Admin/content/contentTypes?SiteId=...` |
| 服务集成 | `/_Admin/system/config?SiteId=...` |
| 基础设置（多语言） | `/_Admin/system/settings?SiteId=...` |

`SiteId` 必填；切换站点后查询参数会更新。

## 呈现方式

Markdown 排版（标题与 `---` 分割线等）见 **[markdown-vitepress.md](./markdown-vitepress.md)**。

每条 CMS 文档建议包含：

1. **菜单路径**（必填）— 如：内容 → 数据类型  
2. **深链**（推荐）— 便于从文档一键打开（若文档站部署在同一域）  
3. **步骤编号** — 1、2、3…  
4. **配图** — 见 [documentation-images.md](./documentation-images.md)（中文 `docs/public/cms/`，英文 `docs/public/en/cms/`）
5. **关联开发文档** — 配好后去看哪篇 API / 模板引擎  

可选增强（后续）：

- 短 GIF（≤15s）用于多步向导  
- 视频外链（B 站 / 内部）用于「第一次建站」  
- 不在 VitePress 内嵌可交互后台（成本高）

配图约定见 [documentation-images.md](./documentation-images.md)：`docs/public/cms/` + 文中 `/cms/...`，`docs:build:kooboo` 时复制到 `kb-remote-site/images/cms/`。

## 菜单结构

完整菜单树见 [docs/cms/navigation.md](../../docs/cms/navigation.md)，由 `site.ts` 归纳，随 Frontend 变更需同步更新。

## 编写粒度

- 一篇 = **一个后台任务**（如「创建内容类型与文件夹」），10～20 分钟能做完  
- 文末用 **相关** 表链到 API / 模板引擎；**不要**写「上一步 / 下一步」小节（VitePress 侧边栏顺序已提供 Previous / Next）  
- 不写 KScript 示例（链到 API 即可）
- **不要**在正文写 UI 像素尺寸（如「宽约 600px」「850px 弹窗」）；弹窗/页面用功能描述即可。`<DocImage width="...">` 仅控制文档站展示宽度，不算正文尺寸说明
- 列表页上的 **弹窗/抽屉** 说明放在 **列表页章节内**（如 `### 关联商品弹窗`），不要隔一整段「新建与编辑」再写，避免阅读割裂

## 图文操作手册

- `docs/cms/manual/` 与 `docs/en/cms/manual/` 按用户任务组织，现有菜单参考文档保留。
- 一步包含动作标题、一句必要说明和对应截图；只在影响操作时补充前提、保存时机或风险。
- 截图使用有演示数据的真实界面，框出本步控件。中英文分别采集对应语言的后台，不翻译覆盖截图文字。
- 优先让图片和布局解释操作，不重复添加“操作说明”“预期结果”等标签。
- 手册不展示 CLI 注释、站点 GUID 或内部实现；若确需代码，使用后台原生语法。
- 示范页与截图来源保存在维护记录中，公开正文不包含测试账号或内部环境地址。

## 配图采集

- 默认由用户手动截图；用户授权后，Agent 可在指定演示后台采集。浏览器选择按当前可用工具和授权范围处理。
- 截图授权不等于生产站浏览器验收、发送邮件、付款或调整真实成员权限的授权。
- 既有批量脚本只用于已授权的截图维护，不作为每次写文档的必跑步骤。

## 验证

- CMS 文档**不做** ai-check 脚本测试  
- 检查中英页面、图片路径、导航和构建；真实操作由用户手动复核，或在已授权的演示环境中核对。
- 以当前目标版本的 Frontend 和后台为准，不固定假设分支名。

## Backlog

见同目录 `cms-documentation-backlog.md`。
