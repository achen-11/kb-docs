# k.content

> Content management - CRUD and query APIs for site content

## Overview

`k.content` provides a complete set of content management APIs for creating, querying, updating, deleting, and sorting site content.

**Prerequisite:** configure **Content Types** and **Content Folders** in the admin first. See [Admin CMS -> Content](/en/cms/content/) ([Content types](/en/cms/content/content-types) and [Content folder list](/en/cms/content/contents-folders-list)).

## TypeScript Definition

```ts
interface KContent {
  operators(): ContentOperators;
  getFolders(): string[];
  [folderName: string]: KContentFolder;
}

interface ContentOperators {
  AND: string;
  OR: string;
  EQ: string;
  NE: string;
  GT: string;
  GTE: string;
  LT: string;
  LTE: string;
  STARTS_WITH: string;
  CONTAINS: string;
}

interface KContentFolder {
  all(options?: QueryOptions): Content[];
  get(nameOrId: string): Content | null;
  find(query: string | object, options?: QueryOptions): Content | null;
  findAll(query: string | object, options?: QueryOptions): Content[];
  add(content: object): Content;
  update(content: Content): void;
  delete(nameOrId: string | object): void;
  move(source: string, prev?: string, next?: string): void;
}

interface QueryOptions {
  excludeEmpty?: boolean;      // Exclude empty records
  includeOfflineData?: boolean;  // Include offline data
}
```

## Global Methods

### `k.content.operators()`

Gets the query operators used to build complex query conditions.

```ts
k.api.get(() => {
    const ops = k.content.operators();
    return ops;
})
// Returns: { AND: "AND", OR: "OR", EQ: "EQ", NE: "NE", GT: "GT", ... }
```

### `k.content.getFolders()`

Gets the names of all content folders in the site.

```ts
k.api.get(() => {
    const folders = k.content.getFolders();
    return { folders };
})
// Returns: { folders: ["Article", "Product", "News"] }
```

## Query Methods

### `all()`

Gets all content in a folder.

```ts
k.api.get(() => {
    const articles = k.content.Article.all();
    return { count: articles.length, articles };
})
```

**Parameters (QueryOptions):**

| Parameter | Type | Description |
|------|------|------|
| excludeEmpty | `boolean` | Whether to exclude empty records, default `false` |
| includeOfflineData | `boolean` | Whether to include offline data, default `false` |

```ts
// Exclude empty records
k.api.get(() => {
    return k.content.Article.all({ excludeEmpty: true });
})

// Include offline content
k.api.get(() => {
    return k.content.Article.all({ includeOfflineData: true });
})
```

### `get()`

Gets a single content item by ID or UserKey.

```ts
k.api.get(() => {
    const article = k.content.Article.get("article-id-or-userkey");
    return article;
})
```

**Parameters:**

| Parameter | Type | Description |
|------|------|------|
| nameOrId | `string` | Content ID or UserKey |

### `find()`

Queries a single content item. Both string queries and object queries are supported.

**String query:**

```ts
k.api.get(() => {
    // Use a string condition
    const article = k.content.Article.find("title == 'Hello World'");
    return article;
})
```

**Supported operators:**
- `==` equals
- `>=` greater than or equal to
- `>` greater than
- `<=` less than or equal to
- `<` less than
- `&&` and
- `||` or
- `contains` contains
- `startwith` starts with

```ts
// Multiple conditions
k.api.get(() => {
    const article = k.content.Article.find("title == 'Hello' && author == 'John'");
    return article;
})

// Fuzzy search
k.api.get(() => {
    const article = k.content.Article.find("title contains 'World'");
    return article;
})
```

**Object query (using operators):**

```ts
k.api.get(() => {
    const { GT, AND } = k.content.operators();

    const article = k.content.Article.find({
        [AND]: {
            title: { [GT]: "" },
            views: { [GT]: 100 }
        }
    });
    return article;
})
```

**find + options:**

```ts
k.api.get(() => {
    const article = k.content.Article.find(
        { title: "Hello" },
        { includeOfflineData: true }
    );
    return article;
})
```

### `findAll()`

Queries multiple content items. The usage is the same as `find()`, but it returns an array.

```ts
k.api.get(() => {
    const articles = k.content.Article.findAll({ category: "news" });
    return { count: articles.length, articles };
})

// Using operators
k.api.get(() => {
    const { GT, OR } = k.content.operators();

    const articles = k.content.Article.findAll({
        [OR]: [
            { title: "News1" },
            { title: "News2" }
        ]
    });
    return { count: articles.length };
})
```

## CRUD Methods

### `add()`

Creates new content.

```ts
k.api.post(() => {
    const article = k.content.Article.add({
        title: "My Article",
        content: "This is the article content",
        author: "John Doe",
        views: 0
    });
    return { id: article.id, title: article.title };
})
```

**Parameters:**

| Parameter | Type | Description |
|------|------|------|
| content | `object` | Content object, where keys are field names and values are field values |

**System fields (optional):**

| Field | Type | Description |
|------|------|------|
| userKey | `string` | User-defined unique identifier |
| online | `boolean` | Whether it is online, default `true` |
| order / sequence | `number` | Sort order |

### `update()`

Updates existing content.

