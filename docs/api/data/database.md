# k.DB

> 数据库操作 - 支持多种数据库的统一 CRUD 接口

## 概述

`k.DB` 提供对 Kooboo 内置数据库的访问，支持：
- **SQLite** - 开箱即用，无需配置
- **MySQL / SQL Server / MongoDB** - 需在系统配置中设置连接字符串

所有数据库操作采用统一的 API 设计，底层自动适配不同的数据库引擎。

## TypeScript 定义

```ts
interface KDB {
    /** 获取 sqlite 数据库实例 */
    sqlite: SQLiteDB;
    /** 获取指定类型的数据库实例 */
    getDB(dbType: DbType): GenericDB;
    /** 执行 SQL 查询 */
    query(sql: string, params?: object): any;
}

interface SQLiteDB {
    /** 查询数据 */
    query(sql: string, params?: object): any;
    /** 执行更新操作 */
    execute(sql: string, params?: object): ExecuteResult;
}
```

## sqlite.query()

> 执行 SQL 查询语句

**参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `sql` | string | 是 | SQL 查询语句，支持参数化查询 |
| `params` | object | 否 | 查询参数，用于替换 SQL 中的占位符 |

**返回：** `any[]` - 查询结果数组

**示例：**

```ts
k.api.get(() => {
    // 基础查询
    const users = k.DB.sqlite.query(`
        SELECT * FROM users WHERE status = @status
    `, { status: 1 })

    return users
})
```

**错误：**

| 错误码 | 条件 | 处理方式 |
|--------|------|----------|
| `SQLITE_ERROR` | SQL 语法错误 | 检查 SQL 语句语法 |
| `SQLITE_CONSTRAINT` | 违反约束 | 检查数据完整性 |

## sqlite.execute()

> 执行 INSERT、UPDATE、DELETE 等写操作

**参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `sql` | string | 是 | SQL 语句 |
| `params` | object | 否 | 执行参数 |

**返回：**

```ts
interface ExecuteResult {
    changes: number;    // 受影响的行数
    lastId: string;    // 最后插入的 ID（针对自增主键）
}
```

**示例：**

```ts
k.api.post(async (ctx) => {
    const { username, email } = await ctx.request.json()

    const result = k.DB.sqlite.execute(`
        INSERT INTO users (username, email, created)
        VALUES (@username, @email, @created)
    `, {
        username,
        email,
        created: Date.now()
    })

    return { id: result.lastId, changes: result.changes }
})
```

## 使用 ORM 模块

除了直接写 SQL，你还可以使用 `sqlite_orm` 模块获得更便捷的 ORM 操作：

```ts
// 定义模型
import { define } from 'module:sqlite_orm'

const ProductModel = define("products", {
    title: { type: String, required: true },
    price: { type: Number },
    active: { type: Boolean, default: false }
}, { timestamps: true })

// CRUD 操作
const id = ProductModel.create({ title: "Product 1", price: 99.9 })
const product = ProductModel.findById(id)
const updated = ProductModel.updateById(id, { price: 79.9 })
ProductModel.deleteById(id)
```

详见：[sqlite_orm 模块使用](../modules/sqlite-orm.md)

## 相关文档

- [k.content](./content.md) - 内容管理
- [k.storage](./storage.md) - 文件存储
