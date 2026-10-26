# KScript 语言与运行时

> 在哪里写 KScript、用哪种脚本类型、能用哪些全局对象、代码怎么复用、出错和超时怎么表现

本页回答的是「怎么写、在哪写、写完怎么运行」，具体 `k.*` 方法见 [KScript API（A–Z）](../index.md)。

## 概述

KScript 是 Kooboo 的**服务端**脚本语言：语法为 JavaScript / TypeScript，由站点在服务端执行，浏览器不会下载或运行它。前台浏览器脚本请写入 [Script 资源](/templateEngine/js/)，两者不要混在同一个 `<script>` 里。

服务端脚本里可直接使用全局对象 `k`（见下），并用 `return` 把结果作为响应输出。

## 在哪里写 KScript

| 位置 | 入口 | 特点 |
|------|------|------|
| **API** | 后台 [开发 → 代码](/cms/development/code) 的 `Api` 类型；[k.api](../api/) 注册路由 | 有独立 URL；接请求、返回 JSON 或 HTML |
| **CodeBlock** | 同上的 `CodeBlock` 类型；[k.site.codes](../site/code.md) | 无独立 URL；用于被其他脚本复用的函数库 |
| **页面内联脚本** | Page / Layout / View 中的 `<script env="server">` | 与模板同一次渲染，可直接给 `k-*` 绑定提供变量 |
| **组件脚本** | 后台 [开发 → 组件](/cms/development/views) 中插入的 **Server Script** 组件 | 复用已保存的 PageScript 资源 |
| **模块** | [k.module](../module/) / [CMS：模块](/cms/development/modules) | 带自己的目录、视图与 API，可安装与分发 |
| **定时任务** | `k.task.hour(1).run(fn)`（见 [k.module](../module/)） | 按间隔在服务端后台执行 |
| **支付回调** | `PaymentCallBack` 类型；`charge({ callbackCodeName })` | 由支付渠道回调触发 |

::: tip 页面脚本与模板绑定
`<script env="server">` 里声明的顶层变量会导出到本次渲染的全局作用域，因此同一页后续的 `k-content` / `k-for` 等绑定可以直接引用。语法细节见 [模板绑定语法](/templateEngine/binding/)。
:::

## 脚本类型：Classic 与 Module

Code 资源可以在编辑器中指定**脚本类型**（内嵌 PageScript、CodeBlock 等类型不显示该选项）：

| 类型 | 执行方式 | 能否用 `import` / `export` |
|------|----------|---------------------------|
| **Classic** | 在全局作用域执行 | **不能** |
| **Module** | 在自己的模块作用域执行 | **能** |

判断依据很简单：

- 需要 `import` 其他代码、或需要 `export` 函数给别的脚本用 → 选 **Module**。
- 只写一段直筒子逻辑、不引用外部文件 → **Classic** 即可。

::: warning 全局作用域的影响
Classic 脚本和页面内联脚本在全局作用域执行，顶层声明的同名变量会互相覆盖。变量多时请用 `var` / 独立的 Code 资源拆分，或改用 Module 类型获得独立作用域。
:::

## 页面里如何触发服务端执行

`<script>` 只有在明确标记为服务端脚本时才作为 KScript 执行：

```html
<script env="server">
    var msg = "hello"
</script>
<div k-content="msg"></div>
```

- **`env="server"`**：作为服务端 KScript 执行（推荐写法）。
- **`engine="kscript"`**：等价的老写法。
- **`env="client"`**：原样输出给浏览器执行。
- **两者都不写**：按普通浏览器脚本原样输出，**不会**作为 KScript 执行。

`env="server"` 会向下继承（写在父容器上，内部脚本也会按服务端执行）；`env="client"` 会截断继承。为免误伤内部的浏览器脚本，建议把属性直接写在需要执行的 `<script>` 上。

## 可用的全局对象

| 全局 | 说明 |
|------|------|
| `k` | 全部内置能力入口，见 [KScript API](../index.md)。站点可通过配置把 `k` 改名为其他前缀 |
| `t(...)` | 等价于 [`k.t()`](../label/) / [`k.label()`](../label/)，按当前语言取标签文案 |

