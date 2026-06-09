# k.utils.xml

> Parse and build XML documents

## Overview

`k.utils.xml` is based on the `XDocument` package and provides `parse`, `create` and document/element/attribute operations.

## parse()

Parses the XML string as `Document`.

```ts
const doc = k.utils.xml.parse("<root><item id=\"1\">a</item></root>")
const xml = doc.stringify()
```

## create()

Creates a new document starting with the specified root element name.

```ts
const doc = k.utils.xml.create("root")
doc.root.addChild("item")
```

## Document

| Member | Description |
|------|------|
| `root` | Root `Element` |
| `declaration` | XML declaration |
| `stringify()` | serialize to string |

## Element

| members/methods | Description |
|-------------|------|
| `name` / `value` | Element name and text |
| `children` / `attributes` | Child elements and attribute arrays |
| `addChild(name)` | Add child element |
| `addAttribute(name, value)` | Add properties |
| `addCData(content)` | Add CDATA |
| `removeChild(name)` / `removeAttribute(name)` | delete |

## Related Docs

- [k.utils Overview](./index.md)
