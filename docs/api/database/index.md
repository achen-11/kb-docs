# k.DB

> 数据库操作 - 支持多种数据库的统一 CRUD 接口

## 概述

`k.DB` 提供对 Kooboo 内置数据库的访问，支持：

- **SQLite** - 开箱即用，无需配置
- **MySQL / SQL Server / MongoDB** - 需在系统配置中设置连接字符串

所有数据库操作采用统一的 API 设计，底层自动适配不同的数据库引擎。

## 子模块


| 模块                       | 说明              |
| ------------------------ | --------------- |
| [k.DB.sqlite](../sqlite/) | SQLite 数据库，无需配置 |


## TypeScript 定义

```ts
interface KDB {
    /** 获取 sqlite 数据库实例 */
    sqlite: SQLiteDB;
    /** 获取指定类型的数据库实例 */
    getDB(dbType: DbType): GenericDB;
}

interface SQLiteDB {
    /** 获取数据库内所有表名 */
    getTables(): string[];
    /** 获取指定表对象 */
    getTable(name: string): ITable;
    /** 查询数据，返回数组 */
    query(sql: string, params?: object): any[];
    /** 执行写操作，返回数字（1=成功） */
    execute(sql: string, params?: object): number;
    /** 获取查询操作符集合 */
    operators(): Operators;
    /** 在事务中执行多个操作 */
    transaction(action: Function): void;
}
```

## sqlite 与 ORM

如需更便捷的 ORM 操作，可以使用 [k.DB.sqlite](../sqlite/) 模块进行直接的 SQL 查询。

## 相关文档

- [k.DB.sqlite](../sqlite/) - SQLite 数据库操作
- [k.content](../content/) - 内容管理

