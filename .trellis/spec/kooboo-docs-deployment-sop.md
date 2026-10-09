# Kooboo 文档站构建、发布与线上验收 SOP

> 适用范围：将本仓库 VitePress 产物发布为 Kooboo Page、Script、Style 和 Content File。
> 核心原则：构建成功、`kb push` 成功、CLI 对账同步，都不等于线上站点可运行；发布必须通过真实 HTTP 与浏览器水合验收。

## 0. 发布语言与目标站

当前公开站点**只发布英文版**（`docs/en/**`）。中文 Markdown 保留在仓库，便于对照和后续恢复，但不进入 VitePress dist、kbdev 预览或 Kooboo 产物。

| 目标 | 地址 | 语言 |
|------|------|------|
| kbdev 快速预览 | `4173` | 英文 |
| kbdev 稳定预览 | `4175` | 英文 |
| 线上 | https://docs.kooboo.com | 英文 |
| redev | https://docs.redev.cn | 英文 |

英文页面发布在站点根路径：`docs/en/cms/index.md` 对应 `/cms/`，不携带 `/en/`。旧的 `/en/...` 文档 URL 会跳转到去掉前缀的路径。截图资源仍在 `/en/cms/` 与 `/en/product/`。日后中文将放在 `/zh/`，现在不发布。

开关位于 `scripts/docs-publish-locale.mjs` 的 `PUBLISH_ZH`。恢复中文发布时改为 `true`。

下一次对已有双语站点的 Git 发布会把中文 Page 记为删除项，需要 `--apply-deletes` 或编辑器二次确认后才会从远端移除。

## 1. 构建产物契约

### 1.1 全局入口使用项目专属稳定 URL

以下 `<release>` 是导出器根据资源内容生成的版本目录。同一目录不可覆盖为不同内容，旧版本资源保留供回滚。发布顺序为：固定快照和两个计划 → 上传并验证 supporting resources → 更新并验证 pages。不要在页面切换前覆盖旧运行时资源。

canonical 使用 `@k-canonical` 指令写入 Page `customHeader`，避免当前 Kooboo 渲染器吞掉 body 中的 canonical link；必须验证公开 HTML。保持既有 Site ID、域名和访问日志设置。

VitePress 全局入口固定为：

```text
/assets/releases/<release>/vitepress-app.js
/assets/releases/<release>/vitepress-style.css
/assets/releases/<release>/vitepress-local-search.js
/assets/releases/<release>/@localSearchIndexroot.js
/assets/releases/<release>/vitepress-runtime-data.js
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
3. 公共 `/assets/releases/<release>/vitepress-runtime-data.js` 中的 `window.__VP_HASH_MAP__`。

`window.__VP_HASH_MAP__` 与 `window.__VP_SITE_DATA__` 必须从页面 HTML 外置到这份公共阻塞 Script。每个 HTML 只引用一次 `/assets/releases/<release>/vitepress-runtime-data.js`，避免在每页重复全站数据；资源版本切换仍会更新所有页面引用。

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
kb-remote-site/src/js/assets/releases/<release>/vitepress-app.js
kb-remote-site/src/js/assets/releases/<release>/vitepress-local-search.js
kb-remote-site/src/js/assets/releases/<release>/@localSearchIndexroot.js
kb-remote-site/src/js/assets/releases/<release>/vitepress-runtime-data.js
kb-remote-site/src/css/assets/releases/<release>/vitepress-style.css
kb-remote-site/src/js/assets/releases/<release>/<page>.md.stable.lean.js
```

任取一个导出 Page，必须同时引用：

```html
<link rel="preload stylesheet" href="/assets/releases/<release>/vitepress-style.css" as="style">
<script type="module" src="/assets/releases/<release>/vitepress-app.js"></script>
```

并且在 VitePress app 入口之前引用 `/assets/releases/<release>/vitepress-runtime-data.js`，该 Script 中页面 hash 值为 `stable`；页面 HTML 不再内联 `__VP_HASH_MAP__` 或 `__VP_SITE_DATA__`。

## 3. 发布顺序

支撑资源必须先于引用它们的 Page 发布：

```text
1. Script、Style 和页面模块
2. content-file/hashmap.json
3. Page
4. 线上验收
5. 预览并清理旧资源
```

