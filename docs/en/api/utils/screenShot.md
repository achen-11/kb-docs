# k.utils.screenShot

> Web pages and page screenshots

## Overview

`k.utils.screenShot` Generates a PNG byte array for an absolute URL, site page, or HTML string.

## take()

Screenshot of **absolute URL**; supports `width`, `height`, `fullPage` and scaling parameter overloading.

```ts
const png = k.utils.screenShot.take("https://www.kooboo.com", 1280, 720, true)
```

## takeLocalPageUrl() / takePage()

Take a screenshot of the **relative path** or **page name** of the site.

## takeFromHTML()

Screenshot of HTML string after rendering.

## Related Docs

- [k.utils.puppeteer](./puppeteer.md)
