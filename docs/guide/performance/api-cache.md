# API 响应缓存

> 用 `k.cache` 缓存 API 的计算结果或外部请求结果，减少重复计算，并提供明确的失效入口。

## 适用场景

这套做法适合缓存全站共享、短时间内重复读取的数据，例如首页统计、商品分类摘要、配置聚合、第三方接口响应、报表摘要等。

不适合缓存和用户强绑定、权限差异明显、实时性要求极高的数据。用户级临时状态优先考虑 [k.session](/api/session/)，而不是全站共享缓存。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| API | 暴露读取和清理缓存的入口 | [k.api](/api/api/) |
| Cache | 保存跨请求共享的结果，设置过期时间 | [k.cache](/api/cache/) |
| Page | 触发 API 请求，展示缓存命中状态 | [Page](/templateEngine/page/) |
| CodeBlock | 复杂计算、第三方调用或数据库查询应下沉到 service | [CMS：代码](/cms/development/code) |
| Logger | 缓存异常、第三方调用失败需要记录日志 | [k.logger](/api/logger/) |

## 推荐架构

最小结构：

```text
src/
├── api/
│   └── summary-cache.ts
└── page/
    └── summary-cache.html
```

当缓存内容来自数据库、第三方服务或复杂计算时，把生成逻辑放到 CodeBlock：

```text
src/
├── api/summary-cache.ts
└── code/services/summary.ts
```

API 只负责读请求、拼缓存键、调用 service、返回统一结构。

## API：读取缓存

使用 `containsKey` 判断本次请求是否命中缓存，再用 `getOrCreate` 保证未命中时只执行一次生成逻辑。

```ts
// @k-url /api/summary-cache/{action}

const cacheKey = "summary:home";

function createSummary() {
  return {
    generatedAt: new Date().toISOString(),
    value: Math.floor(Math.random() * 1000000),
  };
}

k.api.get("summary", () => {
  const hadCache = k.cache.containsKey(cacheKey);
  const summary = k.cache.getOrCreate(cacheKey, createSummary, 60);

  return {
    success: true,
    cacheKey,
    cacheHit: hadCache,
    data: {
      ...summary,
      source: hadCache ? "cache" : "factory",
    },
  };
});
```

缓存键要包含业务含义。如果结果和语言、货币、租户、角色或筛选条件有关，应把这些维度写进 key，避免不同上下文读到同一份缓存。

## API：清理缓存

给后台操作、调试或内容更新流程预留清理入口：

```ts
k.api.post("clear", () => {
  const existed = k.cache.containsKey(cacheKey);
  k.cache.remove(cacheKey);

  return {
    success: true,
    existed,
    existsAfterRemove: k.cache.containsKey(cacheKey),
  };
});
```

如果缓存由多篇内容、多个配置或多个商品共同影响，应设计分组 key 或集中清理策略，不要把清理逻辑散落在多个 API 里。

## Page：观察缓存状态

前台页面不需要知道缓存实现，只需要展示 API 返回的 `cacheHit` 和 `generatedAt`：

```html
<!-- @k-url /summary-cache -->
<button id="load-twice" type="button">连续加载两次</button>
<button id="clear-cache" type="button">清理缓存</button>
<pre id="result">等待操作。</pre>

<script>
  const result = document.querySelector("#result");

  async function getSummary() {
    const response = await fetch("/api/summary-cache/summary");
    return response.json();
  }

  async function clearCache() {
    const response = await fetch("/api/summary-cache/clear", { method: "POST" });
    return response.json();
  }

  document.querySelector("#load-twice").addEventListener("click", async () => {
    const first = await getSummary();
    const second = await getSummary();
    result.textContent = JSON.stringify({ first, second }, null, 2);
  });

  document.querySelector("#clear-cache").addEventListener("click", async () => {
    const cleared = await clearCache();
    const afterClear = await getSummary();
    result.textContent = JSON.stringify({ cleared, afterClear }, null, 2);
  });
</script>
```

## 失效策略

| 情况 | 推荐做法 |
|------|----------|
| 数据短时间可复用 | `getOrCreate(key, factory, seconds)` |
| 内容或配置被后台更新 | 更新后调用清理 API 或在相关保存逻辑中 `remove` |
| 结果与用户权限有关 | 不共用全站 key；把权限维度写入 key，或不用 `k.cache` |
| 第三方接口偶发失败 | 不把失败结果长期缓存；记录日志并返回可读错误 |
| 多节点或部署策略不确定 | 把缓存当性能优化，不当唯一数据来源 |

## 相关

- [k.cache](/api/cache/)
- [k.api](/api/api/)
- [k.session](/api/session/)
- [k.logger](/api/logger/)
- [Page](/templateEngine/page/)