禁止先发布 Page，再上传其引用的 JS/CSS。图片较多的全量本地推送应从以下保守参数开始：

```bash
export KOOBOO_PUSH_CONCURRENCY=2
export KOOBOO_PUSH_INTERVAL_MS=100
```

本次本地测试中，并发 5 触发了 `Upload/Image: Collection was modified`；使用同一 plan/receipt 以并发 2 resume 后完成 1482/1482 写入和精确校验。只有目标环境连续稳定后才提高并发。

若资源列表请求出现以下服务端错误：

```text
Cannot access a disposed object.
SafeMemoryMappedViewHandle
```

这是 Kooboo 服务端读取资源清单时的瞬时错误。降低并发后重试；不要据此修改或回滚本地产物。

### 3.1 资源清单损坏时的固定计划恢复发布

如果 `Page/all`、`Script/External` 或 `Route/ListByType` 持续返回 `Arg_NullReferenceException`，标准 `kb deploy` 会在写入前加载远端清单，因此无法继续。此时只允许对已经审核、冻结的 deploy plan 执行精确恢复，禁止重新生成计划或改用宽范围同步。

先根据响应形态判断是否值得增加 timeout：如果请求一直等待到客户端 timeout，可以延长 `--timeout` 取证；如果在 1 秒内快速返回 HTTP 400 `Arg_NullReferenceException`，延长 timeout 不会改变结果。本次生产站点在 30 秒和 120 秒 timeout 下都在 1 秒内返回同样的 400，而纯净本地站点的 211 个 Page 可在约 134ms 完成 `Page/all`。结论是坏 Page、Route 或 Relation 才是直接原因，Page 数量只会放大触发概率。

恢复前必须同时锁定并校验：

- artifact commit；
- deploy plan digest；
- `expectedSite.id` 与当前登录站点 ID；
- 每个 upsert 文件的本地 SHA-256；
- 删除项的精确资源类型、名称和路径。

恢复流程使用精确对象接口，不依赖损坏的列表接口：

1. Script 使用 `Script/Get` 按精确名称读取，使用真实 ID 调用 `Script/Update`；新资源才使用空 GUID。写入后再次读取并对 body 计算 SHA-256。
2. Script 路由使用 `Route/Resolve?url=<公开路径>` 验证，解析结果的 ID、名称和类型必须与目标 Script 一致。
3. Page 使用 `Page/Get` 按精确名称获取真实 Page ID，先用 `Route/Post` 将目标 URL 绑定到该 ID，再调用 `Page/Post`。
4. 每个阶段必须写结构化 receipt，记录 plan digest、站点 ID、成功数、失败项和回读结果。

推荐命令：

```bash
pnpm docs:deploy:kooboo:dry-run
pnpm docs:deploy:kooboo:exact

# 中断或部分失败后，必须继续使用原 plan 和原 receipt
pnpm docs:deploy:kooboo:exact -- --resume
```

`--resume` 必须先校验 receipt 的 plan digest，只跳过已成功操作并重试失败或未完成项。不得为了“重新开始”而生成新计划。默认资源版本目录会随内容变化，因此单篇修改也可能产生完整资源集和约 210 个 Page 更新；应先核对版本引用与完整计划，按资源、页面两个阶段发布。

不要使用 `Route/Get?name=...` 验证公开路径。`Route/Get` 的受支持查询参数是 Route ID；按 `name` 查询可能返回空值或滞后一请求的结果，容易把已经正确的路由误判为失败。公开 URL 是否指向正确对象，以 `Route/Resolve` 和真实 HTTP 响应为准。

