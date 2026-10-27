# 项目资源与目录

Kooboo CLI 根据本地文件所在目录识别站点资源。只有支持的资源目录和文件类型会参与拉取、推送和同步。

## 站点资源目录

| 本地目录 | 资源 | 支持的文件 |
|----------|------|------------|
| `src/api` | 后端 API | `.ts`、`.js` |
| `src/code` | CodeBlock | `.ts`、`.js` |
| `src/pagescript` | PageScript | `.ts`、`.js` |
| `src/page` | Page | `.html` |
| `src/layout` | Layout | `.html` |
| `src/view` | View | `.html` |
| `src/js` | 前端脚本 | `.js` |
| `src/css` | 前端样式 | `.css` |
| `src/job` | 定时任务 | `.ts` |
| `content-file` | 内容文件 | 不限制扩展名 |
| `images` | 媒体库文件 | 不限制扩展名 |
| `mcp-tools` | MCP 工具 | 直接子级 `.ts` 文件 |
| `src/module/<module-name>` | 模块资源 | 取决于模块子目录 |

`content-file`、`images` 和 `mcp-tools` 位于项目根目录，其他站点资源位于 `src` 下。

## 名称与路径

API、CodeBlock、PageScript、Page、Layout 和 View 的嵌套目录会转为点分名称。例如：

```text
src/code/services/user.ts       → services.user
src/view/common/header.html     → common.header
src/page/account/profile.html   → account.profile
```

Job 保留斜杠层级：

```text
src/job/order/sync.ts           → order/sync
```

Script 和 Style 的嵌套目录也会参与资源名称：

```text
src/js/app/index.js             → app.index.js
src/css/app/index.css           → app.index.css
```

如果脚本或样式需要稳定的公开访问地址，应在文件顶部显式声明 URL：

```js
// @k-url /assets/app.js
```

```css
/* @k-url /assets/app.css */
```

`src/js` 和 `src/css` 是本地资源分类目录，不应直接出现在页面引用的公开 URL 中。

## Page 和 API 的访问路径

Page 和 API 文件需要声明访问 URL，否则推送或同步时不会按预期保存：

```html
<!-- @k-url /products -->
```

```ts
// @k-url /api/products
```

URL 声明属于资源配置，不等同于本地文件路径。修改文件位置时，确认资源名称和公开 URL 都仍符合预期。

## 模块资源

模块资源位于：

```text
src/module/<module-name>/
```

常见子目录包括 `api`、`code`、`backend`、`view`、`js`、`css`、`root`、`img` 和 `file`。推送或同步模块前，优先使用模块或模块子目录作为目标范围，避免修改无关站点资源。

## 相关文档

- [拉取远端资源](../workflows/pull.md)
- [推送本地资源](../workflows/push.md)
- [持续同步](../workflows/sync.md)
