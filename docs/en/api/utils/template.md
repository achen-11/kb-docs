# k.utils.template

> View and page rendering

## Overview

`k.utils.template` Renders Kooboo **View** or **Page** HTML on the server side.

## render()

Renders a view tag or view ID string, returning HTML.

```ts
const html = k.utils.template.render("<view id=\"...\"></view>")
```

## executeView()

Execution view (side effects are written to the current response context, no strings are returned).

## renderView()

Render HTML by view name or Id.

## renderPage()

Renders a full page of HTML by page URL.

```ts
const pageHtml = k.utils.template.renderPage("/products")
```

## Related Docs

- [k.site.views](../site/view.md)
- [k.site.pages](../site/page.md)
