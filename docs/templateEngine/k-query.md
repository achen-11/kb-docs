# k-query

> 在 HTML 模板中执行数据查询的声明式语法

## 概述

::: warning 重要：k-query 需要配合 env="server" 使用
`k-query` 属性必须在声明了 `env="server"` 的元素上使用，这样其子级标签的 SSR 语法（`v-if`、`v-for`、`{{}}`）才能正常工作。

**错误写法：**

```html
<!-- ❌ 缺少 env="server"，子级 SSR 语法无效 -->
<div k-query="content, result, blog/list">
    <div v-for="item in result.list">{{item.title}}</div>
</div>
```

**正确写法：**

```html
<!-- ✅ 父级声明 env="server"，子级 SSR 语法生效 -->
<div env="server" k-query="content, result, blog/list">
    <div v-for="item in result.list">{{item.title}}</div>
</div>
```

:::

`k-query` 是 Kooboo 提供的服务器端数据查询语法，通过 HTML 属性声明式地执行各种数据查询操作，无需编写 JavaScript 代码。查询结果直接注入到模板上下文中，可通过 `v-for`、`{{}}` 等模板语法使用。

## 语法结构

```html
<element k-query="<source>, <variant>, <resource>/<function>?<params>">
```

**三部分结构（逗号分隔）：**


| 部分                  | 示例                           | 说明          |
| ------------------- | ---------------------------- | ----------- |
| `source`            | `content`, `sqlite`, `mysql` | 数据源类型       |
| `variant`           | `result`, `dataList`         | 结果变量名，模板中引用 |
| `resource/function` | `blog/page`, `user/list`     | 资源路径 + 查询函数 |
| `params`            | `?page=1&size=10`            | 可选查询参数      |


**参数支持动态绑定：** 使用 `{变量名}` 语法引用上下文变量。

---

## 内容查询 (content)

内容查询用于从 Kooboo 内容文件夹中获取数据。

### content/page - 分页查询

```html
<div env="server" k-query="content, pageResult, blog/page?page=1&size=10&order=title:desc&where=category=news">
    <p>总数: {{pageResult.total}}</p>
    <p>每页: {{pageResult.pageSize}}</p>
    <p>页码: {{pageResult.pageIndex}}</p>
    <p>总页数: {{pageResult.pageCount}}</p>
    <div v-for="item in pageResult.list">
        <h2>{{item.title}}</h2>
    </div>
</div>
```

**返回结构：**

```json
{
    "list": [{ "id": "xxx", "title": "...", ...fields }],
    "total": 65,
    "pageSize": 10,
    "pageIndex": 1,
    "pageCount": 7
}
```

**参数：**


