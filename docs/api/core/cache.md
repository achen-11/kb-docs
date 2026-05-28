# k.cache

> 站点级内存缓存，在同一站点内跨请求共享

## 概述

`k.cache` 将键值缓存在服务器内存中，按**当前站点**隔离（内部按站点 Id 分组）。适合缓存 API 计算结果、外部请求响应等，减少重复计算。

::: tip 与 k.session 的区别
| API | 存储 | 典型用途 |
|-----|------|----------|
| **`k.cache`** | 站点内存缓存，可设过期秒数 | 热点数据、计算结果、全站共享 |
| **`k.session`** | 会话存储，绑定访客会话 | 购物车、登录前临时状态 |
:::

未命中时 `get` 返回 **`undefined`**（与 `containsKey` 配合使用）。

## TypeScript 定义（节选）

```ts
interface KCache {
  set(key: string, value: any, seconds: number): void;
  set(key: string, value: any): void;
  get(key: string): any;
  getOrCreate(key: string, factory: () => any, seconds: number): any;
  remove(key: string): void;
  removeAll(): void;
  containsKey(key: string): boolean;
  localCache(externalUrl: string, hours: number): string;
  getOrSet(key: string, scriptOrFunctionName: string, timeOutMinutes: number): any;
}
```

## set()

写入缓存。

| 调用 | 说明 |
|------|------|
| `set(key, value, seconds)` | `seconds` 为绝对过期时间（秒） |
| `set(key, value)` | 默认约 **120 分钟** 过期 |

键名最长 **1024** 字符；过期秒数受服务端 `Cache:MaxExpireSeconds` 配置上限（默认约 2 小时）。

```ts
k.api.post(() => {
    const key = "demo-" + Date.now()
    k.cache.set(key, { ok: true }, 60)
    return {
        stored: k.cache.containsKey(key),
        value: k.cache.get(key)
    }
})
```

## get()

读取缓存；不存在时返回 `undefined`。

```ts
k.api.get(() => {
    const key = k.request.queryString.key
    return k.cache.get(key)
})
```

## getOrCreate()

不存在时执行 `factory` 写入缓存并返回值。

```ts
k.api.get(() => {
    const key = "expensive-" + k.request.queryString.id
    const value = k.cache.getOrCreate(
        key,
        () => {
            return { computedAt: Date.now(), id: k.request.queryString.id }
        },
        300
    )
    return value
})
```

## containsKey()

```ts
k.api.get(() => {
    return { exists: k.cache.containsKey("my-key") }
})
```

## remove() / removeAll()

`remove(key)` 删除单项；`removeAll()` 清除**当前站点**下本缓存分组内的全部项。

```ts
k.api.post(() => {
    const key = "rm-" + Date.now()
    k.cache.set(key, 1, 60)
    k.cache.remove(key)
    return { exists: k.cache.containsKey(key) }
})
```

## localCache()

将外部 URL 资源缓存到站点本地，返回可访问的本地 URL。

```ts
k.api.get(() => {
    const url = k.cache.localCache("https://example.com/asset.png", 24)
    return { localUrl: url }
})
```

## getOrSet()

未命中时执行一行 KScript（`scriptOrFunctionName`），将结果写入缓存。

| 参数 | 说明 |
|------|------|
| key | 缓存键 |
| scriptOrFunctionName | 要执行的脚本片段 |
| timeOutMinutes | 过期分钟数 |

```ts
k.api.get(() => {
    const data = k.cache.getOrSet(
        "report-summary",
        "k.DB.sqlite.query('SELECT 1')",
        30
    )
    return data
})
```

## 相关文档

- [k.session](./session.md)
- [k.cookie](./cookie.md)
