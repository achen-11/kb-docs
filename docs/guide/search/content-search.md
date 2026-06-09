# 内容搜索页

> 用服务端 API 统一处理关键词、分类、分页和发布状态过滤，前台页面只负责提交条件和渲染结果。

## 适用场景

这套做法适合内容量已经超过简单导航，但还不需要接入专门搜索引擎的站点：

- 文档站、新闻站、博客、帮助中心的关键词搜索；
- 内容列表按分类、标签、发布时间筛选；
- 活动、商品、案例等轻量搜索页；
- 需要确保草稿、下架、未审核内容不出现在前台结果里；
- 需要把分页、空结果和筛选条件做成稳定 API，方便前台复用。

不适合高流量全文检索、复杂分词、相关性排序、拼写纠错或跨站搜索。这类需求应使用专门搜索服务，Kooboo API 只做鉴权、条件组装和结果适配。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS 内容 | 维护内容类型、内容条目、发布状态和分类字段 | [内容](/cms/content/) |
| API | 读取查询参数，执行关键词、分类和分页过滤 | [k.api](/api/api/) |
| Request | 读取 `q`、`category`、`page`、`pageSize` 等查询参数 | [k.request](/api/request/) |
| KeyValue / 数据库 | 保存轻量索引或同步后的搜索数据 | [k.DB.keyValue](/api/key-value/) |
| Page | 提供搜索框、分类选择、分页按钮和结果列表 | [Page](/templateEngine/page/) |

## 推荐架构

搜索条件可以来自 URL、表单或前端状态，但最终过滤边界应在服务端：

```text
Page 搜索表单
   ↓
/api/content-search/search?q=&category=&page=&pageSize=
   ↓
服务端读取内容索引
   ↓
过滤 published
   ↓
关键词 / 分类 / 分页
   ↓
返回稳定结果结构
```

核心原则是前台不决定“哪些内容可见”。前台可以隐藏草稿入口，但 API 仍必须按发布状态过滤。

## CodeBlock：读取索引并执行过滤

示例用 KeyValue 保存一组轻量内容索引。真实项目可以把 `readIndex()` 替换成 `k.content`、SQLite 或外部搜索服务：

```ts
type ContentItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  path: string;
  published: boolean;
  updatedAt: string;
};

const indexKey = "guide-content-search:index";

export function readIndex() {
  const raw = k.DB.keyValue.get(indexKey);
  if (!raw) return [];
  const parsed = JSON.parse(raw.toString()) as ContentItem[];
  return parsed.filter((item) => item.id);
}
```

搜索函数先过滤已发布内容，再应用分类和关键词：

```ts
export function searchContent(options) {
  const q = String(options.q || "").trim().toLowerCase();
  const category = String(options.category || "").trim();
  const pageSize = Math.min(10, Math.max(1, Number(options.pageSize || 3)));
  const page = Math.max(1, Number(options.page || 1));

  let results = readIndex().filter((item) => item.published);

  if (category) {
    results = results.filter((item) => item.category === category);
  }

  if (q) {
    results = results.filter((item) => {
      const haystack = [
        item.title,
        item.summary,
        item.category,
        item.path,
        ...item.tags,
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    success: true,
    q,
    category,
    page: safePage,
    pageSize,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    items: results.slice(start, start + pageSize),
  };
}
```

`pageSize` 应设置上限，避免一次请求拉出过多数据。`page` 超过总页数时可以回落到最后一页，前台不用额外处理越界。

## API：固定查询参数和响应结构

API 负责把 URL 查询参数转换成服务端搜索选项：

```ts
// @k-url /api/content-search/{action}

import { searchContent, seedIndex, clearIndex } from "code/services/contentSearch";

function query(name: string) {
  return String(k.request.queryString.get(name) || "").trim();
}

k.api.get("search", () => {
  return searchContent({
    q: query("q"),
    category: query("category"),
    page: Number(query("page") || "1"),
    pageSize: Number(query("pageSize") || "3"),
  });
});
```

验证或后台初始化可以保留 `seed`、`index`、`categories`、`reset` 这类动作。真实线上站点中，`seed` 和 `reset` 不应暴露给普通访客。

## Page：搜索框、分类和分页

前台页面只调用 API，不直接读取存储：

```html
<!-- @k-url /content-search -->
<input id="q" type="search" placeholder="关键词">
<select id="category">
  <option value="">全部分类</option>
</select>
<button id="search" type="button">搜索</button>
<button id="next" type="button">下一页</button>
<tbody id="rows"></tbody>

<script>
  async function runSearch(page = 1) {
    const params = new URLSearchParams({
      q: document.querySelector("#q").value,
      category: document.querySelector("#category").value,
      page: String(page),
      pageSize: "3",
    });
    const response = await fetch(`/api/content-search/search?${params}`);
    const data = await response.json();
    renderRows(data.items);
  }
</script>
```

如果需要搜索结果 URL 可分享，应把条件同步到 `location.search`。如果只是后台运营工具或局部组件，保持前端状态也可以。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 索引为空 | 返回 `total: 0`、`items: []`，页面展示空结果 |
| 关键词无匹配 | 返回空结果，不当作错误 |
| 分类不存在 | 返回空结果，保留分类参数 |
| `page` 越界 | 回落到最后一页或返回空页，保持结构稳定 |
| `pageSize` 过大 | 服务端限制最大值 |
| 草稿或未审核内容 | 服务端先过滤 `published` |
| 内容很多 | 改用 SQLite、内容查询分页或外部搜索服务 |

搜索 API 的失败结构应区分“系统错误”和“没有结果”。没有结果是正常业务状态，不应返回 500。

## 相关

- [内容](/cms/content/)
- [k.request](/api/request/)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
- [Page](/templateEngine/page/)
