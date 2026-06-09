# k.utils.dom

> HTML parsing and image extraction

## Overview

`k.utils.dom` (`DocumentObjectModel`) parses HTML and extracts text or image information.

## parse()

Parses HTML to internal `Document` and hooks it to the instance.

```ts
const dom = k.utils.dom.parse("<html><body><img src=\"/a.png\" /></body></html>")
```

## getText()

Extract plain text from HTML string.

```ts
const text = k.utils.dom.getText("<p>Hello</p>")
```

## hasImage

Whether `<img>` (attribute access) is included after parsing.

## images

The parsed image list contains `src` and `alt`.

## Related Docs

- [k.utils.string](./string.md)
