# JSON5 条件表达式

> 用于 `<query where="...">` 与 `<when test="...">`

不写 SQL 字符串，使用 JSON5 对象描述过滤与分支条件。

## 支持的操作符

仅支持以下 10 个操作符：

`$and`、`$or`、`$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte`、`$contains`、`$startswith`

---

## 基础写法

**字段直写**（等价 `$eq`）：

```json5
{ status: 'published' }
```

**显式操作符**：

```json5
{ age: { $gte: 18 } }
```

**组合**：

```json5
{
  $and: [
    { status: { $eq: 'published' } },
    { title: { $contains: keyword } }
  ]
}
```

---

## 操作符说明

| 操作符 | 含义 | 示例 |
|--------|------|------|
| `$eq` | 等于 | `{ id: { $eq: '123' } }` |
| `$ne` | 不等于 | `{ status: { $ne: 'deleted' } }` |
| `$gt` | 大于 | `{ score: { $gt: 90 } }` |
| `$gte` | 大于等于 | `{ price: { $gte: 100 } }` |
| `$lt` | 小于 | `{ stock: { $lt: 10 } }` |
| `$lte` | 小于等于 | `{ level: { $lte: 3 } }` |
| `$contains` | 包含（常用于字符串） | `{ title: { $contains: 'hello' } }` |
| `$startswith` | 前缀 | `{ code: { $startswith: 'SKU-' } }` |
| `$and` | 全部成立 | `{ $and: [ {...}, {...} ] }` |
| `$or` | 任一成立 | `{ $or: [ {...}, {...} ] }` |

条件里可引用 `<let>` 定义的变量名（如 `keyword`、`min_age`）。

---

## 在 query 中使用

```html
<let as="keyword" source="queryString" from="keyword" default="''" />
<let as="min_age" source="queryString" from="min_age" default="18" />
<query
    as="user_page"
    source="content"
    resource="user"
    action="paged"
    where="{
        $and: [
            { age: { $gte: min_age } },
            { $or: [
                { name: { $contains: keyword } },
                { email: { $startswith: keyword } }
            ]},
            { status: { $ne: 'disabled' } }
        ]
    }"
    page-number="1"
    page-size="20"
/>
```

---

## 在 when 中使用

```html
<when test="{ status: { $eq: 'published' } }">
    <query as="items" source="content" resource="blog" action="list" />
    <else-if test="{ status: { $eq: 'draft' } }">
        <let as="items" default="[]" />
    </else-if>
    <else>
        <let as="items" default="[]" />
    </else>
</when>
```

---

## 相关文档

- [标签语法](./tags.md)
- [query 数据源](./query.md)
