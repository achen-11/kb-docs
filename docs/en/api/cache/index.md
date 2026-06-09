# k.cache

> Site-wide in-memory cache, shared across requests within the same site

## Overview

`k.cache` caches key values ​​in server memory, isolated by **Current Site** (internally grouped by Site Id). Suitable for caching API calculation results, external request responses, etc. to reduce repeated calculations.

::: The difference between tip and k.session
| API | storage | Typical uses |
|-----|------|----------|
| **`k.cache`** | Site memory cache, expiration seconds can be set | Hotspot data, calculation results, site-wide sharing |
| **`k.session`** | Session storage, binding guest sessions | Shopping cart, temporary status before login |
:::

On a miss, `get` returns **`undefined`** (used with `containsKey`).

## TypeScript definition (excerpt)

```ts
interface KCache {
  set(key: string, value: any, seconds: number): void;
  set(key: string, value: any): void;
  set(key: string, value: any, options: CacheOptions): void;
  get(key: string): any;
  getOrCreate(key: string, factory: () => any, seconds: number): any;
  getOrCreate(key: string, factory: () => any, options?: CacheOptions): any;
  remove(key: string): void;
  removeAll(): void;
  containsKey(key: string): boolean;
  localCache(externalUrl: string, hours: number): string;
  getOrSet(key: string, scriptOrFunctionName: string, timeOutMinutes: number): any;
}

interface CacheOptions {
  absoluteExpiration?: TimeSpan;
  slidingExpiration?: TimeSpan;
  cascades: CacheCascade[];
}

interface CacheCascade {
  key: string;
  removeChangeToken: boolean;
}
```

## set()

Write cache.

| call | Description |
|------|------|
| `set(key, value, seconds)` | `seconds` is the absolute expiration time (seconds) |
| `set(key, value)` | Default expires in approximately **120 minutes** |
| `set(key, value, options)` | Use `CacheOptions` to control expiration and cascading failures (see next section) |

The key name can be up to **1024** characters; the number of seconds in `set(key, value, seconds)` is subject to the upper limit of the server's `Cache:MaxExpireSeconds` configuration (default is about 2 hours).

## Options overload (`set` / `getOrCreate`)

When the third parameter is passed in **`options`**, absolute expiration, sliding expiration, and **cascading key (`cascades`)** can be set respectively: When a cascading key is triggered by `remove` / `CascadeRemove`, the associated cache items will be invalidated. `removeAll()` performs cascade cleanup of the current site ID.

| Field | Description |
|------|------|
| `absoluteExpiration` | Expires after this amount of time since writing (type **`TimeSpan`**, not bare numeric seconds) |
| `slidingExpiration` | Sliding expiration: expires if there is no access within this period (`TimeSpan`) |
| `cascades` | `{ key, removeChangeToken }[]`; `key` is the cascade group name, `removeChangeToken` controls whether to remove the token when the item is eliminated |

For daily expiration, use **`set(key, value, seconds)`**; `set(key, value, seconds)` is internally equivalent to the simplified writing method with `absoluteExpiration` and `cascades` containing the current site ID.

Use `options` when you need **Sliding Expiration** or **Custom Cascading Key**. `absoluteExpiration` / `slidingExpiration` must be entered according to the smart prompt **`TimeSpan`** (cannot be written as a naked number such as `set(key, value, 120)`).

The `cascades` item is the `CacheCascade` structure (`key`, `removeChangeToken`). The specific object writing method depends on the editor type. If it is inconvenient to configure in the script, you can continue to use the seconds reload of **`set` / `getOrCreate`** (the cascade key of the current site has been automatically bound).

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

Read cache; returns `undefined` if not present.

```ts
k.api.get(() => {
    const key = k.request.queryString.key
    return k.cache.get(key)
})
```

## getOrCreate()

If it does not exist, execute `factory` to write to the cache and return the value.

| call | Description |
|------|------|
| `getOrCreate(key, factory, seconds)` | Seconds to expire (commonly used) |
| `getOrCreate(key, factory, options?)` | Use `CacheOptions` |

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

`remove(key)` deletes a single item; `removeAll()` clears all items in this cache group under the current site.

```ts
k.api.post(() => {
    const key = "rm-" + Date.now()
    k.cache.set(key, 1, 60)
    k.cache.remove(key)
    return { exists: k.cache.containsKey(key) }
})
```

## localCache()

Cache external URL resources locally on the site, returning an accessible local URL.

```ts
k.api.get(() => {
    const url = k.cache.localCache("https://example.com/asset.png", 24)
    return { localUrl: url }
})
```

## getOrSet()

On a miss, execute a line of KScript (`scriptOrFunctionName`) and write the result to the cache.

| Parameter | Description |
|------|------|
| key | cache key |
| scriptOrFunctionName | script fragment to execute |
| timeOutMinutes | Expiration minutes |

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

## Related Docs

- [k.session](../session/)
- [k.cookie](../cookie/)
