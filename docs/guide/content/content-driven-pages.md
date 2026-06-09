# 内容驱动列表/详情页

> 用 CMS 内容类型和内容夹维护文章条目，用 `k.content` 在 API 中查询、筛选和读取详情，再由 Page 渲染公开列表与详情。

## 适用场景

这套做法适合新闻、博客、文档、活动、案例、帮助中心、商品说明等由运营维护内容、前台公开展示的页面。开发侧负责内容模型、查询 API、URL 规则和发布过滤；运营侧在 CMS 中维护条目。

不适合把结构化内容硬编码在 Page 或 JS 文件里。只要内容需要后台维护、分类、搜索、草稿、排序、详情页或 SEO，就应先建内容类型和内容夹，再用 `k.content` 读取。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| 数据类型 | 定义 `title`、`slug`、`category`、`summary`、`body` 等字段 | [数据类型](/cms/content/content-types) |
| 内容夹 | 绑定数据类型，承载多条内容 | [内容列表](/cms/content/contents-folders-list) |
| 内容条目 | 由运营维护文章、草稿、排序和发布状态 | [内容条目](/cms/content/contents-entries) |
| API | 用 `k.content.Article` 输出列表、详情、分类和搜索 | [k.content](/api/content/) |
| Page | 调用 API 并渲染列表/详情交互 | [Page](/templateEngine/page/) |
| View | 复杂站点可抽出文章卡片、面包屑、详情区 | [View](/templateEngine/view/) |

## 推荐架构

内容模型先在 CMS 中稳定下来：

```text
CMS 数据类型 Article
  ├─ title
  ├─ slug
  ├─ category
  ├─ summary
  └─ body
        ↓
CMS 内容夹 Article
        ↓
src/api/content-pages.ts
        ↓
src/page/content-driven-pages.html
```

内容夹名称就是 `k.content` 上的属性名。内容夹叫 `Article`，脚本中就通过 `k.content.Article.all()`、`k.content.Article.find()`、`k.content.Article.get()` 读取。

::: tip CMS 资源与 CLI 资源的边界
数据类型和内容夹是 CMS 后台资源，应通过后台创建和维护。Kooboo CLI 适合同步 Page、API、View、CodeBlock 等开发资源；不要假设存在稳定的 `src/content-type` 或 `src/content-folder` 目录可直接同步内容模型。
:::

## 内容模型：字段建议

文章类内容至少建议包含：

| 字段 | 用途 |
|------|------|
| `title` | 列表标题、详情标题、SEO title 来源之一 |
| `slug` | 详情页 URL 或 API 查询 key |
| `category` | 列表筛选、导航分组、推荐位 |
| `summary` | 列表摘要、Open Graph description 来源之一 |
| `body` | 详情正文 |
| `UserKey` | 系统字段，可作为稳定业务 key |
| `Online` | 系统字段，表示是否公开发布 |
| `Sequence` | 系统字段，用于列表排序 |

`slug` 和 `UserKey` 的分工要清楚：`UserKey` 是内容系统内的稳定 key，`slug` 更适合作为公开 URL 的一部分。小站点可以让两者相同，大站点应给 slug 做唯一性校验。

## API：初始化和公开列表

示例假设 CMS 中已经存在 `Article` 内容夹。初始化 API 用 `k.content.Article.add()` 写入测试内容：

```ts
// @k-url /api/content-pages/{action}

function ensureFolder() {
  if (!k.content.Article) {
    return {
      success: false,
      code: "CONTENT_FOLDER_MISSING",
      message: "请先在 CMS 后台创建 Article 内容类型和内容夹。",
      folders: k.content.getFolders(),
    };
  }

  return null;
}

k.api.get("seed", () => {
  const missing = ensureFolder();
  if (missing) return missing;

  k.content.Article.all({ includeOfflineData: true }).forEach((item) => {
    k.content.Article.delete(item);
  });

  k.content.Article.add({
    userKey: "launch-checklist",
    title: "发布清单",
    slug: "launch-checklist",
    category: "operations",
    summary: "上线前确认内容、URL、SEO、导航和回退页面。",
    body: "内容驱动页面应把列表查询、详情读取、发布状态和分类筛选放在服务端处理。",
    online: true,
    sequence: 1,
  });

  return { success: true };
});
```

公开列表建议用 `includeOfflineData: true` 读取完整集合，再按业务规则过滤 `online`。这样 API 能同时验证草稿确实被排除：

