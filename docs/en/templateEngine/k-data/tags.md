# k-data Tag Syntax

> Attributes and composition patterns for the tags used inside `<k-data>`.

## `k-data`

The root node for a data flow. Child tags run in order.

```html
<k-data>
    <!-- let / query / map / when / try / export -->
</k-data>
```

## `let`

Use `as` for the variable name and `default` for its default value:

```html
<let as="page_size" default="10" />
```

`let` can also read request input, access a field, or call a function:

```html
<let as="keyword" source="queryString" from="keyword" default="''" />
<let from="list[0]" as="firstItem" />
<let from="create_time" as="createdDate" use="dateFormat" params="'yyyy-MM-dd'" />
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `as` | Yes | Output variable name |
| `from` | No | Variable name, field path, or a request field when combined with `source` |
| `source` | No | `queryString`, `cookie`, `header`, `path`, or `form` (case-insensitive) |
| `use` | No | Built-in function name. See [Built-in Functions](./functions.md) |
| `params` | No | Function parameters as a JSON5 string, or a variable name |
| `default` | No | Default value as JSON5 or a variable name |

When `action="list"` returns a collection and you only need the first item: `<let from="items[0]" as="item" />`.

## `query`

Executes a query and writes the result into the variable named by `as`. A list query looks like this:

```html
<query
    as="articles"
    source="content"
    resource="article"
    action="list"
></query>
```

A paged query can specify filtering, page index, page size, and sorting:

```html
<query
    as="article_page"
    source="content"
    resource="article"
    action="paged"
    where="{title:'News'}"
    page-number="1"
    page-size="10"
    order-desc="create_time"
></query>
```

`<query>` must be inside `<k-data>` and must include an explicit `</query>` end tag.

| Attribute | Required | Description |
|-----------|----------|-------------|
| `as` | Yes | Result variable name |
| `source` | Yes | See [Query Sources](./query.md) |
| `resource` | Yes | Content folder name, commerce resource type, table name, and so on |
| `action` | Yes | `item`, `list`, or `paged` |
| `id` | For `item` | Record id or variable name, such as a product `seoName` |
| `select` | No | Comma-separated field list |
| `where` | No | JSON5 condition. See [Condition Expressions](./condition.md) |
| `order` | No | Ascending sort field |
| `order-desc` | No | Descending sort field |
| `page-number` | For `paged` | Page index as a variable name or integer |
| `page-size` | For `paged` | Page size |

### `action` and return shape

| action | Returns |
|--------|---------|
| `item` | A single object, or `null` when not found |
| `list` | An array of objects |
| `paged` | `{ list, total, pageIndex, pageSize, pageCount }` |

## `map`

Maps an array item by item, or builds a fresh object when `from` is omitted.

```html
<map from="articles" as="article_cards">
    <let from="id" as="id" />
    <let from="title" as="title" />
</map>
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `as` | Yes | Output variable name for the array or object |
| `from` | No | Source array or object. When omitted, child `let` tags build a new object |

## `when` / `else-if` / `else`

Conditional branches that only work inside `<k-data>`. The `test` attribute is a JSON5 condition.

```html
<when test="{status:{$eq:'published'}}">
    <query as="items" source="content" resource="blog" action="list"></query>
    <else-if test="{status:{$eq:'draft'}}">
        <let as="items" default="[]" />
    </else-if>
    <else>
        <redirect to="'/404'" />
    </else>
</when>
```

## `try` / `catch`

`try` must be followed immediately by a sibling `catch`, according to the parser convention.

```html
<try>
    <query as="orders" source="commerce" resource="order" action="list"></query>
</try>
<catch>
    <let as="orders" default="[]" />
</catch>
```

## `redirect`

Performs a server-side redirect.

```html
<redirect to="'/login'" />
```

| Attribute | Description |
|-----------|-------------|
| `to` | Target path as a variable name or JSON5 string such as `"'/login'"` |

## `export`

Exposes a variable to template bindings **outside** `<k-data>`.

```html
<export var="articles"></export>
<export var="article_page"></export>
```

| Attribute | Required | Description |
|-----------|----------|-------------|
| `var` | Yes | An already defined variable name |

Variables that are not exported are not visible in the template layer.

## Related

- [k-data Overview](./)
- [Query Sources](./query.md)
- [Built-in Functions](./functions.md)
- [Condition Expressions](./condition.md)
