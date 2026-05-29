# k.utils.sitemap

> 构建 XML Sitemap

## 概述

`k.utils.sitemap` 链式生成 [sitemaps.org](https://www.sitemaps.org/) 格式 XML。

## create()

返回可 `append` 的构建器。

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

| 参数 | 说明 |
|------|------|
| `loc` | 页面绝对 URL |
| `options` | 可选：`lastmod`、`changefreq`、`priority`（0.0–1.0）、`alternates`（语言 → URL） |

## build()

输出 XML 字符串。

## 相关文档

- [k.utils 概述](./index.md)
