# KScript Language and Runtime

> Where KScript runs, which script type to pick, what globals exist, how to reuse code, and how errors and limits behave

This page covers **how to write and run** server scripts. For the individual `k.*` methods see [KScript API (A–Z)](../index.md).

## Overview

KScript is Kooboo's **server-side** scripting language: the syntax is JavaScript / TypeScript and the site executes it on the server. The browser never downloads or runs it. For browser code use a [Script resource](/en/templateEngine/js/) instead, and keep the two kinds of code in separate `<script>` tags.

Inside a server script the global object `k` is available, and whatever you `return` is written to the response.

## Where you can write KScript

| Place | Entry point | Characteristics |
|------|------|------|
| **API** | `Api` type under [Development → Code](/en/cms/development/code); routes registered with [k.api](../api/) | Has its own URL; takes a request and returns JSON or HTML |
| **CodeBlock** | The `CodeBlock` type in the same place; [k.site.codes](../site/code.md) | No URL of its own; a reusable function library for other scripts |
| **Inline page script** | `<script env="server">` inside a Page / Layout / View | Runs in the same render pass and can feed `k-*` bindings directly |
| **Component script** | A **Server Script** component inserted in [Development → Views](/en/cms/development/views) | Reuses a saved PageScript resource |
| **Module** | [k.module](../module/) / [CMS: Modules](/en/cms/development/modules) | Has its own folder, views and API; installable and shareable |
| **Scheduled task** | `k.task.hour(1).run(fn)` (see [k.module](../module/)) | Runs in the background on an interval |
| **Payment callback** | The `PaymentCallBack` type; `charge({ callbackCodeName })` | Triggered by the payment provider |

::: tip Page scripts and template bindings
Top-level variables declared in `<script env="server">` are exported to the global scope of that render, so later `k-content` / `k-for` bindings on the same page can read them. See [Template binding syntax](/en/templateEngine/binding/) for the details.
:::

## Script types: Classic and Module

A Code resource can be given a **script type** in the editor (embedded PageScripts, CodeBlocks and some other types do not show this field):

| Type | How it runs | `import` / `export` |
|------|----------|---------------------------|
| **Classic** | In the global scope | **Not available** |
| **Module** | In its own module scope | **Available** |

The rule of thumb:

- Need to `import` other code, or `export` functions for others → choose **Module**.
- A straight-line snippet that references nothing else → **Classic** is fine.

::: warning Global scope caveats
Classic scripts and inline page scripts run in the global scope, so top-level variables with the same name overwrite each other. Split logic into separate Code resources, or use the Module type to get an isolated scope.
:::

## Making a `<script>` run on the server

A `<script>` tag only runs as KScript when it is explicitly marked as a server script:

```html
<script env="server">
    var msg = "hello"
</script>
<div k-content="msg"></div>
```

- **`env="server"`**: runs as server-side KScript (recommended).
- **`engine="kscript"`**: equivalent legacy form.
- **`env="client"`**: emitted as-is for the browser.
- **Neither attribute**: emitted as an ordinary browser script and **not** executed as KScript.

`env="server"` is inherited by descendants (put it on a parent container and nested scripts run on the server too); `env="client"` stops that inheritance. To avoid capturing browser scripts by accident, put the attribute on the `<script>` that actually needs it.

## Available globals

| Global | Description |
|------|------|
| `k` | Entry point for all built-in capabilities, see [KScript API](../index.md). A site can rename `k` to another prefix through configuration |
| `t(...)` | Equivalent to [`k.t()`](../label/) / [`k.label()`](../label/), resolving a label for the current language |

There is no `console`, `fetch`, `require`, `window` or `document`. Use [`k.response`](../response/) to output, [`k.logger`](../logger/) to log, and [`k.net`](../net/) to make requests.

## Reusing code and import specifiers

Module scripts use native ES `import`. The **prefix** decides where the module is loaded from:

| Form | Target |
|------|--------|
| `import { x } from "Code:Helpers"` | A site Code resource (by name or Id) |
| `import { x } from "./Helpers"` | Same; a relative path resolves to a Code by file name |
| `import { x } from "Module:myModule/code/utils"` | A file inside a script module (default entries `code/main`, `code/index`) |
| `import api from "ModuleApi:myModule/api/hello"` | An API exposed by a module |
| `import { x } from "Raw:export const x = 1"` | Treats the string itself as module source |

```ts
// Module script: import a helper from a CodeBlock
import { formatPrice } from "Code:Shop.Helpers"

k.api.get(() => {
    return { price: formatPrice(199) }
})
```

A CodeBlock exposes functions with `export function`:

```ts
// CodeBlock: Shop.Helpers
export function formatPrice(value: number): string {
    return "$" + value.toFixed(2)
}
```

::: tip Difference from k.import()
[`k.import("name")`](../site/code.md) runs the named Code **as Classic once and writes its output into the current response** (a second call in the same render is a no-op). It does not return functions and cannot see `export`ed values; use the `import` form above when you need functions.
:::

## Errors, logging and runtime limits

| Item | Behavior |
|----|------|
| Uncaught exception | Recorded in the admin [code log](/en/cms/development/code-log); an API call returns **500** with the error message as the body |
| Explicit logging | [`k.logger`](../logger/) with `debug` / `information` / `warning` / `error` / `critical` |
| Timeout | **60 seconds** by default; override per request with the `__engine_timeout__` request parameter |
| Statements and recursion | Guarded by limits (statement count, recursion depth); infinite loops are interrupted |
| Execution model | **Synchronous** — the script finishes before the response is returned |

Errors carry the Code name plus line and column, which makes them easy to locate. When callers need a stable error shape, wrap the logic in `try / catch` and return one JSON contract:

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

## Member name casing

- The root object `k`: **case-insensitive** — `k.Net` and `k.net` are equivalent.
- Sub-objects and modules of `k`: **only the first character's case is ignored**. `k.utils.CDN` is not the same as `k.utils.cdn`; `k.response.redirect` and `k.response.Redirect` are equivalent.

Outside those rules, **copy the casing used in this documentation**. A few members are uppercase by design (`k.utils.CDN`, `k.net.IP`); changing any other letter resolves to nothing or to `undefined`.

## Where type hints come from

In the admin code editor, member hints are generated per site and include that site's dynamic objects (OpenAPI, content types, parameter config, custom commerce data, and so on). Therefore:

- A member that has **no hint** normally means it is no longer recommended (usually a legacy compatibility entry). Do not rely on it in new code.
- If a hint contradicts this documentation, trust the actual runtime result first and report the difference to the docs maintainers.

## Related Docs

- [KScript API (A–Z)](../index.md) — every `k.*` module
- [API Getting Started](./) — your first endpoint
- [Template binding syntax](/en/templateEngine/binding/) — `<script env="server">` and `k-*` bindings
- [Admin CMS: Code](/en/cms/development/code) — creating APIs, CodeBlocks and script types
- [Code log](/en/cms/development/code-log) — script run logs and errors
