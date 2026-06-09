# Sitemap / SEO 自动化

> 用业务页面清单生成 sitemap XML，并把发布状态、`lastmod`、多语言 alternate 和页面 SEO 更新纳入同一条可验证流程。

## 适用场景

这套做法适合站点页面由内容、商品、文档、活动或业务配置动态产生的场景：

- 内容站需要按发布状态输出 sitemap；
- 文档站、商品站、活动页需要自动更新 `lastmod`；
- 多语言站点需要在 sitemap 中输出不同语言 URL；
- SEO 需要和后台页面设置、业务发布流程、定时任务或内容审核流联动；
- 需要把 `/sitemap.xml` 作为公开 URL 给搜索引擎抓取。

不适合把 sitemap 当成权限控制或内容发布状态的唯一来源。未发布、需登录、临时预览、支付后可见的页面都应先在业务数据层过滤，sitemap 只输出可被公开索引的 URL。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS SEO | 维护站点和页面层面的标题、描述、索引策略 | [SEO 设置](/cms/settings/basic/seo) |
| Page | 提供公开 `/sitemap.xml` 路由，设置 XML 响应头 | [Page](/templateEngine/page/) |
| API | 提供 seed、entries、xml、touch、reset 等验证和业务入口 | [k.api](/api/api/) |
| KeyValue | 保存轻量页面清单或同步状态 | [k.DB.keyValue](/api/key-value/) |
| Sitemap 工具 | 链式生成 sitemap XML | [k.utils.sitemap](/api/utils/sitemap) |

## 推荐架构

真实项目里，sitemap 生成不要散落在多个页面里。建议先把“哪些页面应该公开索引”收敛成业务页面清单：

```text
CMS 内容 / 商品 / 文档 / 活动配置
   ↓
发布流程或定时任务整理页面清单
   ↓
KeyValue / SQLite / 内容表保存 path、lastmod、priority、语言 URL
   ↓
/api/sitemap/xml 供调试和内部检查
   ↓
/sitemap.xml 输出公开 XML
```

页面清单至少应包含：

| 字段 | 用途 |
|------|------|
| `path` | 站内路径，统一归一化为 `/xxx` |
| `published` | 是否允许进入公开 sitemap |
| `lastmod` | 内容最后更新时间，发布、编辑、审核通过时更新 |
| `changefreq` | 搜索引擎参考值，例如 `daily`、`weekly`、`monthly` |
| `priority` | 0 到 1 的相对优先级 |
| `alternates` | 多语言路径映射，例如 `{ en: "/en/docs", zh: "/zh/docs" }` |

小站点可以用 KeyValue 保存 JSON 清单。页面数量多、需要分页查询、按类型筛选或需要审计时，应换成 SQLite 或内容表。

## CodeBlock：读取清单并生成 XML

示例用 `k.DB.keyValue` 保存页面清单，用 `k.utils.sitemap.create().append().build()` 生成 XML：

```ts
const sitemapKey = "guide-seo:sitemap-entries";

function normalizePath(path: string) {
  const value = String(path || "").trim();
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
}

function siteOrigin() {
  return `https://${k.request.host}`;
}

export function readEntries() {
  const raw = k.DB.keyValue.get(sitemapKey);
  if (!raw) return [];
  return JSON.parse(raw.toString());
}
```

生成 XML 时只保留已发布页面，并把多语言 alternate 转成绝对 URL：

```ts
export function buildSitemapXml() {
  const origin = siteOrigin();
  const entries = readEntries().filter((entry) => entry.published);
  let builder = k.utils.sitemap.create();

  entries.forEach((entry) => {
    const alternates: Record<string, string> = {};
    Object.keys(entry.alternates || {}).forEach((lang) => {
      alternates[lang] = `${origin}${normalizePath(entry.alternates[lang])}`;
    });

    builder = builder.append(`${origin}${normalizePath(entry.path)}`, {
      lastmod: entry.lastmod,
      changefreq: entry.changefreq,
      priority: entry.priority,
      alternates,
    });
  });

  return {
    count: entries.length,
    entries,
    xml: builder.build(),
  };
}
```

`priority` 应在服务端限制到 0 到 1 之间。`path` 应统一补 `/`，避免同一页面在不同流程里写成 `docs` 和 `/docs` 两种值。

## API：调试清单、生成 XML、更新 lastmod

API 适合给后台操作、定时任务或验证页面使用。下面示例提供四类动作：

```ts
// @k-url /api/sitemap/{action}

