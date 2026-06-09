# k.utils.CDN

> Current site CDN switch and cache time

## Overview

`k.utils.CDN` controls CDN behavior in the current request context (attribute name **`CDN`**, case sensitive).

## disableCDN() / enableCDN()

Turn off or enable CDN.

## setCacheTime()

Set CDN cache minutes.

```ts
k.utils.CDN.enableCDN()
k.utils.CDN.setCacheTime(60)
```

## Related Docs

- [k.utils Overview](./index.md)
