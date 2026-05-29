# k.utils.date

> 日期时间与格式化

## 概述

`k.utils.date` 提供当前时间与 `DateTime` 运算、格式化。

## 属性

| 属性 | 说明 |
|------|------|
| `utcNow` | UTC 当前时间 |
| `now` | 本地当前时间 |

## formate()

格式化日期（方法名为源码拼写 `formate`）。

```ts
const s = k.utils.date.formate(k.utils.date.now, "yyyy-MM-dd")
const s2 = k.utils.date.formate(k.utils.date.now) // 默认格式
```

## addSeconds / addMinutes / addHours / addDays / addMonths / addYears

对给定 `DateTime` 做偏移，返回新时间。

```ts
const tomorrow = k.utils.date.addDays(k.utils.date.now, 1)
```

## 相关文档

- [k.utils 概述](./index.md)
