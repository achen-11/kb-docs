# 页面片段缓存

> 用 `k.cache` 缓存可复用的 HTML 片段或 View 输出，在内容发布后主动清理，减少重复渲染成本。

## 适用场景

这套做法适合首页活动卡片、商品分类导航、热门文章列表、页脚链接、频道页推荐位等页面片段。它们通常在短时间内被大量访问，但内容更新频率低于访问频率。

不适合缓存用户私有内容、购物车、会员价、权限差异明显的片段。只要片段结果和用户身份、角色、货币、语言、渠道有关，就必须把这些维度写进缓存 key，或者不要共用全站缓存。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page / View | 渲染可复用页面片段 | [Page](/templateEngine/page/) · [View](/templateEngine/view/) |
| API | 暴露片段读取、发布失效、清理接口 | [k.api](/api/api/) |
| Cache | 保存生成后的 HTML 片段 | [k.cache](/api/cache/) |
| KeyValue / 内容版本 | 保存当前片段版本或内容更新时间 | [k.DB.keyValue](/api/key-value/) |
| CMS | 内容或配置更新后触发失效 | [后台 CMS](/cms/) |

## 推荐架构

页面片段缓存的核心是：缓存“渲染结果”，不是只缓存原始数据。

```text
CMS 内容 / 配置版本
        ↓
fragment renderer
        ↓
k.cache 保存 HTML 片段
        ↓
Page / View 注入片段
```

最小场景可以由 API 返回 HTML 片段；复杂项目可以把生成逻辑放进 CodeBlock 或 View，然后由 API / Page 复用。

## API：生成并缓存片段

下面示例用版本号模拟内容发布。`v1` 和 `v2` 使用不同缓存 key，避免发布后读到旧片段：

```ts
// @k-url /api/page-fragment-cache/{action}

type FragmentData = {
  html: string;
  generatedAt: string;
  version: string;
};

const versionKey = "fragment:promo:version";

function readVersion() {
  const raw = k.DB.keyValue.get(versionKey);
  return raw ? raw.toString() : "v1";
}

function cacheKey(version: string) {
  return `fragment:promo:${version}`;
}

function createFragment(): FragmentData {
  const version = readVersion();
  const headline = version === "v2" ? "限时会员福利已更新" : "本周精选活动";
  const generatedAt = new Date().toISOString();

  return {
    version,
    generatedAt,
    html: `<section class="promo-fragment" data-version="${version}">
      <strong>${headline}</strong>
      <small>生成时间：${generatedAt}</small>
    </section>`,
  };
}

k.api.get("fragment", () => {
  const version = readVersion();
  const key = cacheKey(version);
  const cacheHit = k.cache.containsKey(key);
  const data = k.cache.getOrCreate(key, createFragment, 60);

  return {
    success: true,
    cacheKey: key,
    cacheHit,
    data,
  };
});
```

如果片段来自内容列表，key 中至少应包含内容类型、栏目、语言、分页或筛选条件。不要用一个全局 key 缓存所有页面的不同片段。

## API：发布后失效

内容或配置发布后，更新版本并清理新旧 key：

```ts
k.api.post("publish", (body: { version?: string }) => {
  const previousVersion = readVersion();
  const nextVersion = body?.version === "v2" ? "v2" : "v1";

  k.DB.keyValue.set(versionKey, nextVersion);
  k.cache.remove(cacheKey(previousVersion));
  k.cache.remove(cacheKey(nextVersion));

  return {
    success: true,
    previousVersion,
    nextVersion,
  };
});

k.api.post("clear", () => {
  const version = readVersion();
  const key = cacheKey(version);
  const existed = k.cache.containsKey(key);
  k.cache.remove(key);

  return {
    success: true,
    cacheKey: key,
    existed,
    existsAfterRemove: k.cache.containsKey(key),
  };
});
```

实际项目中，`publish` 通常由后台保存动作、Hook、定时任务或运营 API 调用，不应暴露给普通访客。

## Page：注入片段

页面可以通过 API 拉取片段并注入到容器中：

```html
<!-- @k-url /fragment-cache-demo -->
<button id="load-twice" type="button">连续加载片段</button>
<button id="publish-v2" type="button">发布 v2 并重载</button>
<div id="fragment"></div>
<pre id="result">等待操作。</pre>

<script>
  const fragment = document.querySelector("#fragment");
  const result = document.querySelector("#result");

  async function getFragment() {
    const response = await fetch("/api/page-fragment-cache/fragment");
    return response.json();
  }

  function render(data) {
    fragment.innerHTML = data.data.html;
  }

  document.querySelector("#load-twice").addEventListener("click", async () => {
    const first = await getFragment();
    const second = await getFragment();
    render(second);
    result.textContent = JSON.stringify({ first, second }, null, 2);
  });
</script>
```

如果片段 HTML 来自用户输入或富文本，要确保源内容已经过 CMS 或服务端净化，不要把未处理的用户提交直接拼进 HTML。

## 失效策略

| 情况 | 推荐处理 |
|------|----------|
| 内容发布 | 清理当前栏目/语言/分页对应的片段缓存 |
| 配置更新 | 更新版本号并清理新旧缓存 key |
| 多语言站点 | key 包含 culture，例如 `fragment:promo:zh-CN:v2` |
| 商品/价格片段 | key 包含货币、会员组、渠道；敏感价格谨慎缓存 |
| 个性化片段 | 优先不用全站 `k.cache`，或按用户/角色隔离 |
| 片段生成失败 | 不缓存失败结果，返回可读降级内容并记录日志 |

## 相关

- [k.cache](/api/cache/)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
- [Page](/templateEngine/page/)
- [View](/templateEngine/view/)
