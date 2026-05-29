# k-data

> 在 HTML 模板中用标签声明数据流程（**推荐**，替代已弃用的 `k-query`）

## 概述

**k-data** 用纯 HTML 标签（`<k-data>`、`<let>`、`<query>` 等）描述「读参数 → 查数据 → 整形 → 导出变量」，在**服务端**执行，结果通过 `<export>` 交给模板层的 `k-for`、`k-content`、`k-attribute` 使用。

与历史 **`k-query`** 单行属性相比，k-data：

- 结构固定，便于 AI 生成与代码审查
- 支持分支、异常、重定向、字段映射
- `where` / `test` 使用 **JSON5 条件**，而非 SQL 字符串

::: tip 与模板绑定的分工
| 层级 | 语法 | 用途 |
|------|------|------|
| `<k-data>` 内 | `<let>`、`<query>`、`<when>`… | 准备数据 |
| 模板 DOM | `k-content`、`k-for`、`k-if`、`k-attribute` | 渲染 UI |

详见 [模板绑定语法](../binding/)。
:::

## 最小示例

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
        共 <span k-content="query_result.total"></span> 条，
        第 <span k-content="query_result.pageIndex"></span> / <span k-content="query_result.pageCount"></span> 页
    </p>
</div>
```

## 编写约定

1. 外部输入用 `source` + `from`（如 `queryString`、`cookie`）。
2. 查询用 `source` + `resource` + `action`；分页统一 `page-number`、`page-size`。
3. `action="paged"` 的列表在 `map` 里用 `from="结果.list"`。
4. 模板层**只使用** `<export var="...">` 导出的变量。
5. `<when>` / `<else-if>` / `<else>` 只能写在 `<k-data>` 内；DOM 条件用 `k-if` / `k-else-if` / `k-else`。
6. `k-attribute` 的 `{...}` 只做变量插值，不做运算；先 `<let use="add|subtract|...">` 再绑定。

## 标签一览

| 标签 | 作用 |
|------|------|
| `k-data` | 数据流程根容器 |
| `let` | 变量、请求读取、函数调用 |
| `query` | 查询 content / commerce / 数据库等 |
| `map` | 数组或对象逐项映射 |
| `when` / `else-if` / `else` | k-data 内条件分支 |
| `try` / `catch` | 异常处理 |
| `redirect` | 重定向 |
| `export` | 导出变量给模板层 |

属性与用法见 [标签语法](./tags.md)。

## 文档导航

| 主题 | 说明 |
|------|------|
| [标签语法](./tags.md) | `let`、`query`、`map`、分支、导出 |
| [query 数据源](./query.md) | content、commerce、sqlite、mysql、culture 等 |
| [内置函数](./functions.md) | `dateFormat`、`jwtDecode`、数学与文本 |
| [条件表达式](./condition.md) | JSON5 `where` / `test` |

## 与 KScript API 的关系

| 场景 | 文档 |
|------|------|
| 模板内声明式取数 | 本目录 k-data |
| 脚本里 CRUD、业务逻辑 | [k.content](/api/content/)、[k.DB](/api/database/)、[k.commerce](/api/commerce/commerce.md) 等 |

## 相关文档

- [Page](../page/) · [View](../view/)
- [模板绑定语法](../binding/)
