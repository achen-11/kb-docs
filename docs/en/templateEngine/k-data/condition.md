# JSON5 Condition Expressions

> Used by `<query where="...">` and `<when test="...">`.

Instead of SQL-like strings, use JSON5 objects to describe filtering and branching conditions.

## Supported Operators

Only these 10 operators are supported:

`$and`, `$or`, `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$contains`, `$startswith`

## Basic Forms

Field shorthand, equivalent to `$eq`:

```json5
{ status: 'published' }
```

Explicit operator:

```json5
{ age: { $gte: 18 } }
```

Combined form:

```json5
{
  $and: [
    { status: { $eq: 'published' } },
    { title: { $contains: keyword } }
  ]
}
```

## Operator Reference

| Operator | Meaning | Example |
|----------|---------|---------|
| `$eq` | Equals | `{ id: { $eq: '123' } }` |
| `$ne` | Not equal | `{ status: { $ne: 'deleted' } }` |
| `$gt` | Greater than | `{ score: { $gt: 90 } }` |
| `$gte` | Greater than or equal | `{ price: { $gte: 100 } }` |
| `$lt` | Less than | `{ stock: { $lt: 10 } }` |
| `$lte` | Less than or equal | `{ level: { $lte: 3 } }` |
| `$contains` | Contains, often for strings | `{ title: { $contains: 'hello' } }` |
| `$startswith` | Prefix match | `{ code: { $startswith: 'SKU-' } }` |
| `$and` | All conditions must match | `{ $and: [ {...}, {...} ] }` |
| `$or` | Any condition may match | `{ $or: [ {...}, {...} ] }` |

Conditions can reference variables defined by `<let>`, such as `keyword` or `min_age`.

## Using Conditions in `query`

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

## Using Conditions in `when`

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

## Related

- [Tag Syntax](./tags.md)
- [Query Sources](./query.md)