| 参数      | 默认值         | 说明                            |
| ------- | ----------- | ----------------------------- |
| `page`  | `1`         | 页码索引                          |
| `size`  | `30`        | 每页数量                          |
| `order` | `fieldName` | 排序字段名，`fieldName:desc` 降序     |
| `where` | -           | [Non-SQL 查询条件](#non-sql-查询语法) |


---

### content/list - 列表查询

```html
<div env="server" k-query="content, dataList, blog/list?where=category=music&order=createDate:desc&skip=0&take=20">
    <div v-for="(item, index) in dataList">
        <p>{{index + 1}}. {{item.title}}</p>
    </div>
</div>
```

**返回结构：**

```json
[{ "id": "xxx", "title": "...", ...fields }, ...]
```

**参数：**


| 参数      | 说明                            |
| ------- | ----------------------------- |
| `order` | 排序字段，`fieldName:desc` 降序      |
| `skip`  | 跳过的记录数                        |
| `take`  | 返回的记录数                        |
| `where` | [Non-SQL 查询条件](#non-sql-查询语法) |


---

### content/item - 单条查询

```html
<div env="server" k-query="content, dataItem, blog/item?id=xxx">
    <h1>{{dataItem.title}}</h1>
    <p>{{dataItem.content}}</p>
</div>
```

**返回结构：**

```json
{ "id": "xxx", "title": "...", ...fields }
```

**参数：**


| 参数            | 必填  | 说明                     |
| ------------- | --- | ---------------------- |
| `field=value` | 是   | 查询条件，如 `id=xxx` 或其他字段名 |


---

## 数据库查询 (sqlite / mysql / sqlserver)

### page - 分页查询

```html
<div env="server" k-query="sqlite, pageResult, user/page?page=1&size=20&order=createTime:desc&condition=age>=18">
    <div v-for="item in pageResult.list">
        <p>{{item.username}}</p>
    </div>
</div>
```

**返回结构：** 同 content/page

**参数：**


| 参数          | 默认值         | 说明                            |
| ----------- | ----------- | ----------------------------- |
| `page`      | `1`         | 页码索引                          |
| `size`      | `30`        | 每页数量                          |
| `order`     | `fieldName` | 排序字段                          |
| `condition` | -           | [Non-SQL 查询条件](#non-sql-查询语法) |


---

### list - 列表查询

```html
<div env="server" k-query="mysql, dataList, product/list?where=enable=true&order=price&skip=0&take=50">
    <div v-for="item in dataList">
        <span>{{item.name}}</span> - <span>{{item.price}}</span>
    </div>
</div>
```

**返回结构：** 同 content/list

---

### item - 单条查询

```html
<div env="server" k-query="sqlite, dataItem, user/item?id=1">
    <p>{{dataItem.username}}</p>
</div>
```

**返回结构：** 同 content/item

---

### bySql - 自定义 SQL 查询

```html
<div env="server" k-query="sqlite, result, user/bySql?sql=SELECT * FROM user WHERE age > 18">
    <div v-for="item in result">
        <p>{{item.username}}</p>
    </div>
</div>
```

---

## HTTP 请求 (fetch)

::: warning 重要：fetch 返回结构是双层包装
fetch 查询的返回结果会**额外包裹一层** `{ success, statusCode, data }`：

```json
{
    "success": true,
    "statusCode": 200,
    "data": { ... }
}
```

如果目标 API 本身也返回 `{ success, data, ... }` 结构，就会形成 **双层嵌套**。访问真实数据需要使用 `response.data.xxx`。

**错误写法（常见 AI 失误）：**

```html
<!-- ❌ 直接访问 response.xxx，实际是第二层的父级属性 -->
<p>{{response.success}}</p>

<!-- ❌ 想访问 API 返回的 data，但漏掉了一层 -->
<div v-for="item in response.data.list">
```

**正确写法：**

```html
<!-- ✅ 先判断 response.success，再通过 response.data 访问真实数据 -->
<p v-if="response.success">数据: {{response.data.count}}</p>
<div v-for="item in response.data.data.list">
```

:::

### fetch/get - GET 请求

```html
<div env="server" k-query="fetch, response, get http://api.example.com/api/products">
    <p v-if="response.success">
        状态: {{response.statusCode}}
        数量: {{response.data.count}}
    </p>
    <p v-else>请求失败: {{response.statusCode}}</p>

    <div v-for="item in response.data.data">
        <span>{{item.title}}</span>
    </div>
</div>
```

**返回结构：**

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "success": true,
        "count": 1,
        "data": [{ "id": "xxx", "title": "产品1", ... }]
    }
}
```

---

### fetch/post - POST 请求

```html
<div env="server" k-query="fetch, response, post http://api.example.com/api/submit">
    <p v-if="response.success">
        响应数据: {{response.data.result}}
    </p>
</div>
```

**返回结构：** 同 fetch/get（外层包装不变）

---

## Commerce 查询 (commerce)

Commerce 查询用于从 Kooboo 电商模块获取产品、分类、购物车、订单等数据。

### commerce/product/list - 产品列表

```html
<div env="server" k-query="commerce, products, product/list?categories=men-shirt,women-shirt&skip=0&take=20">
    <div v-for="item in products">
        <h2>{{item.title}}</h2>
        <img :src="item.featuredImage" />
    </div>
</div>
```

**返回结构：**

```json
[{
    "active": true,
    "description": "<div>Men's shirt</div>",
    "id": "xxx",
    "featuredImage": "shirt.jpg",
    "seoName": "men-shirt",
    "tags": ["sale", "vip"],
    "title": "Men shirt",
    "variants": [{
        "id": "xxx",
        "sku": "xxx",
        "price": "10.5",
        "inventory": 100
    }]
}]
```

**参数：**

| 参数 | 说明 |
|------|------|
| categories | 分类 ID，多个用逗号分隔 |
| skip | 跳过的记录数 |
| take | 返回的记录数 |

---

### commerce/product/item - 单个产品

```html
<div env="server" k-query="commerce, product, product/item?seoName=men-shirt">
    <h1>{{product.title}}</h1>
    <img :src="product.featuredImage" />
    <div v-for="variant in product.variants">
        <span>{{variant.price}}</span>
    </div>
</div>
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| seoName | 是* | 产品 SEO 名称 |
| id | 是* | 产品 ID（与 seoName 二选一） |

---

### commerce/category/list - 分类列表

```html
<div env="server" k-query="commerce, categories, category/list?skip=0&take=20">
    <div v-for="item in categories">
        <h2>{{item.title}}</h2>
        <img :src="item.image" />
    </div>
</div>
```

**返回结构：**

```json
[{
    "active": true,
    "description": "<div>Men's shirt</div>",
    "id": "xxx",
    "image": "shirt.jpg",
    "parentId": "xxx",
    "seoName": "men-shirt",
    "tags": ["sale", "vip"],
    "title": "Men shirt"
}]
```

**参数：**

| 参数 | 说明 |
|------|------|
| skip | 跳过的记录数 |
| take | 返回的记录数 |

---

### commerce/category/item - 单个分类

```html
<div env="server" k-query="commerce, category, category/item?seoName=men-shirt">
    <h1>{{category.title}}</h1>
    <img :src="category.image" />
    <div v-for="child in category.children">
        <span>{{child.title}}</span>
    </div>
</div>
```

**返回结构：**

```json
{
    "active": true,
    "description": "<div>Men's shirt</div>",
    "id": "xxx",
    "image": "shirt.jpg",
    "parentId": "xxx",
    "seoName": "men-shirt",
    "title": "Men shirt",
    "path": [{ "id": "xxx", "title": "Men T-Shirt" }],
    "children": [{ "id": "xxx", "title": "Men T-Shirt" }]
}
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| seoName | 是* | 分类 SEO 名称 |
| id | 是* | 分类 ID（与 seoName 二选一） |

---

### commerce/cart/item - 购物车

```html
<div env="server" k-query="commerce, cart, cart/item?cookie=cartId">
    <p>总价: {{cart.totalAmount}}</p>
    <div v-for="line in cart.lines">
        <span>{{line.title}}</span>
        <span>{{line.price}}</span>
        <span>数量: {{line.quantity}}</span>
    </div>
</div>
```

**返回结构：**

```json
{
    "lines": [{
        "quantity": 1,
        "title": "Apple iPhone 15 Pro",
        "image": "/placeholder.jpg",
        "price": 5999
    }],
    "subtotalAmount": 7998,
    "shippingAmount": 5,
    "totalAmount": 8003,
    "totalQuantity": 2
}
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| id | 是* | 购物车 ID |
| cookie | 是* | 存储购物车 ID 的 Cookie 名称（与 id 二选一） |

---

### commerce/order/item - 订单

```html
<div env="server" k-query="commerce, order, order/item?id=xxx">
    <h1>订单号: {{order.id}}</h1>
    <p>总额: {{order.totalAmount}}</p>
    <p>状态: {{order.paid ? '已支付' : '未支付'}}</p>
    <div v-for="line in order.lines">
        <span>{{line.title}}</span>
        <span>{{line.price}}</span>
    </div>
</div>
```

**返回结构：**

```json
{
    "id": "1756628581077",
    "customer": {
        "id": "xxx",
        "email": "...",
        "firstName": "...",
        "lastName": "..."
    },
    "totalAmount": 6,
    "subtotalAmount": 1,
    "shippingAmount": 5,
    "currency": "USD",
    "paid": false,
    "createdAt": "2025/8/31 08:23:01",
    "lines": [{
        "id": "xxx",
        "title": "Product name",
        "quantity": 1,
        "price": 1,
        "totalAmount": 1
    }],
    "shippingAddress": null,
    "paymentMethod": null
}
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| id | 是 | 订单 ID |

---

## 多语言查询 (culture)

获取站点的多语言版本信息。

### culture/list - 语言列表

```html
<div env="server" k-query="culture, cultures, list?url=/blogs">
    <div v-for="item in cultures">
        <a :href="item.url">{{item.name}}</a>
        <span v-if="item.isActive">(当前)</span>
    </div>
</div>
```

**返回结构：**

```json
[{
    "key": "en",
    "name": "English",
    "isActive": false,
    "url": "/home?lang=en"
}, {
    "key": "zh",
    "name": "中文(Zhōngwén)",
    "isActive": true,
    "url": "/home?lang=zh"
}]
```

**参数：**

| 参数 | 说明 |
|------|------|
| url | 相对路径（可选，默认使用当前页面路径） |

---

### culture/item - 当前语言信息

```html
<div env="server" k-query="culture, cultureInfo, get?url=/home&lang=zh">
    <p>当前语言: {{cultureInfo.key}}</p>
    <a :href="cultureInfo.url">{{cultureInfo.name}}</a>
</div>
```

**参数：**

| 参数 | 说明 |
|------|------|
| url | 相对路径 |
| lang | 语言代码（如 `zh`、`en`） |

---

## 键值查询 (keyValue)

从键值存储中获取数据。

### keyValue/item - 获取值

```html
<div env="server" k-query="keyValue, value, item?key=siteName">
    <h1>{{value}}</h1>
</div>
```

**返回：** `string` - 存储的值

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| key | 是 | 键名 |

---

## 菜单查询 (menu)

获取站点菜单数据。

### menu/item - 获取菜单

```html
<div env="server" k-query="menu, menuItem, item?nameOrId=mainMenu">
    <ul>
        <li v-for="item in menuItem.children">
            <a :href="item.url">{{item.name}}</a>
        </li>
    </ul>
</div>
```

**返回结构：**

```json
{
    "name": "menuName",
    "children": [{
        "name": "subMenu1",
        "url": "/subMenu1",
        "children": []
    }]
}
```

**参数：**

| 参数 | 必填 | 说明 |
|------|------|------|
| nameOrId | 是 | 菜单名称或 ID |

---

## IndexedDB 查询 (indexeddb)

浏览器端 IndexedDB 数据查询。

### indexeddb/page - 分页查询

```html
<div env="server" k-query="indexeddb, pageResult, mydb/user/page?page=1&size=20">
    <div v-for="item in pageResult.list">
        <p>{{item.username}}</p>
    </div>
</div>
```

**返回结构：** 同 content/page

---

### indexeddb/list - 列表查询

```html
<div env="server" k-query="indexeddb, dataList, mydb/user/list?skip=0&take=50">
    <div v-for="item in dataList">
        <p>{{item.username}}</p>
    </div>
</div>
```

**返回结构：** 同 content/list

---

### indexeddb/item - 单条查询

```html
<div env="server" k-query="indexeddb, dataItem, mydb/user/item?id=1">
    <p>{{dataItem.username}}</p>
</div>
```

**返回结构：** 同 content/item

---

## 动态参数绑定

使用 `{变量名}` 语法绑定上下文中的变量：

```html
<script env="server">
    var currentPage = 1;
    var pageSize = 10;
</script>

<div env="server" k-query="content, pageResult, blog/page?page={currentPage}&size={pageSize}">
    <p>总数: {{pageResult.total}}</p>
</div>
```

---

## Non-SQL 查询语法

Kooboo 提供类似 MongoDB 的查询语法，支持以下操作符：


| 操作符         | 示例                     | 说明   |
| ----------- | ---------------------- | ---- |
| `==`        | `name=='John'`         | 等于   |
| `>=`        | `age>=18`              | 大于等于 |
| `>`         | `age>18`               | 大于   |
| `<=`        | `age<=65`              | 小于等于 |
| `<`         | `age<65`               | 小于   |
| `contains`  | `name contains 'John'` | 包含   |
| `startwith` | `name startwith 'J'`   | 开头是  |


**组合条件（默认 AND）：**

```html
<div env="server" k-query="content, dataList, user/list?where=age>=18 and enable=true">
```

**使用 OR：**

```html
<div env="server" k-query="content, dataList, user/list?where=category=='A' or category=='B'">
```

---

## 与 v-query 的关系

`k-query` 和 `v-query` 是等价的属性名，`QueryEvaluator` 同时识别这两个属性：

```html
<!-- 两者等价 -->
<div env="server" k-query="content, result, blog/page">
<div env="server" v-query="content, result, blog/page">
```

---

## 完整示例

```html
<div env="server">
    <div k-query="content, pageResult, blog/page?page=1&size=10&order=createTime:desc&where=published=true">
        <div class="pagination">
            <span>第 {{pageResult.pageIndex}} / {{pageResult.pageCount}} 页</span>
            <span>共 {{pageResult.total}} 条</span>
        </div>

        <div class="article-list">
            <div v-for="item in pageResult.list" class="article">
                <h2>{{item.title}}</h2>
                <p>{{item.summary}}</p>
                <span class="date">{{item.createTime}}</span>
            </div>
        </div>
    </div>
</div>
```

---

## 相关文档

- [Template Binding Syntax](./template-binding-syntax.md) - 模板绑定语法
- [k-script Database](https://kooboo.com/docs/KScript/Database) - KScript 数据库操作
