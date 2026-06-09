# Query Sources

> How `<query>` combines `source`, `resource`, and `action`.

For common attributes, see [Tag Syntax](./tags.md#query). The sections below are organized by data source. In all cases, `action` is one of `item`, `list`, or `paged`.

## Pagination Result Fields

When `action="paged"` is used, the variable assigned by `as` contains:

| Field | Description |
|-------|-------------|
| `list` | Array of records for the current page |
| `total` | Total record count |
| `pageIndex` | Current page number |
| `pageSize` | Page size |
| `pageCount` | Total page count |

## `content`

`resource` is the **content type name** (Content Folder).

### `item`

```html
<k-data>
    <let as="article_id" source="queryString" from="id" />
    <query
        as="article_detail"
        source="content"
        resource="article"
        action="item"
        id="article_id"
        select="id,title,body"
    />
    <export var="article_detail" />
</k-data>
<div k-if="article_detail">
    <h1 k-content="article_detail.title"></h1>
    <div k-content="article_detail.body"></div>
</div>
```

### `list`

```html
<query
    as="articles"
    source="content"
    resource="article"
    action="list"
    select="id,title"
    where="{title:{$contains:'news'}}"
/>
```

### `paged`

```html
<query
    as="article_paged"
    source="content"
    resource="article"
    action="paged"
    where="{title:{$contains:'news'}}"
    page-number="1"
    page-size="10"
    order-desc="createDate"
/>
<div k-for="item in article_paged.list" repeat-self>
    <h2 k-content="item.title"></h2>
</div>
```

## `commerce`

`resource` only supports these fixed values: `product`, `category`, `cart`, and `order`.

### `product`

| action | Description |
|--------|-------------|
| `item` | `id` is a product id or **seoName** |
| `list` / `paged` | `where` supports fields such as `id`, `title`, `featuredImage`, `active`, `seoName`, and `tags`. `where.category` accepts a category id or seoName and includes child categories |

```html
<query
    as="products"
    source="commerce"
    resource="product"
    action="list"
    where="{category:'men-shirt',title:{$contains:'shoe'}}"
/>
```

### `category`

| action | Description |
|--------|-------------|
| `item` | `id` is a category id or seoName |
| `list` / `paged` | `where` supports fields such as `id`, `title`, `seoName`, `parentId`, `active`, and `tags` |

### `cart`

- Only supports **`action="item"`**
- `id` is optional and defaults to the current-context cart id

```html
<query as="cart_detail" source="commerce" resource="cart" action="item" />
```

### `order`

| action | Restriction |
|--------|-------------|
| `item` | Requires `id` |
| `list` / `paged` | Does **not** support `where`, `order`, or `order-desc`; results are sorted by create time descending |

## `sqlite` / `mysql` / `sqlserver`

These three sources share the same `<query>` attributes. `resource` is the **table name**.

```html
<let as="record_id" source="queryString" from="id" />
<query
    as="payment_record"
    source="sqlite"
    resource="payment_records"
    action="item"
    id="record_id"
    select="id,amount,status"
/>
```

```html
<query
    as="user_paged"
    source="mysql"
    resource="users"
    action="paged"
    select="id,name,email"
    where="{name:{$contains:'tom'}}"
    page-number="page_number"
    page-size="10"
    order="name"
/>
```

## `indexeddb`

Similar to a database query. `resource` is the object store name.

```html
<query
    as="draft_paged"
    source="indexeddb"
    resource="drafts"
    action="paged"
    where="{status:{$eq:'published'}}"
    page-number="1"
    page-size="10"
    order-desc="id"
/>
```

## `culture`

Used for multilingual links. Set `source="culture"`. `resource` is the **relative path** to inspect. If omitted, the current request path is used.

### `item`

- `id`: culture code. If omitted, the current-context culture is used.
- Returns `{ key, name, url, isActive }` or `null`

```html
<let as="lang" source="queryString" from="lang" />
<query
    as="current_culture"
    source="culture"
    resource="/products/detail"
    action="item"
    id="lang"
/>
<a k-attribute="href {current_culture.url}" k-content="current_culture.name"></a>
```

### `list`

Returns an array of the same structure, which is useful for a language switcher.

```html
<query as="culture_urls" source="culture" resource="/products/detail" action="list" />
<div k-for="item in culture_urls" repeat-self>
    <a k-attribute="href {item.url}" k-content="item.name"></a>
</div>
```

## Related

- [k-data Overview](./)
- [Condition Expressions](./condition.md) - `where` and `test`
- [k.content](/en/api/content/) and [commerce](/en/api/commerce/commerce) - KScript APIs
