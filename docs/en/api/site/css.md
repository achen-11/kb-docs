# k.site.styles

> Addition, deletion, modification and query of site CSS style resources, routing URL and version log

## Overview

`k.site.styles` Manages **Style** resources (stand-alone CSS files) in the site. Styles are externally accessible through routed URLs (such as `/site.css`) and can be referenced in pages or layouts.

::: The difference between tip and layouts / views
`k.site.styles` supports **`getByUrl`**, **`getUrl`**, **`getAbsUrl`** and other routing-related APIs (similar to [k.site.pages](./page.md)); [k.site.layouts](./layout.md) and [k.site.views](./view.md) have no routing API.
:::

The sidebar entry "css" is this API.

## TypeScript definition (excerpt)

```ts
interface StyleRepository {
  add(style: StyleInput): void;
  all(): Style[];
  get(nameOrId: string): Style | null;
  getByUrl(url: string): Style | null;
  update(style: Style): void;
  updateBody(nameOrId: string, body: string): void;
  delete(nameOrId: string): void;
  getUrl(id: string): string | null;
  getAbsUrl(id: string): string | null;
  getLogs(nameOrId: string): ChangeLog[] | null;
  getByLog(logId: number): Style | null;
}

interface StyleInput {
  name: string;
  body: string;
  url?: string;
}
```

## add()

Create styles and register routes. If `url` is not passed, it defaults to `/{name}`, and if the path does not contain an extension, the style extension (usually `.css`) will be added automatically.

| Field | Type | Required | Description |
|------|------|------|------|
| name | `string` | yes | Style name (unique) |
| body | `string` | yes | CSS content |
| url | `string` | no | Access path, such as `/assets/theme.css` |

```ts
k.api.post(() => {
    const stamp = Date.now().toString()
    const name = "ai-style-" + stamp
    const url = "/ai-style-" + stamp + ".css"

    k.site.styles.add({
        name,
        url,
        body: `.ai-style-${stamp} { color: #333; }`
    })

    const style = k.site.styles.getByUrl(url)
    return {
        verified: !!style && style.name === name,
        id: style?.id,
        route: style ? k.site.styles.getUrl(style.id) : null
    }
})
```

## all()

Return all styles.

```ts
k.api.get(() => {
    const styles = k.site.styles.all()
    return { count: styles.length, names: styles.slice(0, 10).map((s) => s.name) }
})
```

## get()

Get a style by name or Id.

```ts
k.api.get(() => {
    const style = k.site.styles.get("site")
    return style ? { id: style.id, name: style.name, extension: style.extension } : null
})
```

## getByUrl()

Get the style by **routing URL** (e.g. `/main.css`).

```ts
k.api.get(() => {
    const style = k.site.styles.getByUrl("/main.css")
    return style ? { id: style.id, name: style.name } : null
})
```

## update()

Update the complete style object (usually `get` / `getByUrl` first and then `body`).

```ts
k.api.post(() => {
    const stamp = Date.now().toString()
    const name = "ai-style-upd-" + stamp
    const url = "/ai-style-upd-" + stamp + ".css"

    k.site.styles.add({ name, url, body: ".v1 {}" })
    const style = k.site.styles.getByUrl(url)
    style.body = ".v2 {}"
    k.site.styles.update(style)

    const after = k.site.styles.getByUrl(url)
    return {
        verified: after?.body?.indexOf("v2") >= 0,
        hasV1: after?.body?.indexOf("v1") >= 0
    }
})
```

## updateBody()

Only updates `body`.

```ts
k.api.post(() => {
    const stamp = Date.now().toString()
    const name = "ai-style-body-" + stamp
    const url = "/ai-style-body-" + stamp + ".css"

    k.site.styles.add({ name, url, body: ".before {}" })
    k.site.styles.updateBody(name, ".after-body {}")

    const after = k.site.styles.getByUrl(url)
    return { verified: after?.body?.indexOf("after-body") >= 0 }
})
```

## delete()

Delete by Name or Id. Use `get(name)` for verification after deletion. Do not rely on `getByUrl` after deletion.

```ts
k.api.post(() => {
    const stamp = Date.now().toString()
    const name = "ai-style-del-" + stamp
    const url = "/ai-style-del-" + stamp + ".css"

    k.site.styles.add({ name, url, body: ".del {}" })
    const before = k.site.styles.getByUrl(url)

    k.site.styles.delete(name)
    const after = k.site.styles.get(name)

    return {
        verified: !!before && !after,
        hadBefore: !!before
    }
})
```

## getUrl() / getAbsUrl()

```ts
k.api.get(() => {
    const styles = k.site.styles.all()
    for (const style of styles) {
        const rel = k.site.styles.getUrl(style.id)
        if (!rel) continue
        const abs = k.site.styles.getAbsUrl(style.id)
        return { relative: rel, absolute: abs }
    }
    return null
})
```

Only styles with registered routes can return URLs; styles embedded in the page may not have independent routes.

## getLogs() / getByLog()

```ts
k.api.get(() => {
    const styles = k.site.styles.all()
    if (!styles.length) return { error: "no styles" }

    const logs = k.site.styles.getLogs(styles[0].id)
    return {
        verified: logs === null || Array.isArray(logs),
        logCount: logs ? logs.length : 0
    }
})
```

## Style object (common fields)

| Field | Type | Description |
|------|------|------|
| ID | `string` | StyleId |
| name | `string` | name |
| body | `string` | CSS content |
| extension | `string` | extension, usually `css` |
| media | `string` | Media query (such as `screen`) |
| online | `boolean` | Is it online? |
| version | `number` | version number |

## Related Docs

- [k.site](./)
- [k.site.scripts](./js.md)
- [k.site.pages](./page.md)
