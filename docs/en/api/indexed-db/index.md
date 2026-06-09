# k.DB.indexedDb

> Site IndexedDB dynamic table - the same set of data as the background [IndexedDB Tables](/en/cms/database/table)

## Overview

`k.DB.indexedDb` accesses the **IndexedDB dynamic table** of the current site. The table name corresponds to the table created in the background **Database → IndexedDB table**; when a non-existing table name is accessed for the first time, the table will be **automatically created**.

::: tip configure the background first
Column types, primary keys/unique/indexes, etc. must be maintained in the background **Column Settings**; script `add` can automatically expand undeclared fields, while `append` will not change the table structure. See [CMS: IndexedDB Tables](/en/cms/database/table).
:::

::: The difference between info and k.DB.sqlite
| | **k.DB.indexedDb** | **k.DB.sqlite** |
|--|--------------------------|------------------|
| Modeling | Background table creation + object CRUD | SQL + `query` / `execute` |
| access | `k.DB.indexedDb.{table name}` | `k.DB.sqlite.query(...)` |
| Configuration | No connection string required | Site built-in SQLite files |
:::

## access table

Table name as an attribute of `indexedDb`, or use `getTable`:

```ts
const orders = k.DB.indexedDb.orders
// Equivalent
const orders2 = k.DB.indexedDb.getTable("orders")
```

`getTables()` returns the current site table name list (excluding internal tables such as `_sys_`, consistent with the background list rules).

```ts
k.api.get(() => {
  return { tables: k.DB.indexedDb.getTables() }
})
```

## Write and update

### add(value)

Insert a record. If the object contains **undefined fields** in the table, it will **automatically update the table structure** and add columns.

**Returns**: New record Id (`Guid` string); `null` on failure.

```ts
const id = k.DB.indexedDb.orders.add({
  orderNo: "A1001",
  amount: 99,
})
```

### append(value)

Similar to `add`, but does not modify the table structure due to new fields; undefined fields may be ignored or cause writes to fail, depending on the table structure.

```ts
const id = k.DB.indexedDb.orders.append({ orderNo: "A1002", amount: 120 })
```

### update(id, value) / update(value)

- `update(id, newValue)`: `id` is the system `_id` or business primary key value.
- `update(newValue)`: The object must contain `_id`, or use internal `UpdateOrAdd` logic.

```ts
const table = k.DB.indexedDb.orders
const id = table.add({ orderNo: "A1003", status: "new" })
table.update(id, { orderNo: "A1003", status: "paid" })

const row = table.get(id)
row.status = "shipped"
table.update(row)
```

### delete(id)

Delete by `_id` or primary key.

```ts
k.DB.indexedDb.orders.delete(id)
```

## Query

### get(id)

Get a single item by Id or primary key, and return `null` / `undefined` if it does not exist (subject to runtime).

### find/findAll

Three forms are supported:

**1. Condition string** (`==`, `>=`, `>`, `<`, `<=`, `contains`, `startwith`, available in `&&` combination)

```ts
const one = k.DB.indexedDb.orders.find("orderNo == 'A1001'")
const many = k.DB.indexedDb.orders.findAll("amount >= 100 && status == 'paid'")
```

**2. Field name + value** (equal)

```ts
const one = k.DB.indexedDb.orders.find("orderNo", "A1001")
const many = k.DB.indexedDb.orders.findAll("status", "paid")
```

**3. Filter object** (with `operators()`)

```ts
const { GT, CONTAINS } = k.DB.indexedDb.operators()
const one = k.DB.indexedDb.orders.find({ amount: { [GT]: 100 } })
const many = k.DB.indexedDb.orders.findAll({
  name: { [CONTAINS]: "kooboo" },
})
```

`operators()` returns: `EQ`, `NE`, `GT`, `GTE`, `LT`, `LTE`, `CONTAINS`, `STARTS_WITH`, `AND`, `OR` (for nested conditions).

### all()

Return all records in the table (use large tables with caution).

```ts
const all = k.DB.indexedDb.orders.all()
```

### Count(query) / Count(filter)

The number of items that meet the conditions.

```ts
const n = k.DB.indexedDb.orders.Count("status == 'paid'")
```

## Chain query Query

```ts
const rows = k.DB.indexedDb.orders
  .Query("status == 'paid'")
  .OrderByDescending("amount")
  .skip(0)
  .take(20)
```

| Method | Description |
|------|------|
| `Query()` / `Query(string)` / `Query(filter)` | Construct query |
| `Where(...)` | Same as `Query` condition |
| `OrderBy` / `OrderByDescending` | sort field |
| `skip(n)` | Skip number |
| `take(n)` | Take n items |
| `count()` | The number of items under current conditions (the number will be taken in the implementation, pay attention to performance for very large tables) |
| `All()` | Equivalent to maximum `take` |

## pagination(pageIndex, pageSize, where?)

Paging encapsulation, the returned object looks like:

```ts
{
  totalCount: number
  totalPage: number
  pageSize: number
  currentPage: number
  list: /* Records on the current page */
}
```

```ts
const page = k.DB.indexedDb.orders.pagination(1, 20, "status == 'paid'")
k.response.json(page)
```

`pageIndex` starts at **1**.

## createIndex(fieldName)

Create an additional index for the column (the "Index" in the background column settings works with this).

```ts
k.DB.indexedDb.orders.createIndex("orderNo")
```

## Change history

| Method | Description |
|------|------|
| `GetLogs(id)` | Editing history of specified records (up to about 99 records) |
| `GetByLog(logId)` | Restore this version data by log ID |

Whether logs are kept in the background depends on the site/table configuration; `null` may be returned if there are no logs.

## TypeScript shapes (excerpt)

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

## Notes

1. **Table name**: consistent with the background, only alphanumeric and starting with a letter or number (backend table creation rules).
2. **add vs append**: Use `add` to dynamically add columns on the script side; use `append` when the structure has been determined in the background.
3. **System fields**: The record contains `_id`; system fields such as version are maintained by the engine and should not be modified at will in the business object.
4. **Server-side execution**: Called in `env="server"`'s Code, API, scheduled tasks and other environments.
5. **Large table**: Avoid `all()` for large tables; give priority to `pagination` or `Query().skip().take()`.

## Association table (table relationship)

After being configured in the background [IndexedDB Table Relations](/en/cms/database/table-relation), when reading the main table records, you can use the **relationship name** to access the related table data (one-to-many/many-to-many as an array). For example `const items = order.lineItems`.

## Related Docs

- [k.DB Overview](../database/)
- [k.DB.sqlite](../sqlite/)
- [CMS: IndexedDB Tables](/en/cms/database/table)
- [CMS: Table Relations](/en/cms/database/table-relation)
