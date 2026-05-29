# k.utils.screenShot

> 网页与页面截图

## 概述

`k.utils.screenShot` 对绝对 URL、站点页面或 HTML 字符串生成 PNG 字节数组。

## take()

对**绝对 URL** 截图；支持 `width`、`height`、`fullPage` 及缩放参数重载。

```ts
const png = k.utils.screenShot.take("https://www.kooboo.com", 1280, 720, true)
```

## takeLocalPageUrl() / takePage()

对站点**相对路径**或**页面名称**截图。

## takeFromHTML()

对 HTML 字符串渲染后截图。

## 相关文档

- [k.utils.puppeteer](./puppeteer.md)
