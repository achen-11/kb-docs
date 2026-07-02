# k.utils.CDN

> Current site CDN switch and cache time

## Overview

`k.utils.CDN` controls CDN behavior in the current request context (attribute name **`CDN`**, case sensitive).

## disableCDN() / enableCDN()

Turn off or enable CDN.

| Method | Parameter | Return | Description |
|------|------|------|------|
| `disableCDN()` | None | `void` | Do not use CDN for the current response |
| `enableCDN()` | None | `void` | Allow CDN for the current response |

## setCacheTime()

Set CDN cache minutes.

| Parameter | Type | Required | Description |
|------|------|------|------|
| `minutes` | `number` | Yes | CDN cache time in minutes |

**Returns:** `void`.

```ts
k.utils.CDN.enableCDN()
k.utils.CDN.setCacheTime(60)
```

For preview pages or APIs that must bypass CDN, disable CDN on the current response:

```ts
k.api.get("preview", () => {
    k.utils.CDN.disableCDN()
    return {
        now: k.utils.date.formate(k.utils.date.now),
        draft: k.request.queryString.get("id")
    }
})
```

## Related Docs

- [k.utils Overview](./index.md)
