# Kooboo 文档站构建、发布与线上验收 SOP

> 适用范围：将本仓库 VitePress 产物发布为 Kooboo Page、Script、Style 和 Content File。
> 核心原则：构建成功、`kb push` 成功、CLI 对账同步，都不等于线上站点可运行；发布必须通过真实 HTTP 与浏览器水合验收。

## 0. 发布语言与目标站

当前公开站点**只发布英文版**（`docs/en/**`）。中文 Markdown 保留在仓库，便于对照和后续恢复，但不进入 VitePress dist、kbdev 预览或 Kooboo 产物。

| 目标 | 地址 | 语言 |
|------|------|------|
| kbdev 快速预览 | `4173` | 英文 |
| kbdev 稳定预览 | `4175` | 英文 |
| 线上 | https://doc-kooboo-us.kooboo.io | 英文 |
| redev | https://docs.redev.cn | 英文 |

英文页面发布在站点根路径：`docs/en/cms/index.md` 对应 `/cms/`，不携带 `/en/`。旧的 `/en/...` 文档 URL 会跳转到去掉前缀的路径。截图资源仍在 `/en/cms/` 与 `/en/product/`。日后中文将放在 `/zh/`，现在不发布。

开关位于 `scripts/docs-publish-locale.mjs` 的 `PUBLISH_ZH`。恢复中文发布时改为 `true`。

下一次对已有双语站点的 Git 发布会把中文 Page 记为删除项，需要 `--apply-deletes` 或编辑器二次确认后才会从远端移除。

## 1. 构建产物契约

### 1.1 全局入口使用项目专属稳定 URL

VitePress 全局入口固定为：

```text
/assets/vitepress-app.js
/assets/vitepress-style.css
```

不要改回 `/assets/app.js` 或 `/assets/style.css`。Kooboo 可能存在资源对象和 `routeName`，但真实 HTTP 路由没有命中；此时重复 push 同名资源仍可能继续返回 404。项目专属名称也能避免与站点中其他通用入口冲突。

### 1.2 页面模块必须保留运行时可拼接的 hash 段

VitePress 客户端会根据 `window.__VP_HASH_MAP__` 动态拼接：

```text
<page>.md.<hash>.js
<page>.md.<hash>.lean.js
```

因此不能把页面模块稳定化为 `<page>.md.js` 或 `<page>.md.lean.js`。本项目使用固定 token：

```text
<page>.md.stable.js
<page>.md.stable.lean.js
```

构建脚本必须同时更新三个位置，缺一不可：

1. `assets/` 中的物理文件名；
2. `content-file/hashmap.json`；
3. 每个 HTML 内联的 `window.__VP_HASH_MAP__`。

如果只改物理文件名，SSR HTML 会短暂显示正确内容，随后客户端水合请求不存在的 hash 模块并切换到 VitePress 404。

### 1.3 不手工修改导出产物

稳定命名和引用更新只允许由 `scripts/stabilize-vitepress-dist.mjs` 完成。不要手工编辑 `kb-remote-site/src/page`、`src/js/assets` 或 `src/css/assets` 来维持发布；下一次构建会覆盖这些文件。

## 2. 构建前检查

```bash
pnpm test:stabilize-vitepress
pnpm docs:build:kooboo
```

构建后至少确认：

```text
kb-remote-site/src/js/assets/vitepress-app.js
kb-remote-site/src/css/assets/vitepress-style.css
kb-remote-site/src/js/assets/<page>.md.stable.lean.js
```

任取一个导出 Page，必须同时引用：

```html
<link rel="preload stylesheet" href="/assets/vitepress-style.css" as="style">
<script type="module" src="/assets/vitepress-app.js"></script>
```

并且其内联 hash map 对应页面值为 `stable`。

## 3. 发布顺序

支撑资源必须先于引用它们的 Page 发布：

```text
1. Script、Style 和页面模块
2. content-file/hashmap.json
3. Page
4. 线上验收
5. 预览并清理旧资源
```

禁止先发布 Page，再上传其引用的 JS/CSS。全量本地推送可从以下保守参数开始：

```bash
export KOOBOO_PUSH_CONCURRENCY=10
export KOOBOO_PUSH_INTERVAL_MS=30
```

