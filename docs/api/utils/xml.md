# k.utils.xml

> 解析与构建 XML 文档

## 概述

`k.utils.xml` 基于 `XDocument` 封装，提供 `parse`、`create` 及文档/元素/属性操作。

## parse()

解析 XML 字符串为 `Document`。

```ts
const doc = k.utils.xml.parse("<root><item id=\"1\">a</item></root>")
const xml = doc.stringify()
```

## create()

创建以指定根元素名开头的新文档。

```ts
const doc = k.utils.xml.create("root")
doc.root.addChild("item")
```

## Document

| 成员 | 说明 |
|------|------|
| `root` | 根 `Element` |
| `declaration` | XML 声明 |
| `stringify()` | 序列化为字符串 |

## Element

| 成员 / 方法 | 说明 |
|-------------|------|
| `name` / `value` | 元素名与文本 |
| `children` / `attributes` | 子元素与属性数组 |
| `addChild(name)` | 添加子元素 |
| `addAttribute(name, value)` | 添加属性 |
| `addCData(content)` | 添加 CDATA |
| `removeChild(name)` / `removeAttribute(name)` | 删除 |

## 相关文档

- [k.utils 概述](./index.md)
