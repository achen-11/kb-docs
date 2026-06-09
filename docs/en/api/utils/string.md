# k.utils.string

> String and HTML text processing (`KText`)

## Overview

The script path is **`k.utils.string`** (corresponding to `KText` type).

## Methods

| Method | Description |
|------|------|
| `removeHtml(input)` | Remove HTML tags |
| `subString(input, start, count)` | Intercept substring |
| `sementicSubString(input, start, count)` | Intercept according to semantic boundaries |
| `replace(input, oldValue, newValue)` | replace |
| `remove(input, valueToRemove)` | Delete specified substring |

```ts
const plain = k.utils.string.removeHtml("<p>Hi</p>")
const part = k.utils.string.subString("hello world", 0, 5)
```

## Related Docs

- [k.utils.dom](./dom.md) — HTML document parsing
