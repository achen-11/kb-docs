# k.utils.puppeteer

> Headless browser screenshot (non-online environment only)

## Overview

`k.utils.puppeteer` Use Puppeteer to screenshot the URL and save it to a site file.

::: warning environment restrictions
Calling **Kooboo Online Server** (`IsOnlineServer`) will throw an exception and is only suitable for self-built/local environments.
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

| parameter | illustrate |
|------|------|
| `url` | destination address |
| `savePath` | Save path within site |
| `options` | Optional: `delaySeconds`, `width`, `height`, `fullPage` |

## Related Docs

- [k.utils.screenShot](./screenShot.md) — Built-in screenshot service
