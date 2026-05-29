# k.content

> 内容管理 - 内容 CRUD 和查询

## 概述

`k.content` 提供了一套完整的内容管理 API，用于对站点内容进行创建、查询、更新、删除等操作。

**前置条件**：需要在 Kooboo 后台配置好**数据类型**和**内容文件夹**，详细内容请查看[后台配置指南](#后台配置)。

## 数据类型配置

### 创建数据类型

在 Kooboo 后台 **内容管理 → 数据类型** 页面：

1. 点击 **新建数据类型**
2. 输入类型名称（如 `Article`、`Product`、`News` 等）
3. 点击 **+ 添加字段** 添加自定义字段
4. 配置字段属性：
   - **名称**：字段标识符（英文）
   - **显示名**：后台显示名称
   - **控件类型**：文本、日期、图片、选择等
   - **多语言**：是否支持多语言
   - **摘要字段**：是否作为列表显示的摘要
   - **用户可编辑**：是否允许用户在前端修改

### 创建内容文件夹

在 Kooboo 后台 **内容管理 → 内容** 页面：

1. 点击 **新建 → 文件夹**（多内容）或 **→ 单条内容**
2. 配置文件夹属性：
   - **名称**：文件夹标识符（用于 API 调用，如 `k.content.Article`）
   - **显示名**：后台显示名称
   - **数据类型**：选择关联的数据类型
   - **预览 URL**：可选，关联的详情页模板
   - **分页大小**：列表每页显示数量
   - **可排序**：是否支持手动排序
   - **隐藏**：是否在后台隐藏

::: tip 命名规范
文件夹名称将作为 API 的访问键，如文件夹名为 `Article`，则通过 `k.content.Article` 访问。
:::

## TypeScript 定义

```ts
interface KContent {
  // 获取查询操作符
  operators(): ContentOperators;

  // 获取所有内容文件夹名称
  getFolders(): string[];

  // 获取指定文件夹
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
  // 查询方法
  all(options?: QueryOptions): Content[];
  get(nameOrId: string): Content | null;
  find(query: string | object, options?: QueryOptions): Content | null;
  findAll(query: string | object, options?: QueryOptions): Content[];

  // 增删改方法
  add(content: object): Content;
  update(content: Content): void;
  delete(nameOrId: string | object): void;

  // 排序方法
  move(source: string, prev?: string, next?: string): void;
}

interface QueryOptions {
  excludeEmpty?: boolean;      // 排除空值记录
  includeOfflineData?: boolean;  // 包含离线数据
}
```

## 全局方法

### k.content.operators()

获取查询操作符，用于构建复杂的查询条件。

```ts
k.api.get(() => {
    const ops = k.content.operators();
    return ops;
})
// 返回: { AND: "AND", OR: "OR", EQ: "EQ", NE: "NE", GT: "GT", ... }
```

### k.content.getFolders()

获取站点中所有内容文件夹的名称列表。

```ts
k.api.get(() => {
    const folders = k.content.getFolders();
    return { folders };
})
// 返回: { folders: ["Article", "Product", "News"] }
```

## 查询方法

### all()

获取文件夹中的所有内容。

```ts
k.api.get(() => {
    const articles = k.content.Article.all();
    return { count: articles.length, articles };
})
```

**参数 (QueryOptions):**

| 参数 | 类型 | 说明 |
|------|------|------|
| excludeEmpty | `boolean` | 是否排除空值记录，默认 `false` |
| includeOfflineData | `boolean` | 是否包含离线数据，默认 `false` |

```ts
// 排除空值
k.api.get(() => {
    return k.content.Article.all({ excludeEmpty: true });
})

// 包含离线内容
k.api.get(() => {
    return k.content.Article.all({ includeOfflineData: true });
})
```

### get()

根据 ID 或 UserKey 获取单条内容。

```ts
k.api.get(() => {
    const article = k.content.Article.get("article-id-or-userkey");
    return article;
})
```

**参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| nameOrId | `string` | 内容的 ID 或 UserKey |

### find()

查询单条内容，支持字符串查询和对象查询两种方式。

**字符串查询：**

```ts
k.api.get(() => {
    // 使用字符串条件
    const article = k.content.Article.find("title == 'Hello World'");
    return article;
})
```

**支持的运算符：**
- `==` 等于
- `>=` 大于等于
- `>` 大于
- `<=` 小于等于
- `<` 小于
- `&&` 并且
- `||` 或者
- `contains` 包含
- `startwith` 开头匹配

```ts
// 多条件查询
k.api.get(() => {
    const article = k.content.Article.find("title == 'Hello' && author == 'John'");
    return article;
})

// 模糊查询
k.api.get(() => {
    const article = k.content.Article.find("title contains 'World'");
    return article;
})
```

**对象查询（使用操作符）：**

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

**find + options：**

```ts
k.api.get(() => {
    const article = k.content.Article.find(
        { title: "Hello" },
        { includeOfflineData: true }
    );
    return article;
})
```

### findAll()

查询多条内容，用法与 `find()` 相同，但返回数组。

```ts
k.api.get(() => {
    const articles = k.content.Article.findAll({ category: "news" });
    return { count: articles.length, articles };
})

// 使用操作符
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

## 增删改方法

### add()

创建新内容。

```ts
k.api.post(() => {
    const article = k.content.Article.add({
        title: "我的文章",
        content: "这是文章内容",
        author: "张三",
        views: 0
    });
    return { id: article.id, title: article.title };
})
```

**参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| content | `object` | 内容对象，键为字段名，值为字段值 |

**系统字段（可选）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| userKey | `string` | 用户定义的唯一标识 |
| online | `boolean` | 是否上线，默认 `true` |
| order / sequence | `number` | 排序序号 |

### update()

更新已有内容。

```ts
k.api.post(() => {
    // 先查询要更新的内容
    const article = k.content.Article.find({ title: "旧标题" });

    // 修改字段
    article.title = "新标题";
    article.views = article.views + 1;

    // 执行更新
    k.content.Article.update(article);

    return { success: true, article };
})
```

::: warning 注意
update 方法需要传入从 `find`、`get`、`all` 等方法获取的完整内容对象，而不是新建的对象。因为内容对象包含系统字段（如 `id`、`version` 等），这些字段用于标识要更新的记录。
:::

### delete()

删除内容。

```ts
k.api.post(() => {
    const article = k.content.Article.find({ title: "要删除的文章" });

    if (article) {
        k.content.Article.delete(article.id);
        return { success: true };
    }
    return { success: false, error: "文章不存在" };
})

// 也可以直接传入内容对象
k.api.post(() => {
    const article = k.content.Article.find({ title: "要删除的文章" });

    if (article) {
        k.content.Article.delete(article);
        return { success: true };
    }
    return { success: false };
})
```

## 排序方法

### move()

调整内容在列表中的排序位置。

```ts
k.api.post(() => {
    // 将文章从原位置移动到 targetId 之后
    // prev: 参考元素的 ID
    // next: 参考元素之后的 ID（可选）
    k.content.Article.move(sourceId, prevId, nextId);

    return { success: true };
})
```

**参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| source | `string` | 要移动的内容 ID |
| prev | `string` | 参考元素 ID（插入到此元素之后） |
| next | `string` | 可选，插入到这个 ID 之后 |

## 多语言支持

### 设置语言环境

通过 `k.request.setCulture()` 设置当前请求的语言环境，然后再查询内容。

```ts
k.api.get(() => {
    // 设置为中文
    k.request.setCulture("zh");
    const zhArticle = k.content.Article.get("article-id");

    // 设置为英文
    k.request.setCulture("en");
    const enArticle = k.content.Article.get("article-id");

    return {
        zh: zhArticle.title,
        en: enArticle.title
    };
})
```

::: tip 使用时机
必须在调用 `k.content` 查询方法之前设置语言环境。
:::

### 多语言字段

在数据类型中设置字段的 **多语言** 属性后，该字段的内容会根据当前语言环境返回对应的翻译版本。

## 内容结构

### Content 系统字段

所有内容对象都包含以下系统字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | `string` | 内容的唯一标识符（GUID） |
| userKey | `string` | 用户定义的唯一标识 |
| lastModified | `string` | 最后修改时间（ISO 8601） |
| creationDate | `string` | 创建时间（ISO 8601） |
| parentId | `string` | 父级 ID |
| version | `number` | 版本号 |
| sequence | `number` | 排序序号 |
| online | `boolean` | 是否上线（true=在线，false=离线） |

### 示例内容对象

```json
{
    "title": "文章标题",
    "content": "文章内容",
    "author": "作者名",
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

## 查询操作符详解

### 比较操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `EQ` / `==` | 等于 | `title == 'Hello'` |
| `NE` | 不等于 | `status != 'draft'` |
| `GT` / `>` | 大于 | `views > 100` |
| `GTE` / `>=` | 大于等于 | `price >= 10` |
| `LT` / `<` | 小于 | `stock < 5` |
| `LTE` / `<=` | 小于等于 | `price <= 100` |

### 字符串操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `CONTAINS` | 包含 | `title contains 'news'` |
| `STARTS_WITH` | 开头匹配 | `name startwith 'A'` |

### 逻辑操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `AND` / `&&` | 并且 | `a == 1 && b == 2` |
| `OR` / `\|\|` | 或者 | `a == 1 \|\| a == 2` |

### OR 操作符的三种写法

```ts
// 1. 对象方式（字段值 OR 关系）
k.api.get(() => {
    const { OR } = k.content.operators();
    const articles = k.content.Article.findAll({
        [OR]: { title: "News1", category: "News2" }
    });
})

// 2. 数组方式（多条件 OR）
k.api.get(() => {
    const { OR } = k.content.operators();
    const articles = k.content.Article.findAll({
        [OR]: [
            { title: "Article1" },
            { title: "Article2" }
        ]
    });
})

// 3. 单字段多值
k.api.get(() => {
    const { OR } = k.content.operators();
    const articles = k.content.Article.findAll({
        title: { [OR]: ["Article1", "Article2"] }
    });
})
```

## QueryOptions 详解

### excludeEmpty

排除所有用户字段都为空的记录。

```ts
k.api.get(() => {
    // 返回所有至少有 一个字段有值的内容
    return k.content.Article.all({ excludeEmpty: true });
})
```

### includeOfflineData

包含 `online` 字段为 `false` 的离线内容。默认不返回离线内容。

```ts
k.api.get(() => {
    // 返回包括离线内容的所有内容
    return k.content.Article.all({ includeOfflineData: true });
})
```

## 相关文档

- [k.DB](../database/) - 数据库操作
- [k.request](../request/) - 请求对象
