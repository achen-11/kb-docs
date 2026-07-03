# k.site

> Versioned site resources for the current site: pages, layouts, views, scripts, styles, codes, and menus.

## Overview

`k.site` is the unified entry point for structured resources stored in the current site. Use its submodules to create, update, delete, and inspect pages, layouts, views, scripts, styles, code resources, and menus.

::: tip Difference from `k.file` and the CMS file library
- **`k.site`** manages structured site resources with versioning and routing.
- **`k.file`** reads and writes ordinary files in the site directory. See [k.file](../file/file.md).
- **Content -> Files** manages the [CMS file library](/en/cms/content/files), which is separate from both `k.site` and `k.file`.
:::

## Submodule Navigation

| Member | Doc |
|--------|-----|
| `k.site.pages` | [page.md](./page.md) |
| `k.site.layouts` | [layout.md](./layout.md) |
| `k.site.views` | [view.md](./view.md) |
| `k.site.scripts` | [js.md](./js.md) |
| `k.site.styles` | [css.md](./css.md) |
| `k.site.codes` | [code.md](./code.md) — API and CodeBlock resources (`codeType`) |
| `k.site.menus` | [menu.md](./menu.md) — frontend navigation menus |
| `k.site.runJob` | [job.md](./job.md) — manually trigger scheduled jobs |

## Commonly Used Methods

### List()

Lists sites accessible to the current user. This is mainly useful in multi-site automation scenarios.

**Parameters:** None.

**Returns:** `Site[]` or a site summary array, depending on runtime output.

```ts
k.api.get("sites", () => {
    return k.site.List()
})
```

### createSite() / Get()

Creates or gets a site database instance by name. Most business logic uses the current site's `k.site` directly.

| Method | Parameters | Returns | Description |
|------|------|------|------|
| `createSite(name)` | `name: string` | `any` | Creates a site database instance |
| `Get(name)` | `name: string` | `any` | Gets a site database instance by name |

```ts
k.api.get("site", () => {
    const name = k.request.queryString.get("name")
    return k.site.Get(name)
})
```

### diskSpace

Queries the storage used by the site, for example `k.site.diskSpace.getSiteSize()`.

```ts
k.api.get("siteSize", () => {
    return k.site.diskSpace.getSiteSize()
})
```

## Related Docs

- [Template Engine](/en/templateEngine/) — how Layout, Page, and View resources are referenced in HTML
- [k.page](../page/) — Metadata of the currently rendered page (`k.page.setTitle`, etc.)
- [k.module](../module/) — script module context
- [k.label](../label/) — Multilingual `k.t` / `k.label`
- [Admin: Files](/en/cms/content/files) — CMS file library (not `k.file`)
