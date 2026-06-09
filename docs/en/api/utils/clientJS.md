# k.utils.clientJS

> Output client-side JavaScript variables to the page

## Overview

`k.utils.clientJS` injects `<script>` into the current HTML response and exposes the server object to the browser in the form of `JSON.parse` (must be in the page rendering process).

## setVariable()

```ts
const data = { firstname: "Kooboo", count: 3 }
k.utils.clientJS.setVariable("pageData", data)
// Browser output: var pageData = JSON.parse("...")
```

| parameter | type | illustrate |
|------|------|------|
| `key` | `string` | global variable name |
| `obj` | `any` | JSON serializable objects |

## monacoResource()

Returns the resource tag HTML fragment required by the Monaco editor for use by callback `onload`.

## i18n()

Returns the current site multi-language configuration object.

```ts
const cfg = k.utils.clientJS.i18n()
const all = k.utils.clientJS.i18n(true)
```

## Related Docs

- [k.label](../label/) — multilingual tags
