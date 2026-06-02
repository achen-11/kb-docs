# Kooboo 后台 CMS 文档流程

> 路径：`docs/cms/**` · 面向站点管理员与实施人员

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

## 呈现方式（降低截图维护成本）

每条 CMS 文档建议包含：

1. **菜单路径**（必填）— 如：内容 → 数据类型  
2. **深链**（推荐）— 便于从文档一键打开（若文档站部署在同一域）  
3. **步骤编号** — 1、2、3…  
4. **配图** — 见 [documentation-images.md](./documentation-images.md)（CLI `images/` + 文中 `/docs/cms/...`）  
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

## 配图采集

- **Agent 会话**：优先 **Cursor Browser MCP**（`browser_navigate` / `browser_take_screenshot`），后台已登录即可，见 [documentation-images.md](./documentation-images.md)。
- **本地批量**：Playwright — `pnpm screenshots:cms:content` / `commerce` / `site`；凭证为 `.env` 的 `KOOBOO_PASS`。
- **本机 Chrome tab**：**cdp-bridge** + `scripts/save-cdp-png.mjs`。

## 验证

- CMS 文档**不做** ai-check 脚本测试  
- 发布前：实施同学按文档走一遍；与当前 `master` Frontend 菜单核对

## Backlog

见同目录 `cms-documentation-backlog.md`。