```ts
function toArticle(item) {
  return {
    id: item.id,
    userKey: item.userKey,
    title: item.title,
    slug: item.slug || item.userKey,
    category: item.category || "",
    summary: item.summary || "",
    body: item.body || "",
    online: item.online !== false,
    sequence: Number(item.sequence || item.order || 0),
  };
}

function readAll(includeDrafts = false) {
  const items = k.content.Article
    .all({ includeOfflineData: true })
    .map((item) => toArticle(item))
    .sort((a, b) => a.sequence - b.sequence);

  return includeDrafts ? items : items.filter((item) => item.online);
}
```

## API：分类、搜索和详情

分类筛选可以使用 `findAll({ category })`，详情页用 `find({ slug })`：

```ts
k.api.get("list", () => {
  const category = String(k.request.queryString.category || "").trim();
  const query = String(k.request.queryString.q || "").trim().toLowerCase();
  let items = readAll(false);

  if (category) {
    items = k.content.Article
      .findAll({ category }, { includeOfflineData: true })
      .map((item) => toArticle(item))
      .filter((item) => item.online);
  }

  if (query) {
    items = items.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.body.toLowerCase().includes(query)
    );
  }

  return { success: true, total: items.length, items };
});
```

详情 API 要区分缺少 slug、内容不存在和草稿未发布：

```ts
k.api.get("detail", () => {
  const slug = String(k.request.queryString.slug || "").trim();
  if (!slug) {
    k.response.statusCode(400);
    return { success: false, code: "MISSING_SLUG", message: "缺少内容 slug。" };
  }

  const item = k.content.Article.find({ slug }, { includeOfflineData: true });
  if (!item) {
    k.response.statusCode(404);
    return { success: false, code: "NOT_FOUND", message: "内容不存在。" };
  }

  const article = toArticle(item);
  if (!article.online) {
    k.response.statusCode(404);
    return { success: false, code: "OFFLINE", message: "内容未发布。" };
  }

  return { success: true, data: article };
});
```

## Page：列表和详情联动

页面可以先做客户端渲染，后续再把首屏列表改成 SSR 或 View：

```html
<!-- @k-url /content-driven-pages -->
<button type="button" data-category="">全部</button>
<button type="button" data-category="operations">运营</button>
<button type="button" data-category="content">内容</button>
<input id="query" placeholder="搜索标题或摘要">
<section id="list"></section>
<aside id="detail"></aside>

<script>
  async function loadList(category = "") {
    const params = new URLSearchParams();
    if (category) params.set("category", category);

    const data = await fetch(`/api/content-pages/list?${params}`).then((r) => r.json());
    list.innerHTML = "";

    data.items.forEach((item) => {
      const card = document.createElement("article");
      card.textContent = item.title;
      card.addEventListener("click", () => loadDetail(item.slug));
      list.appendChild(card);
    });
  }

  async function loadDetail(slug) {
    const data = await fetch(`/api/content-pages/detail?slug=${encodeURIComponent(slug)}`).then((r) => r.json());
    detail.textContent = data.success ? data.data.body : data.message;
  }
</script>
```

真实公开内容站通常会把详情页做成可索引 URL，例如 `/articles/{slug}`，并在服务端渲染标题、摘要和正文。列表页、卡片和详情正文可以抽成 View，移动端列表、首页推荐位和分类页共用同一套片段。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 内容夹不存在 | 返回 `CONTENT_FOLDER_MISSING`，提示先完成 CMS 内容模型 |
| 缺少 slug | HTTP 400，返回 `MISSING_SLUG` |
| slug 不存在 | HTTP 404，返回 `NOT_FOUND` |
| 内容未发布 | HTTP 404，返回 `OFFLINE`，不要泄露草稿正文 |
| 分类为空 | 返回空列表，不抛 500 |
| 搜索无结果 | 返回 `total: 0` 和空数组 |
| 字段名变化 | API 统一映射输出字段，避免前台到处依赖 CMS 原字段 |
| SEO 详情页 | 用稳定 slug、canonical、alternate 和 sitemap 维护公开 URL |

## 相关

- [CMS：内容模块](/cms/content/)
- [CMS：数据类型](/cms/content/content-types)
- [CMS：内容列表](/cms/content/contents-folders-list)
- [k.content](/api/content/)
- [Page](/templateEngine/page/)
- [View](/templateEngine/view/)
