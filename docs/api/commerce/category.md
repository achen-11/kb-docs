# category

> 产品分类管理 - 分类 CRUD 和搜索

## 概述

`k.commerce.category` 提供产品分类相关操作，包括创建、查询、更新、删除、获取父级分类等。

## TypeScript 定义

```ts
interface KCategory {
    list(query?: CategoryQueryParams): Category[];
    get(seoNameOrId: string): Category;
    create(category: NewCategory): Category;
    delete(categoryId: string): void;
    updateField(categoryId: string, field: string, value: any, lang?: string): void;
    updateFields(categoryId: string, updateContents: UpdateContent[]): void;
    addProduct(categoryId: string, productId: string): void;
    removeProduct(categoryId: string, productId: string): void;
    getParents(seoNameOrId: string): Category[];
}
```

## 核心方法

### list()

获取分类列表。

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| query.includeOffline | `boolean` | 是否包含下架分类，默认 `false` |

```ts
k.api.get(() => {
    const categories = k.commerce.category.list()
    return { count: categories.length, categories: categories.slice(0, 3) }
})

// 带参数筛选
k.api.get(() => {
    const categories = k.commerce.category.list({ includeOffline: true })
    return { count: categories.length }
})
```

### get()

获取分类详情。
:::tip 未找到分类
查询不到分类时返回 `null`
:::
```ts
k.api.get(() => {
    const category = k.commerce.category.get('category-seo-name')
    if (!category) {
        return { error: 'Category not found' }
    }
    return { title: category.title, id: category.id }
})
```

### create()

创建分类。

```ts
k.api.post(() => {
    const category = k.commerce.category.create({
        title: 'Test Category',
        description: 'Test Description',
        seoName: 'test-category-' + Date.now(),
        active: true
    })
    return { id: category.id, title: category.title }
})
```

### updateField()

更新单个字段。

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| categoryId | `string` | 分类 ID |
| field | `string` | 字段名 |
| value | `any` | 字段值 |
| lang | `string` | 语言代码（可选，用于指定多语言） |

```ts
k.api.post(() => {
    k.commerce.category.updateField(categoryId, "title", "新标题")
    return { success: true }
})

// 多语言更新
k.api.post(() => {
    k.commerce.category.updateField(categoryId, "title", "New Title", "en")
    return { success: true }
})
```

### updateFields()

批量更新字段。

```ts
k.api.post(() => {
    k.commerce.category.updateFields(categoryId, [
        { property: "title", value: "新标题", lang: "zh" },
        { property: "tags", value: ["tag1", "tag2"] }
    ])
    return { success: true }
})
```

### delete()

删除分类。

```ts
k.api.post(() => {
    k.commerce.category.delete(categoryId)
    return { success: true }
})
```

### getParents()

获取父级分类链。

```ts
k.api.get(() => {
    const parents = k.commerce.category.getParents('category-seo-name')
    return { count: parents.length, parents: parents }
})
```

### addProduct()

给分类添加产品。

```ts
k.api.post(() => {
    k.commerce.category.addProduct(categoryId, productId)
    return { success: true }
})
```

### removeProduct()

从分类中移除产品。

```ts
k.api.post(() => {
    k.commerce.category.removeProduct(categoryId, productId)
    return { success: true }
})
```

## 分类结构

### Category 属性

| 属性 | 说明 | 类型 |
|------|------|------|
| id | 分类 ID | `string` |
| title | 分类名称 | `string` |
| description | 分类描述 | `string` |
| image | 分类图片 | `string` |
| seoName | SEO 名称 | `string` |
| parentId | 父级分类 ID | `string` |
| tags | 标签 | `string[]` |
| active | 是否启用 | `boolean` |
| order | 排序 | `number` |
| createdAt | 创建时间 | `Date` |
| updatedAt | 更新时间 | `Date` |
| children | 子分类列表 | [`Category`](#category-属性)[] |

## 相关文档

- [k.commerce](./commerce.md) - 电商模块概述
- [product](./product.md) - 产品管理
- [cart](./cart.md) - 购物车
