# k.utils.sitemap

> Build XML Sitemap

## Overview

`k.utils.sitemap` chain generates [sitemaps.org](https://www.sitemaps.org/) format XML.

## create()

Returns a builder that can be `append`.

```ts
const xml = k.utils.sitemap.create()
    .append("https://www.example.com/page1", {
        lastmod: "2024-01-01",
        changefreq: "weekly",
        priority: 0.8
    })
    .append("https://www.example.com/page2", {
        alternates: { en: "https://www.example.com/en", zh: "https://www.example.com/zh" }
    })
    .build()
```

## append()

| parameter | illustrate |
|------|------|
| `loc` | Page absolute URL |
| `options` | Optional: `lastmod`, `changefreq`, `priority` (0.0–1.0), `alternates` (language → URL) |

## build()

Output XML string.

## Related Docs

- [k.utils Overview](./index.md)