import {
  buildSitemapXml,
  clearEntries,
  readEntries,
  seedEntries,
  touchEntry,
} from "code/services/sitemap";

k.api.get("entries", () => {
  const entries = readEntries();
  return {
    success: true,
    total: entries.length,
    published: entries.filter((entry) => entry.published).length,
    entries,
  };
});

k.api.get("xml", () => {
  const result = buildSitemapXml();
  return { success: true, count: result.count, xml: result.xml };
});
```

更新 `lastmod` 时，要区分“缺少 path”和“页面不存在”：

```ts
k.api.post("touch", () => {
  const path = String(JSON.parse(k.request.body || "{}").path || "").trim();
  if (!path) {
    return { success: false, code: "MISSING_PATH", message: "缺少页面路径。" };
  }

  const entry = touchEntry(path);
  if (!entry) {
    return { success: false, code: "NOT_FOUND", message: "页面不存在。" };
  }

  return {
    success: true,
    entry,
    sitemap: buildSitemapXml(),
  };
});
```

真实项目可以把 `touch` 接到内容发布、商品上架、页面编辑保存、定时同步或审核通过事件。不要让前台访客随意修改 sitemap 清单。

## Page：公开 `/sitemap.xml`

公开 sitemap 要走 Page 路由，并设置 XML Content-Type：

```html
<!-- @k-url /sitemap.xml -->
<script env="server">
  const sitemapKey = "guide-seo:sitemap-entries";
  const raw = k.DB.keyValue.get(sitemapKey);
  const entries = raw ? JSON.parse(raw.toString()).filter((entry) => entry.published !== false) : [];
  const origin = `https://${k.request.host}`;
  let builder = k.utils.sitemap.create();

  function normalizePath(path) {
    const value = String(path || "").trim();
    if (!value) return "/";
    return value.startsWith("/") ? value : `/${value}`;
  }

  entries.forEach((entry) => {
    builder = builder.append(`${origin}${normalizePath(entry.path)}`, {
      lastmod: entry.lastmod,
      changefreq: entry.changefreq,
      priority: entry.priority,
    });
  });

  k.response.setHeader("Content-Type", "application/xml; charset=utf-8");
  k.response.write(builder.build());
</script>
```

验证时发现，API / CodeBlock 可以复用 service，但 Page 的 `<script env="server">` 不应默认使用 TypeScript `import` 语法导入 CodeBlock。公开 XML 页面建议把很薄的一层生成逻辑内联，或先确认当前运行环境支持的模块写法后再抽象。

## 与 CMS SEO 的边界

[SEO 设置](/cms/settings/basic/seo) 负责站点级、页面级的标题、描述、robots、索引配置等后台维护项。Sitemap 自动化负责把“已发布且允许索引的 URL 清单”输出给搜索引擎。

| 能力 | 放在哪里 | 注意 |
|------|----------|------|
| 页面标题、描述、Open Graph | CMS SEO 或页面渲染逻辑 | 不要只写进 sitemap |
| 是否允许索引 | CMS SEO / 业务发布状态 | sitemap 生成时必须过滤 |
| `lastmod` | 内容更新时间、商品更新时间、发布事件 | 不应每次请求都无意义更新 |
| 多语言 URL | 内容多语言、语言路由或站点配置 | sitemap 输出 absolute URL |
| sitemap 公开入口 | Page `/sitemap.xml` | 设置 `application/xml` |

如果页面有 `noindex`、草稿、下架、会员可见等状态，sitemap 生成逻辑必须先排除它们。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 页面清单为空 | 输出空 `urlset`，不要抛 500 |
| JSON 清单损坏 | 回退空数组，并记录日志或后台修复 |
| 未发布页面 | 过滤，不进入 XML |
| 缺少 `path` | API 返回 `MISSING_PATH` |
| 更新不存在页面 | API 返回 `NOT_FOUND` |
| 多语言路径缺少 `/` | 服务端统一归一化 |
| `priority` 越界 | 服务端限制到 0 到 1 |
| 页面数量很大 | 改用 SQLite/内容表分页生成，必要时拆分 sitemap index |

## 相关

- [SEO 设置](/cms/settings/basic/seo)
- [k.utils.sitemap](/api/utils/sitemap)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
- [Page](/templateEngine/page/)
