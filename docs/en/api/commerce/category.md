# category

> Product Category Management - Category CRUD and Search

## Overview

`k.commerce.category` provides operations related to product classification, including creation, query, update, delete, obtaining parent classification, etc.

## TypeScript definition

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

## core method

### list()

Get a list of categories.

**parameter:**

| Parameter | Type | Description |
|------|------|------|
| query.includeOffline | `boolean` | Whether to include delisting categories, the default is `false` |

```ts
k.api.get(() => {
    const categories = k.commerce.category.list()
    return { count: categories.length, categories: categories.slice(0, 3) }
})

// Filter with parameters
k.api.get(() => {
    const categories = k.commerce.category.list({ includeOffline: true })
    return { count: categories.length }
})
```

### get()

Get category details.
:::tip Category not found
When the query cannot find a category, `null` is returned.
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

Create categories.

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

Update a single field.

**parameter:**

| Parameter | Type | Description |
|------|------|------|
| categoryId | `string` | Category ID |
| Field | `string` | Field name |
| value | `any` | field value |
| lang | `string` | Language code (optional, used to specify multiple languages) |

```ts
k.api.post(() => {
    k.commerce.category.updateField(categoryId, "title", "Updated Title")
    return { success: true }
})

// Multilingual update
k.api.post(() => {
    k.commerce.category.updateField(categoryId, "title", "New Title", "en")
    return { success: true }
})
```

### updateFields()

Update fields in batches.

```ts
k.api.post(() => {
    k.commerce.category.updateFields(categoryId, [
        { property: "title", value: "Updated Title", lang: "en" },
        { property: "tags", value: ["tag1", "tag2"] }
    ])
    return { success: true }
})
```

### delete()

Delete categories.

```ts
k.api.post(() => {
    k.commerce.category.delete(categoryId)
    return { success: true }
})
```

### getParents()

Get the parent category chain.

```ts
k.api.get(() => {
    const parents = k.commerce.category.getParents('category-seo-name')
    return { count: parents.length, parents: parents }
})
```

### addProduct()

Add products to categories.

```ts
k.api.post(() => {
    k.commerce.category.addProduct(categoryId, productId)
    return { success: true }
})
```

### removeProduct()

Remove product from category.

```ts
k.api.post(() => {
    k.commerce.category.removeProduct(categoryId, productId)
    return { success: true }
})
```

## Classification structure

### Category property

| Property | Description | Type |
|------|------|------|
| ID | Category ID | `string` |
| title | Category name | `string` |
| description | Classification description | `string` |
| image | Classified pictures | `string` |
| seoName | SEO name | `string` |
| parentId | Parent category ID | `string` |
| tags | Label | `string[]` |
| active | Whether to enable | `boolean` |
| order | sort | `number` |
| createdAt | creation time | `Date` |
| updatedAt | Update time | `Date` |
| children | Subcategory list | [Category](#category-property)[] |

## Related Docs

- [k.commerce](./commerce.md) - E-commerce module overview
- [product](./product.md) - Product Management
- [cart](./cart.md) - Shopping Cart