没有 `console`、`fetch`、`require`、`window`、`document` 这类浏览器或 Node 全局对象。需要输出请用 [`k.response`](../response/)，需要记录日志请用 [`k.logger`](../logger/)，需要发请求请用 [`k.net`](../net/)。

## 代码复用与 import

Module 脚本用原生 ES `import`。导入目标由**前缀**决定：

| 写法 | 指向 |
|------|------|
| `import { x } from "Code:工具名"` | 站点中的 Code 资源（按名称或 Id） |
| `import { x } from "./工具名"` | 同上，相对写法按文件名解析为 Code |
| `import { x } from "Module:模块名/code/utils"` | 脚本模块内的文件（默认入口 `code/main`、`code/index`） |
| `import api from "ModuleApi:模块名/api/hello"` | 模块对外暴露的 API |
| `import { x } from "Raw:export const x = 1"` | 直接把字符串当模块源码 |

```ts
// Module 脚本：从 CodeBlock 引入函数
import { formatPrice } from "Code:Shop.Helpers"

k.api.get(() => {
    return { price: formatPrice(199) }
})
```

CodeBlock 用 `export function` 暴露函数：

```ts
// CodeBlock: Shop.Helpers
export function formatPrice(value: number): string {
    return "¥" + value.toFixed(2)
}
```

::: tip 与 k.import() 的区别
[`k.import("名称")`](../site/code.md) 是把指定 Code **按 Classic 方式执行一次并把它的输出写入当前响应**（同一次渲染内重复调用只执行一次）。它不返回函数，也不能取到 `export` 的内容；需要函数请用上面的 `import`。
:::

## 错误、日志与运行限制

| 项 | 行为 |
|----|------|
| 未捕获异常 | 记录到后台 [代码日志](/cms/development/code-log)；API 调用返回 **500**，响应体为错误消息 |
| 主动记录 | [`k.logger`](../logger/) 的 `debug` / `information` / `warning` / `error` / `critical` |
| 超时 | 默认 **60 秒**；可用请求参数 `__engine_timeout__` 覆盖单次请求 |
| 语句与递归 | 有上限保护（语句数、递归深度），死循环会被中断 |
| 执行方式 | **同步**执行，脚本在响应返回前跑完 |

脚本抛错时错误消息会带上 Code 名称与行列号，便于定位。需要给调用方稳定的错误结构时，用 `try / catch` 包住逻辑并返回统一 JSON：

```ts
k.api.get(() => {
    try {
        const item = k.DB.keyValue.get("config")
        if (!item) {
            k.response.statusCode(404)
            return { code: 404, message: "config not found" }
        }
        return { code: 0, data: item.toString() }
    } catch (error) {
        k.logger.error("Shop.Api", String(error))
        k.response.statusCode(500)
        return { code: 500, message: "internal error" }
    }
})
```

## 成员名大小写

- 根对象 `k`：**不区分大小写**，`k.Net` 与 `k.net` 等价。
- `k` 的子对象与模块：**只忽略首字母大小写**。`k.utils.CDN` 与 `k.utils.cdn` 不等价；`k.response.redirect` 与 `k.response.Redirect` 等价。

除上述范围外请**照抄文档中的大小写**。个别成员（如 `k.utils.CDN`、`k.net.IP`）本身以大写命名，写错其余字母会取不到值或得到 `undefined`。

## 类型提示从哪里来

在后台代码编辑器中，成员提示由平台按当前站点生成，包含站点自身的动态对象（OpenAPI、内容类型、参数配置、自定义电商数据等）。因此：

- 提示里**没有**的成员，通常意味着它已不再推荐使用（多为历史兼容入口），不要在新代码里依赖。
- 提示与本文档冲突时，先以实际运行结果为准，并反馈给文档维护者。

## 相关文档

- [KScript API（A–Z）](../index.md) — 全部 `k.*` 模块
- [API 快速开始](./) — 第一个接口
- [模板绑定语法](/templateEngine/binding/) — `<script env="server">` 与 `k-*` 绑定
- [CMS：代码](/cms/development/code) — 创建 API / CodeBlock / 脚本类型
- [代码日志](/cms/development/code-log) — 查看脚本运行日志与错误
