# query 数据源

> `<query>` 的 `source`、`resource`、`action` 组合说明

通用属性见 [标签语法](./tags.md#query)。下文按数据源分类；`action` 均为 `item` / `list` / `paged` 之一。

## 分页结果字段

`action="paged"` 时，`as` 变量包含：

| 字段 | 说明 |
|------|------|
| `list` | 当前页数据数组 |
| `total` | 总条数 |
| `pageIndex` | 当前页码 |
| `pageSize` | 每页大小 |
| `pageCount` | 总页数 |

---

## content

`resource` = **内容类型（Content Folder）名称**。

### item

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

### list

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

### paged

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

---

## commerce

`resource` 仅支持固定值：`product`、`category`、`cart`、`order`。

### product

| action | 说明 |
|--------|------|
| `item` | `id` 为商品 id 或 **seoName** |
| `list` / `paged` | `where` 支持 `id`、`title`、`featuredImage`、`active`、`seoName`、`tags` 等；`where.category` 为分类 id 或 seoName（**含子分类**） |

```html
<query
    as="products"
    source="commerce"
    resource="product"
    action="list"
    where="{category:'men-shirt',title:{$contains:'shoe'}}"
/>
```

### category

| action | 说明 |
|--------|------|
| `item` | `id` 为分类 id 或 seoName |
| `list` / `paged` | `where` 支持 `id`、`title`、`seoName`、`parentId`、`active`、`tags` 等 |

### cart

- 仅 **`action="item"`**
- 可不传 `id`，使用当前上下文购物车 id

```html
<query as="cart_detail" source="commerce" resource="cart" action="item" />
```

### order

| action | 限制 |
|--------|------|
| `item` | 需 `id` |
| `list` / `paged` | **不支持** `where`；**不支持** `order` / `order-desc`（按创建时间倒序） |

---

## sqlite / mysql / sqlserver

三者的 `<query>` 属性相同；`resource` = **表名**。

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

---

## indexeddb

与数据库查询相同，`resource` = 对象表名。

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

---

## culture（多语言链接）

`source="culture"`，`resource` 为要查询的**相对路径**；不传时默认当前请求路径。

### item

- `id`：语言 code；不传则用当前上下文语言
- 返回：`{ key, name, url, isActive }` 或 `null`

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

### list

返回上述结构的数组，用于语言切换列表。

```html
<query as="culture_urls" source="culture" resource="/products/detail" action="list" />
<div k-for="item in culture_urls" repeat-self>
    <a k-attribute="href {item.url}" k-content="item.name"></a>
</div>
```

---

## 相关文档

- [k-data 概述](./)
- [条件表达式](./condition.md) — `where` / `test`
- [k.content](/api/content/) · [commerce](/api/commerce/commerce.md) — KScript API
