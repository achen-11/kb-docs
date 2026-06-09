# k.utils.inlineHtml

> Inline a page or URL resource as a data URI

## Overview

`k.utils.inlineHtml` Converts external resources (such as images, CSS backgrounds) in pages or relative URLs to inline data URIs for easy export of single-file HTML.

## convertPageInline()

Convert by **Page Name**.

```ts
const html = k.utils.inlineHtml.convertPageInline("Home")
```

## convertPageUrlInline()

Convert by **Page Relative URL**.

```ts
const html = k.utils.inlineHtml.convertPageUrlInline("/about")
```

## Related Docs

- [k.site.pages](../site/page.md)
