# KeyValue 配置与缓存

> 用 `k.DB.keyValue` 保存少量站点级配置，用 `k.cache` 缓存解析后的结果，并在配置更新时主动失效。

## 适用场景

这套做法适合运营开关、Feature Flag、首页活动配置、同步时间戳、轻量状态标记等数据。它们通常只有少量键值，不需要复杂查询，也不值得单独建业务表。

不适合保存大对象、列表数据、需要分页筛选的数据或用户私有数据。KeyValue 的值按字符串存储，结构化对象需要自行 `JSON.stringify` / `JSON.parse`。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS 键值存储 | 后台维护简单键值 | [CMS：键值存储](/cms/database/key-value) |
| KeyValue API | 读写站点级字符串键值 | [k.DB.keyValue](/api/key-value/) |
| Cache | 缓存解析后的配置对象，减少重复 JSON parse 或聚合计算 | [k.cache](/api/cache/) |
| API | 提供读取、更新、清理入口 | [k.api](/api/api/) |
| Page | 触发配置读取与更新，观察缓存命中 | [Page](/templateEngine/page/) |

## 推荐架构

KeyValue 只保存原始字符串，业务 API 负责解析、默认值和缓存：

```text
CMS / API 写入 KeyValue
        ↓
src/api/config.ts
        ↓
k.cache 缓存解析结果
        ↓
Page / View / 业务 API 读取配置
```

推荐给每类配置定义固定 key，例如 `site:promo-config`、`sync:last-run-at`。如果配置会影响多个页面或 API，写入后必须清理对应缓存。

## API：读取配置并缓存解析结果

下面示例保存一个活动配置。KeyValue 中存 JSON 字符串，读取时缓存解析后的对象：

```ts
// @k-url /api/promo-config/{action}

type PromoConfig = {
  enabled: boolean;
  title: string;
  discount: number;
  updatedAt: string;
};

const configKey = "promo-config";
const cacheKey = "promo-config:parsed";

function defaultConfig(): PromoConfig {
  return {
    enabled: true,
    title: "夏季会员专享",
    discount: 15,
    updatedAt: new Date().toISOString(),
  };
}

function readRaw() {
  const raw = k.DB.keyValue.get(configKey);
  return raw ? raw.toString() : "";
}

function parseConfig(raw: string): PromoConfig {
  if (!raw) return defaultConfig();
  const data = JSON.parse(raw);
  return {
    enabled: data.enabled === true,
    title: String(data.title || "默认活动"),
    discount: Number(data.discount || 0),
    updatedAt: String(data.updatedAt || new Date().toISOString()),
  };
}

function getConfig() {
  return parseConfig(readRaw());
}

k.api.get("config", () => {
  const cacheHit = k.cache.containsKey(cacheKey);
  const data = k.cache.getOrCreate(cacheKey, getConfig, 60);

  return {
    success: true,
    cacheHit,
    exists: k.DB.keyValue.contains(configKey),
    data,
  };
});
```

如果配置来自后台人工编辑，读取 API 仍应提供默认值和解析失败兜底，避免一个错误 JSON 让前台页面整体不可用。

## API：更新后清理缓存

写入配置后立即移除缓存，下一次读取才会重新解析 KeyValue：

```ts
k.api.post("update", (body: Partial<PromoConfig>) => {
  const next: PromoConfig = {
    enabled: body?.enabled === false ? false : true,
    title: String(body?.title || "默认活动").trim(),
    discount: Number(body?.discount || 0),
    updatedAt: new Date().toISOString(),
  };

  k.DB.keyValue.set(configKey, JSON.stringify(next));
  k.cache.remove(cacheKey);

  return {
    success: true,
    cacheCleared: true,
    data: next,
  };
});
```

删除配置时也要清理缓存：

```ts
k.api.post("clear", () => {
  const existed = k.DB.keyValue.contains(configKey);
  k.DB.keyValue.remove(configKey);
  k.cache.remove(cacheKey);

  return {
    success: true,
    existed,
    existsAfterRemove: k.DB.keyValue.contains(configKey),
    cacheCleared: true,
  };
});
```

## Page：观察缓存命中

页面可以连续读取两次，用第二次响应确认缓存命中：

```html
<!-- @k-url /promo-config-demo -->
<button id="read-twice" type="button">连续读取两次</button>
<button id="update" type="button">更新活动配置</button>
<pre id="result">等待操作。</pre>

<script>
  const result = document.querySelector("#result");

  async function getConfig() {
    const response = await fetch("/api/promo-config/config");
    return response.json();
  }

  async function updateConfig() {
    const response = await fetch("/api/promo-config/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "限时加购优惠", discount: 22 }),
    });
    return response.json();
  }

  document.querySelector("#read-twice").addEventListener("click", async () => {
    const first = await getConfig();
    const second = await getConfig();
    result.textContent = JSON.stringify({ first, second }, null, 2);
  });

  document.querySelector("#update").addEventListener("click", async () => {
    const updated = await updateConfig();
    const afterUpdate = await getConfig();
    result.textContent = JSON.stringify({ updated, afterUpdate }, null, 2);
  });
</script>
```

实际项目里，更新配置的入口通常应放在后台 API 或受权限保护的运营页面，不要暴露给普通访客。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| key 不存在 | 返回默认配置，并标记 `exists: false` |
| JSON 解析失败 | 记录日志，返回默认配置或最后一次有效配置 |
| 配置更新 | `k.DB.keyValue.set` 后立即 `k.cache.remove` |
| 配置删除 | 删除 KeyValue 后清理缓存，读取时回退默认值 |
| 值过大 | 改用 IndexedDB / SQLite / 内容类型，不塞进 KeyValue |
| 用户私有配置 | 不放全站 KeyValue；按用户维度用业务表或 session |

## 相关

- [k.DB.keyValue](/api/key-value/)
- [k.cache](/api/cache/)
- [k.api](/api/api/)
- [CMS：键值存储](/cms/database/key-value)
- [Page](/templateEngine/page/)
