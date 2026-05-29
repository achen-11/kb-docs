# k.utils.string

> 字符串与 HTML 文本处理（`KText`）

## 概述

脚本路径为 **`k.utils.string`**（对应 `KText` 类型）。

## 方法

| 方法 | 说明 |
|------|------|
| `removeHtml(input)` | 去除 HTML 标签 |
| `subString(input, start, count)` | 截取子串 |
| `sementicSubString(input, start, count)` | 按语义边界截取 |
| `replace(input, oldValue, newValue)` | 替换 |
| `remove(input, valueToRemove)` | 删除指定子串 |

```ts
const plain = k.utils.string.removeHtml("<p>Hi</p>")
const part = k.utils.string.subString("hello world", 0, 5)
```

## 相关文档

- [k.utils.dom](./dom.md) — HTML 文档解析
