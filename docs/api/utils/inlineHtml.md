# k.utils.inlineHtml

> 将页面或 URL 资源内联为 data URI

## 概述

`k.utils.inlineHtml` 把页面或相对 URL 中的外部资源（如图片、CSS 背景）转为内联 data URI，便于导出单文件 HTML。

## convertPageInline()

按**页面名称**转换。

```ts
const html = k.utils.inlineHtml.convertPageInline("Home")
```

## convertPageUrlInline()

按**页面相对 URL** 转换。

```ts
const html = k.utils.inlineHtml.convertPageUrlInline("/about")
```

## 相关文档

- [k.site.pages](../site/page.md)