Page 的 Route 刚重绑后，`Page/Post` 仍可能暂时返回 `Arg_NullReferenceException`。若精确 Page ID 和 Route 绑定都已确认，不要重建计划，也不要扩大重试范围；等待 Route 写入可见后，对同一固定 Page 集合做一次幂等重试，并保留首次失败和重试 receipt。

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
KOOBOO_VERIFY_URL=https://docs.kooboo.com pnpm docs:verify:kooboo
```

默认检查首页跳转后的英文首页与英文 API 页。需要增加路径时：

```bash
KOOBOO_VERIFY_URL=https://docs.kooboo.com \
KOOBOO_VERIFY_PATHS=/,/cms/index.html,/api/net/ip.html \
pnpm docs:verify:kooboo
```

验收命令必须同时满足：

- `vitepress-app.js` 与 `vitepress-style.css` 返回 200；
- `vitepress-runtime-data.js`、`vitepress-local-search.js` 与 `@localSearchIndexroot.js` 返回 200；
- 页面引用的是上述项目专属 URL；
- `window.__VITEPRESS__ === true`，证明客户端入口已执行；
- 等待网络稳定和水合后没有 `PAGE NOT FOUND`；
- 所有网络响应均无 4xx/5xx；
- 控制台没有 error；
- 页面没有未捕获异常。
- 点击 Search、输入 `k.net` 后能显示至少一条搜索结果。

任何一项失败，发布不得标记完成，也不得推进部署基线。

## 6. 故障判定

### SSR 页面一闪而过，随后变成 VitePress 404

优先检查页面模块命名、`vitepress-runtime-data.js` 中的 `__VP_HASH_MAP__` 与 `content-file/hashmap.json` 是否一致。不要先修改 RouteFinding Hook。

### 页面有 HTML，但完全没有样式或交互

检查所有全局资源，而不只检查 `.md.*` 页面模块：

```text
/assets/releases/<release>/vitepress-app.js
/assets/releases/<release>/vitepress-style.css
```

如果 `kb check` 显示同步但 HTTP 仍为 404，不要反复保存同一个异常 URL。创建项目专属新 URL、先验证新 URL 为 200，再更新 Page 引用。

### 搜索按钮存在，但点击后没有弹出搜索框

检查浏览器是否无法动态导入 `/assets/releases/<release>/vitepress-local-search.js`，并确认 `/assets/releases/<release>/@localSearchIndexroot.js` 返回 200。搜索模块是懒加载资源，只检查首页首次加载无法发现它缺失；必须执行真实点击和查询验收。

### `app.js` 返回脚本文本错误而不是 JavaScript

检查 RouteFinding Hook。Hook 只能重写以 `/` 结尾的目录 URL，不得包含顶层 `return`，也不得改写带扩展名的 JS、CSS、字体或图片请求。

## 7. 清理规则

新版本通过线上验收之前禁止 prune。页面模块命名迁移后，旧资源可能表现为 `remote_only`：

```text
assets/*.md.js
assets/*.md.lean.js
```

清理前必须确认所有待删除项都符合预期生成文件模式，先运行 preview，再显式确认删除。不要用宽范围 prune 顺手删除其他站点资源。

如果删除 API 返回 `Arg_NullReferenceException`，不能仅凭 HTTP 400 判断删除未发生。应立即按精确名称重新读取对象，并检查旧公开 URL：

- 对象仍存在且 Route 缺失：先把旧 URL 临时绑定回真实对象 ID，再重试精确删除；
- 对象已不存在：对同一固定删除项做幂等重试，receipt 应记录为 `already_absent`；
- 只有对象不存在且旧 URL 返回 404，才能确认清理完成。

删除后必须再次运行完整浏览器验收，确认新资源、页面水合和搜索仍然正常。

## 8. 发布收口清单

- [ ] stabilizer 测试通过；
- [ ] Kooboo 构建与导出通过；
- [ ] 全局入口使用项目专属 URL；
- [ ] 页面模块、公共 runtime data 的 hash map、`hashmap.json` 都使用 `stable`；
- [ ] 页面 HTML 不再内联 `__VP_HASH_MAP__` 或 `__VP_SITE_DATA__`；
- [ ] 支撑资源先于 Page 发布；
- [ ] 固定计划的 digest、artifact commit 和目标站点 ID 已核对；
- [ ] 支撑资源路由通过 `Route/Resolve` 指向正确对象；
- [ ] `docs:verify:kooboo` 通过；
- [ ] Preflight 无 BLOCKER；
- [ ] `git diff --check` 通过；
- [ ] 旧资源只在验收后精确清理；
- [ ] 删除项的对象状态和旧 URL 404 已复核；
- [ ] 清理后再次运行 `docs:verify:kooboo`；
- [ ] 部署基线只在所有检查通过后推进。
