# k-data

> Declare data flow with HTML tags inside a template. This is the recommended approach and replaces deprecated `k-query`.

## Overview

**k-data** uses plain HTML tags such as `<k-data>`, `<let>`, and `<query>` to describe a full server-side data flow: read request values, query data, shape the result, and expose variables to the template with `<export>`.

Compared with the old single-attribute **`k-query`** syntax, k-data:

- has a fixed structure that is easier for AI generation and code review,
- supports branches, exceptions, redirects, and field mapping,
- and uses **JSON5 conditions** for `where` and `test` instead of SQL-like strings.

::: tip Division of responsibility with template bindings
| Layer | Syntax | Responsibility |
|------|--------|----------------|
| Inside `<k-data>` | `<let>`, `<query>`, `<when>` and friends | Prepare data |
| Template DOM | `k-content`, `k-for`, `k-if`, `k-attribute` | Render UI |

See [Template Binding Syntax](../binding/) for the rendering layer.
:::

## Minimal Example

```html
<k-data>
    <let as="keyword" source="queryString" from="keyword" default="''" />
    <let as="page_number" source="queryString" from="page_number" default="1" />
    <let as="page_size" source="queryString" from="page_size" default="10" />
    <query
        as="query_result"
        source="content"
        resource="user"
        action="paged"
        select="id,age,name,birthday"
        where="{age:{$gt:23},name:{$contains:'lily'}}"
        page-number="page_number"
        page-size="page_size"
        order-desc="create_time"
    />
    <map from="query_result.list" as="users">
        <let from="id" as="id" />
        <let from="name" as="name" />
        <let from="birthday" as="birthday" use="dateFormat" params="'yyyy-MM-dd'" />
    </map>
    <export var="query_result" />
    <export var="users" />
</k-data>
<div>
    <div k-for="user in users" repeat-self>
        <p k-content="user.name"></p>
        <p k-content="user.birthday"></p>
    </div>
    <p>
        Total <span k-content="query_result.total"></span> items,
        page <span k-content="query_result.pageIndex"></span> / <span k-content="query_result.pageCount"></span>
    </p>
</div>
```

## Authoring Conventions

1. Read external input with `source` plus `from`, such as `queryString` or `cookie`.
2. Use `source`, `resource`, and `action` for queries. Standardize pagination with `page-number` and `page-size`.
3. For `action="paged"`, map the list with `from="result.list"`.
4. In the template layer, use only variables that were exposed with `<export var="...">`.
5. `<when>`, `<else-if>`, and `<else>` belong only inside `<k-data>`. In the DOM layer, use `k-if`, `k-else-if`, and `k-else`.
6. The `{...}` syntax in `k-attribute` only interpolates variables. It does not perform calculations. Use `<let use="add|subtract|...">` first, then bind the result.

## Tag Summary

| Tag | Responsibility |
|-----|----------------|
| `k-data` | Root container for the data flow |
| `let` | Variables, request input, or built-in function calls |
| `query` | Query content, commerce, database, and related sources |
| `map` | Map over an array or object |
| `when` / `else-if` / `else` | Conditional branches inside `k-data` |
| `try` / `catch` | Exception handling |
| `redirect` | Server-side redirect |
| `export` | Expose variables to the template layer |

See [Tag Syntax](./tags.md) for details.

## Docs in This Section

| Topic | Description |
|-------|-------------|
| [Tag Syntax](./tags.md) | `let`, `query`, `map`, branching, and export |
| [Query Sources](./query.md) | `content`, `commerce`, `sqlite`, `mysql`, `culture`, and more |
| [Built-in Functions](./functions.md) | `dateFormat`, `jwtDecode`, math, and text helpers |
| [Condition Expressions](./condition.md) | JSON5 `where` and `test` syntax |

## Relationship to KScript APIs

| Scenario | Doc |
|----------|-----|
| Declarative data fetching inside a template | This `k-data` section |
| CRUD or business logic in script code | [k.content](/en/api/content/), [k.DB](/en/api/database/), [k.commerce](/en/api/commerce/commerce) and related APIs |

## Related

- [Page](../page/) and [View](../view/)
- [Template Binding Syntax](../binding/)
