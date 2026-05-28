# k.site.event

> 在**脚本模块**中注册站点前台渲染生命周期钩子（非资源仓库 API）

## 概述

`k.site.event` **不能**像 `k.site.pages` 那样增删改查站点对象。它提供一组 **`onXxx(callback)`** 方法，在**脚本模块（Script Module）**的 **Task 脚本**里声明：当访客浏览站点、解析路由、匹配页面或渲染视图时，Kooboo 会调用你注册的回调。

典型用途：

- **路由**：未找到页面时重定向、改写 URL、按 User-Agent 分支
- **页面**：在找到页面前后注入逻辑、改写当前页对象
- **视图**：在渲染某个 `<view>` 前后替换或补全视图内容

::: warning 使用范围
- 回调须写在**已上线模块**的 **Task 脚本**中（与 `k.task` 定时任务共用同一段 `TaskJs` 配置）。
- 站点须开启 **前台事件**（`k.site.webSite.enableFrontEvents === true`），否则注册不会执行。
- 在普通 **API Code**（`codeType: "Api"`）里调用通常**不会**生效：事件任务只在模块 Task 脚本解析时注册。
:::

::: tip 与 `k.task` 的区别
| API | 触发时机 |
|-----|----------|
| **`k.site.event.onXxx`** | 每次 HTTP 前台请求在路由 / 页面 / 视图管线中触发 |
| **`k.task.day().hour().run()`**（经 `k.module.task`） | 按间隔在后台定时执行 |

详见 [k.module](./module.md)。
:::

## 渲染管线与事件（简图）

```
HTTP 请求
  → onRouteFinding / onRouteFound / onRouteNotFound   （路由）
  → onPageFinding / onPageFound                       （页面）
  → onViewFinding / onViewFound / onViewNotFound      （视图）
  → 输出 HTML
```

同一站点可安装多个模块；每个模块可各注册一个同类型事件，执行顺序为模块注册顺序。

## TypeScript 定义（节选）

```ts
interface KEvent {
  onViewFound(fn: (p: ViewPara) => void): void;
  onViewFinding(fn: (p: ViewPara) => void): void;
  onViewNotFound(fn: (p: ViewPara) => void): void;
  onPageFound(fn: (p: PagePara) => void): void;
  onPageFinding(fn: (p: PagePara) => void): void;
  onRouteFound(fn: (p: RoutePara) => void): void;
  onRouteFinding(fn: (p: RoutePara) => void): void;
  onRouteNotFound(fn: (p: RoutePara) => void): void;
}

interface ViewPara {
  name: string;
  view: View;
}

interface PagePara {
  url: string;
  culture: string;
  page: Page;
}

interface RoutePara {
  url: string;
  userAgent: string;
  culture: string;
  route: Route;
}
```

## 路由事件

### onRouteFinding

路由**解析过程中**触发，可改写 `url`、`culture`，或设置 `route` 改变匹配结果。

```js
k.site.event.onRouteFinding(function (e) {
    if (e.url === "/old-path") {
        e.url = "/new-path"
    }
})
```

### onRouteFound

已匹配到路由后触发，可替换 `route`。

### onRouteNotFound

无匹配路由时触发，可设置 `route` 实现「软 404」或 fallback 页面。

```js
k.site.event.onRouteNotFound(function (e) {
    k.logger.info("404: " + e.url + " UA: " + e.userAgent)
})
```

## 页面事件

### onPageFinding

查找页面前触发，可修改 `page`（例如动态指定要渲染的页）。

### onPageFound

已解析到页面后触发，可替换 `page` 对象。

```js
k.site.event.onPageFound(function (e) {
  // e.url、e.culture、e.page
})
```

## 视图事件

### onViewFinding / onViewFound / onViewNotFound

在渲染具名视图 `<view id="...">` 时触发。`ViewPara.name` 为视图名，`ViewPara.view` 为视图对象；**Finding / NotFound** 阶段可赋值 `view` 以替换默认解析结果。

```js
k.site.event.onViewFound(function (e) {
    if (e.name === "header") {
        // 可读取 e.view，或在允许的阶段替换视图
    }
})
```

## 模块 Task 脚本示例

在 Kooboo 控制台 → **脚本模块** → 某模块 → **Task** 脚本中写入（保存后模块须 **上线**）：

```js
// 与 k.task 定时任务可写在同一 Task 脚本文件中
k.site.event.onRouteNotFound(function (e) {
    k.logger.debug("route not found: " + e.url)
})

k.task.minute(30).run(function () {
    k.logger.info("module heartbeat: " + k.module.name)
})
```

## 前置条件：开启前台事件

```ts
k.api.get(() => {
    return {
        enableFrontEvents: k.site.webSite.enableFrontEvents
    }
})
```

若为 `false`，须在站点设置中启用前台事件后，模块内注册的 `k.site.event` 才会在访客请求时执行。

## 回调内可用 API

事件在**模块执行上下文**中运行，通常可使用：

- `k.module.name`、`k.module.config`
- `k.logger`、`k.dataContext`
- `k.site.*` 其它只读或管理 API（视权限与场景而定）

勿假设一定能使用 `k.request` / `k.response` 的全部能力——此时处于渲染管线，而非独立 API 请求。

## 相关文档

- [k.module](./module.md) — 模块上下文与 `k.module.task`
- [k.site](./site.md)
- [k.site.pages](./page.md) — 页面资源
- [k.site.views](./view.md) — 视图资源
- [k.logger](../logger/k-logger.md)
