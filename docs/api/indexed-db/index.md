# k.DB.indexedDb

> 站点 IndexedDB 动态表 — 与后台 [IndexedDB 表](/cms/database/table) 为同一套数据

## 概述

`k.DB.indexedDb` 访问当前站点的 **IndexedDB 动态表**。表名对应后台 **数据库 → IndexedDB 表** 中创建的表；首次访问不存在的表名时会 **自动建表**。

::: tip 先配后台
列类型、主键/唯一/索引等须在后台 **列设置** 中维护；脚本 `add` 可自动扩展未声明字段，`append` 则不会改表结构。见 [CMS：IndexedDB 表](/cms/database/table)。
:::

::: info 与 k.DB.sqlite 的区别
| | **k.DB.indexedDb** | **k.DB.sqlite** |
|--|---------------------|-----------------|
| 建模 | 后台建表 + 对象 CRUD | SQL + `query` / `execute` |
| 访问 | `k.DB.indexedDb.{表名}` | `k.DB.sqlite.query(...)` |
| 配置 | 无需连接串 | 站点内置 SQLite 文件 |
:::

## 访问表

表名作为 `indexedDb` 的属性，或使用 `getTable`：

```ts
const orders = k.DB.indexedDb.orders
// 等价
const orders2 = k.DB.indexedDb.getTable("orders")
```

`getTables()` 返回当前站点表名列表（不含 `_sys_` 等内部表，与后台列表规则一致）。

```ts
k.api.get(() => {
  return { tables: k.DB.indexedDb.getTables() }
})
```

## 写入与更新

### add(value)

插入一条记录。若对象含有表中 **尚未定义的字段**，会 **自动更新表结构** 增加列。

**返回**：新记录 Id（`Guid` 字符串）；失败时为 `null`。

```ts
const id = k.DB.indexedDb.orders.add({
  orderNo: "A1001",
  amount: 99,
})
```

### append(value)

与 `add` 类似，但 **不会** 因新字段而修改表结构；未定义字段可能被忽略或导致写入失败，取决于表结构。

```ts
const id = k.DB.indexedDb.orders.append({ orderNo: "A1002", amount: 120 })
```

### update(id, value) / update(value)

- `update(id, newValue)`：`id` 为系统 `_id` 或业务主键值。  
- `update(newValue)`：对象须含 `_id`，或走内部 `UpdateOrAdd` 逻辑。

```ts
const table = k.DB.indexedDb.orders
const id = table.add({ orderNo: "A1003", status: "new" })
table.update(id, { orderNo: "A1003", status: "paid" })

const row = table.get(id)
row.status = "shipped"
table.update(row)
```

### delete(id)

按 `_id` 或主键删除。

```ts
k.DB.indexedDb.orders.delete(id)
```

## 查询

### get(id)

按 Id 或主键取单条，不存在时返回 `null` / `undefined`（以运行时为准）。

### find / findAll

支持三种形式：

**1. 条件字符串**（`==`、`>=`、`>`、`<`、`<=`、`contains`、`startwith`，可用 `&&` 组合）

```ts
const one = k.DB.indexedDb.orders.find("orderNo == 'A1001'")
const many = k.DB.indexedDb.orders.findAll("amount >= 100 && status == 'paid'")
```

**2. 字段名 + 值**（相等）

```ts
const one = k.DB.indexedDb.orders.find("orderNo", "A1001")
const many = k.DB.indexedDb.orders.findAll("status", "paid")
```

**3. 过滤器对象**（配合 `operators()`）

```ts
const { GT, CONTAINS } = k.DB.indexedDb.operators()
const one = k.DB.indexedDb.orders.find({ amount: { [GT]: 100 } })
const many = k.DB.indexedDb.orders.findAll({
  name: { [CONTAINS]: "kooboo" },
})
```

`operators()` 返回：`EQ`、`NE`、`GT`、`GTE`、`LT`、`LTE`、`CONTAINS`、`STARTS_WITH`、`AND`、`OR`（用于嵌套条件）。

### all()

返回表中全部记录（慎用大表）。

```ts
const all = k.DB.indexedDb.orders.all()
```

### Count(query) / Count(filter)

符合条件的条数。

```ts
const n = k.DB.indexedDb.orders.Count("status == 'paid'")
```

## 链式查询 Query

```ts
const rows = k.DB.indexedDb.orders
  .Query("status == 'paid'")
  .OrderByDescending("amount")
  .skip(0)
  .take(20)
```

| 方法 | 说明 |
|------|------|
| `Query()` / `Query(string)` / `Query(filter)` | 构造查询 |
| `Where(...)` | 同 `Query` 条件 |
| `OrderBy` / `OrderByDescending` | 排序字段 |
| `skip(n)` | 跳过条数 |
| `take(n)` | 取 n 条 |
| `count()` | 当前条件下条数（实现上会取数，超大表注意性能） |
| `All()` | 等价于极大 `take` |

## pagination(pageIndex, pageSize, where?)

分页封装，返回对象形如：

```ts
{
  totalCount: number
  totalPage: number
  pageSize: number
  currentPage: number
  list: /* 当前页记录数组 */
}
```

```ts
const page = k.DB.indexedDb.orders.pagination(1, 20, "status == 'paid'")
k.response.json(page)
```

`pageIndex` 从 **1** 开始。

## createIndex(fieldName)

为列创建额外索引（后台列设置中的「索引」与之配合）。

```ts
k.DB.indexedDb.orders.createIndex("orderNo")
```

## 变更历史

| 方法 | 说明 |
|------|------|
| `GetLogs(id)` | 指定记录的编辑历史（最多约 99 条） |
| `GetByLog(logId)` | 按日志 Id 还原该版本数据 |

是否在后台保留日志取决于站点/表配置；无日志时可能返回 `null`。

## TypeScript 形状（节选）

```ts
interface IDatabase {
  [tableName: string]: KTable
  getTable(name: string): ITable
  getTables(): string[]
  operators(): Operators
}

interface ITable {
  add(value: any): any
  append(value: any): any
  update(id: any, value: any): void
  update(value: any): void
  delete(id: any): void
  get(id: any): IDynamicTableObject
  find(query: string): IDynamicTableObject
  find(field: string, value: any): IDynamicTableObject
  find(filter: object): IDynamicTableObject
  findAll(query: string): IDynamicTableObject[]
  findAll(field: string, value: any): IDynamicTableObject[]
  findAll(filter: object): IDynamicTableObject[]
  all(): IDynamicTableObject[]
  Query(): ITableQuery
  Query(query: string): ITableQuery
  Query(filter: object): ITableQuery
  Count(query: string): number
  Count(filter: object): number
  pagination(index: number, size: number, where?: string): PaginationModel
  createIndex(fieldName: string): void
  GetLogs(id: any): ChangeLog[] | null
  GetByLog(logId: number): IDynamicTableObject
}
```

## 注意事项

1. **表名**：与后台一致，仅字母数字且以字母或数字开头（后台创建表规则）。  
2. **add vs append**：需要脚本侧动态加列用 `add`；结构已在后台定好时用 `append`。  
3. **系统字段**：记录含 `_id`；版本等系统字段由引擎维护，勿依赖在业务对象中随意修改。  
4. **服务端执行**：在 `env="server"` 的 Code、API、定时任务等环境中调用。  
5. **大表**：避免对大表 `all()`；优先 `pagination` 或 `Query().skip().take()`。

## 相关文档

- [k.DB 概述](../database/)  
- [k.DB.sqlite](../sqlite/)  
- [CMS：IndexedDB 表](/cms/database/table)  
- [CMS：表关系](/cms/database/table-relation)  