若资源列表请求出现以下服务端错误：

```text
Cannot access a disposed object.
SafeMemoryMappedViewHandle
```

这是 Kooboo 服务端读取资源清单时的瞬时错误。降低并发后重试；不要据此修改或回滚本地产物。

## 4. 成功证据分级

以下证据不能互相替代：

| 证据 | 能证明什么 | 不能证明什么 |
|------|------------|--------------|
| `kb push` 输出 `Push success` | CLI 命令结束 | URL 能被 HTTP 路由命中 |
| `kb check --level 1` 为 `in_sync` | 本地和远端资源清单身份一致 | 资源内容正确、HTTP 200、浏览器能执行 |
| Page URL 返回 200 | SSR HTML 存在 | CSS/JS 正常、VitePress 水合成功 |
| 页面模块返回 200 | 单个动态模块存在 | 全局 app/CSS 存在、控制台无错误 |
| 浏览器完整验收通过 | 当前候选版本真实可运行 | 未检查页面或未覆盖业务流程的正确性 |

本项目遇到过以下真实反例：CLI 对账将 `/assets/app.js`、`/assets/style.css` 标记为 `in_sync`，远端对象也有正确 `routeName`，但 HTTP 请求仍为 404。因此发布验收不能停在 CLI 层。

## 5. 强制线上验收

部署后运行：

```bash
KOOBOO_VERIFY_URL=https://doc-kooboo-us.kooboo.io pnpm docs:verify:kooboo
```

默认检查首页跳转后的英文首页与英文 API 页。需要增加路径时：

```bash
KOOBOO_VERIFY_URL=https://doc-kooboo-us.kooboo.io \
KOOBOO_VERIFY_PATHS=/,/cms/index.html,/api/utils/ip.html \
pnpm docs:verify:kooboo
```

验收命令必须同时满足：

- `vitepress-app.js` 与 `vitepress-style.css` 返回 200；
- 页面引用的是上述项目专属 URL；
- `window.__VITEPRESS__ === true`，证明客户端入口已执行；
- 等待网络稳定和水合后没有 `PAGE NOT FOUND`；
- 所有网络响应均无 4xx/5xx；
- 控制台没有 error；
- 页面没有未捕获异常。

任何一项失败，发布不得标记完成，也不得推进部署基线。

## 6. 故障判定

### SSR 页面一闪而过，随后变成 VitePress 404

优先检查页面模块命名、内联 `__VP_HASH_MAP__` 与 `content-file/hashmap.json` 是否一致。不要先修改 RouteFinding Hook。

### 页面有 HTML，但完全没有样式或交互

检查所有全局资源，而不只检查 `.md.*` 页面模块：

```text
/assets/vitepress-app.js
/assets/vitepress-style.css
```

如果 `kb check` 显示同步但 HTTP 仍为 404，不要反复保存同一个异常 URL。创建项目专属新 URL、先验证新 URL 为 200，再更新 Page 引用。

### `app.js` 返回脚本文本错误而不是 JavaScript

检查 RouteFinding Hook。Hook 只能重写以 `/` 结尾的目录 URL，不得包含顶层 `return`，也不得改写带扩展名的 JS、CSS、字体或图片请求。

## 7. 清理规则

新版本通过线上验收之前禁止 prune。页面模块命名迁移后，旧资源可能表现为 `remote_only`：

```text
assets/*.md.js
assets/*.md.lean.js
```

清理前必须确认所有待删除项都符合预期生成文件模式，先运行 preview，再显式确认删除。不要用宽范围 prune 顺手删除其他站点资源。

## 8. 发布收口清单

- [ ] stabilizer 测试通过；
- [ ] Kooboo 构建与导出通过；
- [ ] 全局入口使用项目专属 URL；
- [ ] 页面模块、内联 hash map、`hashmap.json` 都使用 `stable`；
- [ ] 支撑资源先于 Page 发布；
- [ ] `docs:verify:kooboo` 通过；
- [ ] Preflight 无 BLOCKER；
- [ ] `git diff --check` 通过；
- [ ] 旧资源只在验收后精确清理；
- [ ] 部署基线只在所有检查通过后推进。
