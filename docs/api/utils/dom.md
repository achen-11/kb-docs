# k.utils.dom

> HTML 解析与图片提取

## 概述

`k.utils.dom`（`DocumentObjectModel`）解析 HTML 并提取文本或图片信息。

## parse()

解析 HTML 为内部 `Document`，并挂到实例上。

```ts
const dom = k.utils.dom.parse("<html><body><img src=\"/a.png\" /></body></html>")
```

## getText()

从 HTML 字符串提取纯文本。

```ts
const text = k.utils.dom.getText("<p>Hello</p>")
```

## hasImage

解析后是否包含 `<img>`（属性访问）。

## images

解析后的图片列表，项含 `src`、`alt`。

## 相关文档

- [k.utils.string](./string.md)
