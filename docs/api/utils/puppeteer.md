# k.utils.puppeteer

> 无头浏览器截图（仅非线上环境）

## 概述

`k.utils.puppeteer` 使用 Puppeteer 对 URL 截图并保存到站点文件。

::: warning 环境限制
在 **Kooboo 线上服务器**（`IsOnlineServer`）调用会抛出异常，仅适合自建/本地环境。
:::

## screenshot()

```ts
k.utils.puppeteer.screenshot("https://example.com", "shots/page.png", {
    width: 1366,
    height: 768,
    fullPage: true,
    delaySeconds: 3
})
```

| 参数 | 说明 |
|------|------|
| `url` | 目标地址 |
| `savePath` | 站点内保存路径 |
| `options` | 可选：`delaySeconds`、`width`、`height`、`fullPage` |

## 相关文档

- [k.utils.screenShot](./screenShot.md) — 内置截图服务