```ts
k.api.post(() => {
    // Query the content to update first
    const article = k.content.Article.find({ title: "Old title" });

    // Modify fields
    article.title = "New title";
    article.views = article.views + 1;

    // Perform the update
    k.content.Article.update(article);

    return { success: true, article };
})
```

::: warning Note
The `update` method requires the full content object returned by `find`, `get`, `all`, and similar methods, not a newly created object. The content object contains system fields such as `id` and `version`, and those fields are used to identify the record to update.
:::

### `delete()`

Deletes content.

```ts
k.api.post(() => {
    const article = k.content.Article.find({ title: "Article to delete" });

    if (article) {
        k.content.Article.delete(article.id);
        return { success: true };
    }
    return { success: false, error: "Article not found" };
})

// You can also pass the content object directly
k.api.post(() => {
    const article = k.content.Article.find({ title: "Article to delete" });

    if (article) {
        k.content.Article.delete(article);
        return { success: true };
    }
    return { success: false };
})
```

## Sorting Methods

### `move()`

Adjusts the sort position of content in a list.

```ts
k.api.post(() => {
    // Move the article to a position after targetId
    // prev: reference element ID
    // next: optional ID after which to insert
    k.content.Article.move(sourceId, prevId, nextId);

    return { success: true };
})
```

**Parameters:**

| Parameter | Type | Description |
|------|------|------|
| source | `string` | Content ID to move |
| prev | `string` | Reference element ID (insert after this element) |
| next | `string` | Optional; insert after this ID |

## Multilingual Support

### Set the language context

Set the current request culture with `k.request.setCulture()` before querying content.

```ts
k.api.get(() => {
    // Set to Chinese
    k.request.setCulture("zh");
    const zhArticle = k.content.Article.get("article-id");

    // Set to English
    k.request.setCulture("en");
    const enArticle = k.content.Article.get("article-id");

    return {
        zh: zhArticle.title,
        en: enArticle.title
    };
})
```

::: tip When to use
You must set the culture before calling any `k.content` query method.
:::

### Multilingual fields

When a field is marked as **multilingual** in the content type, Kooboo returns the translated value for the current language context.

## Content Structure

### Content system fields

All content objects contain the following system fields:

| Field | Type | Description |
|------|------|------|
| id | `string` | Unique content identifier (GUID) |
| userKey | `string` | User-defined unique identifier |
| lastModified | `string` | Last modified time (ISO 8601) |
| creationDate | `string` | Creation time (ISO 8601) |
| parentId | `string` | Parent ID |
| version | `number` | Version number |
| sequence | `number` | Sort sequence |
| online | `boolean` | Whether it is online (`true` = online, `false` = offline) |

### Example content object

```json
{
    "title": "Article Title",
    "content": "Article content",
    "author": "Author name",
    "id": "cd6b8f09-2146-73d3-cade-4e832627b4f6",
    "userKey": "my-article-key",
    "lastModified": "2025-10-28T09:32:30.3162015Z",
    "creationDate": "2025-10-28T09:32:30.3137662Z",
    "parentId": "00000000-0000-0000-0000-000000000000",
    "version": 303,
    "sequence": 0,
    "online": true
}
```

## Query Operator Details

### Comparison operators

| Operator | Description | Example |
|--------|------|------|
| `EQ` / `==` | Equals | `title == 'Hello'` |
| `NE` | Not equals | `status != 'draft'` |
| `GT` / `>` | Greater than | `views > 100` |
| `GTE` / `>=` | Greater than or equal to | `price >= 10` |
| `LT` / `<` | Less than | `stock < 5` |
| `LTE` / `<=` | Less than or equal to | `price <= 100` |

### String operators

| Operator | Description | Example |
|--------|------|------|
| `CONTAINS` | Contains | `title contains 'news'` |
| `STARTS_WITH` | Starts with | `name startwith 'A'` |

### Logical operators

| Operator | Description | Example |
|--------|------|------|
| `AND` / `&&` | And | `a == 1 && b == 2` |
| `OR` / `||` | Or | `a == 1 || a == 2` |

### Three ways to write the OR operator

```ts
// 1. Object form (field-value OR relationship)
k.api.get(() => {
    const { OR } = k.content.operators();
    const articles = k.content.Article.findAll({
        [OR]: { title: "News1", category: "News2" }
    });
})

// 2. Array form (multiple-condition OR)
k.api.get(() => {
    const { OR } = k.content.operators();
    const articles = k.content.Article.findAll({
        [OR]: [
            { title: "Article1" },
            { title: "Article2" }
        ]
    });
})

// 3. Multiple values for one field
k.api.get(() => {
    const { OR } = k.content.operators();
    const articles = k.content.Article.findAll({
        title: { [OR]: ["Article1", "Article2"] }
    });
})
```

## QueryOptions Details

### excludeEmpty

Excludes records where all user fields are empty.

```ts
k.api.get(() => {
    // Return all content with at least one field value
    return k.content.Article.all({ excludeEmpty: true });
})
```

### includeOfflineData

Includes offline content where the `online` field is `false`. Offline content is excluded by default.

```ts
k.api.get(() => {
    // Return all content including offline content
    return k.content.Article.all({ includeOfflineData: true });
})
```

## Related Docs

- [k.DB](../database/) - Database operations
- [k.request](../request/) - Request object
