# k.DB.sqlite

> SQLite 数据库操作 - 无需配置的轻量级数据库

## 概述

`k.DB.sqlite` 提供 SQLite 数据库的访问，开箱即用，无需任何配置。SQLite 数据存储在站点目录下。

## 方法

### query()

执行 SQL 查询语句，返回结果数组。

```ts
k.api.get(() => {
    const result = k.DB.sqlite.query("SELECT 1 as id, 'hello' as name")
    return { result }
})
// 返回: [{ "id": 1, "name": "hello" }]
```

**带参数查询：**

```ts
k.api.get(() => {
    const users = k.DB.sqlite.query(
        "SELECT * FROM users WHERE status = @status",
        { status: 1 }
    )
    return { users }
})
```

### execute()

执行 INSERT、UPDATE、DELETE 等写操作。返回数字：`1` 表示成功。

```ts
k.api.post(() => {
    // 创建表
    k.DB.sqlite.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)")

    // 插入数据
    k.DB.sqlite.execute(
        "INSERT INTO users (name) VALUES (@name)",
        { name: "kooboo" }
    )

    return { success: true }
})
```

**UPDATE 示例：**

```ts
k.api.post(() => {
    const result = k.DB.sqlite.execute(
        "UPDATE users SET name = @name WHERE id = @id",
        { name: "updated", id: 1 }
    )
    return { result }  // 返回 1 表示成功
})
```

**DELETE 示例：**

```ts
k.api.post(() => {
    const result = k.DB.sqlite.execute(
        "DELETE FROM users WHERE id = @id",
        { id: 1 }
    )
    return { result }  // 返回 1 表示成功
})
```

## 注意事项

1. **参数化查询** - 使用 `@param` 占位符防止 SQL 注入
2. **表名需手动管理** - 需要先 CREATE TABLE 再进行操作
3. **返回类型** - execute() 返回数字（1=成功），不是对象

## 相关文档

- [k.DB](./index.md) - 数据库概览
- [k.content](../content.md) - 内容管理
