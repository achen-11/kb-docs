# 多语言站点

> 用统一的语言参数、服务端字典、内容 fallback 和前台切换入口，把页面文案、业务内容和 SPA 词典边界整理成一条可验证流程。

## 适用场景

这套做法适合企业官网、文档站、内容门户、电商前台和营销活动页。页面需要按中文、英文或其他语言展示导航、标题、按钮、内容摘要，同时还要在缺少译文时回退到默认语言，避免前台出现空白。

不适合把多语言当成简单的前端替换表。真实项目还要同时处理 URL 结构、SEO、内容发布状态、菜单、邮件模板、支付/订单文案和后台维护流程。也不建议让每个页面各自维护一份语言映射；语言代码、默认语言和 fallback 规则应集中管理。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS 多语言 | 启用站点语言、维护后台多语言内容 | [基础设置](/cms/settings/basic/) |
| Label | 维护服务端模板和 KScript 可复用短文案 | [k.site.labels](/api/label/) |
| SPA 多语言 | 给 Vue/React 等前端应用输出词典 JSON | [SPA 多语言](/api/spa-multilingual/) |
| API | 统一语言参数、输出字典和内容、处理 fallback | [k.api](/api/api/) |
| KeyValue / 内容表 | 保存轻量语言字典或业务内容示例 | [k.DB.keyValue](/api/key-value/) |
| Page | 提供语言切换入口并渲染当前语言内容 | [Page](/templateEngine/page/) |

## 推荐架构

先把语言策略收敛成一层业务入口：

```text
URL lang / culture / cookie
   ↓
normalizeLang()
   ↓
字典、内容、菜单、SEO 都使用同一个 lang
   ↓
缺失译文时 fallback 到 defaultLang
   ↓
Page / SPA / API 返回当前语言和 fallback 信息
```

语言代码要尽早归一化。例如业务统一使用 `zh` 和 `en`，就不要让同一条链路里同时出现 `zh-cn`、`zh-CN`、`cn`、`en-us` 等写法。若项目需要区域语言，应提前约定 `zh-cn`、`zh-tw`、`en-us` 这类完整代码，并在 CMS、多语言 URL、SPA 词典和内容字段里保持一致。

## API：统一语言和 fallback

下面示例用 KeyValue 保存最小字典和内容清单。真实项目可以把 `dictionary` 换成 Label、把 `articles` 换成 CMS 内容或 SQLite 表，但语言归一化和 fallback 逻辑应保持集中。

```ts
// @k-url /api/multilingual-site/{action}

type Lang = "zh" | "en";

const storeKey = "guide:multilingual-site";
const supportedLangs: Lang[] = ["zh", "en"];
const defaultLang: Lang = "zh";

function normalizeLang(value: unknown): Lang {
  const lang = String(value || "").toLowerCase();
  if (lang === "en" || lang === "en-us") return "en";
  return "zh";
}

function localize(value, lang: Lang) {
  const text = value[lang] || value[defaultLang] || "";
  return {
    text,
    fallback: !value[lang] && Boolean(value[defaultLang]),
  };
}
```

输出字典时，API 返回请求语言、实际语言、默认语言和发生 fallback 的 key：

```ts
k.api.get("dict", () => {
  const requestedLang = String(k.request.queryString.lang || "");
  const lang = normalizeLang(requestedLang);
  const state = readState();
  const result = {};
  const fallbackKeys = [];

  Object.keys(state.dictionary).forEach((key) => {
    const localized = localize(state.dictionary[key], lang);
    result[key] = localized.text;
    if (localized.fallback) fallbackKeys.push(key);
  });

  return {
    success: true,
    requestedLang,
    lang,
    defaultLang: state.defaultLang,
    supportedLangs: state.supportedLangs,
    fallback: requestedLang !== "" && requestedLang.toLowerCase() !== lang,
    fallbackKeys,
    dictionary: result,
  };
});
```

内容列表也要过滤未发布内容，并对每个条目标记是否使用了默认语言：

```ts
k.api.get("content", () => {
  const lang = normalizeLang(k.request.queryString.lang);
  const state = readState();
  const items = state.articles
    .filter((article) => article.published)
    .map((article) => {
      const title = localize(article.title, lang);
      const summary = localize(article.summary, lang);
      return {
        slug: article.slug,
        title: title.text,
        summary: summary.text,
        fallback: title.fallback || summary.fallback,
      };
    });

  return {
    success: true,
    lang,
    total: items.length,
    fallbackItems: items.filter((item) => item.fallback).map((item) => item.slug),
    items,
  };
});
```

这样页面能判断“当前显示的是英文内容，还是英文缺失后回退到中文内容”。这对运营验收、内容补齐和自动化测试都很重要。

## Label 与业务字典的分工

`k.label()` / `k.t()` 适合服务端模板文案和短 UI 文案，例如按钮、状态提示、错误消息。Label 依赖站点多语言配置和后台标签内容，通常由 CMS 后台维护。

脚本中可以用 `k.site.labels` 初始化或更新标签：

```ts
k.site.labels.add("hero.title", "多语言内容中心", "zh");
k.site.labels.add("hero.title", "Multilingual Content Hub", "en");
const title = k.site.labels.getValue("hero.title");
```

如果项目使用 Kooboo CLI，目前不要假设存在 `src/label` 这样的独立资源目录可直接同步标签。更稳妥的做法是：

| 文案类型 | 推荐来源 |
|----------|----------|
| 模板短文案 | CMS Label + `k.label()` / `k.t()` |
| API 返回给前台的业务字典 | API / CodeBlock 集中输出 |
| 内容标题、摘要、正文 | CMS 内容类型或业务表的多语言字段 |
| Vue/React SPA 文案 | CMS SPA 多语言 + `/_spa/lang/{lang}` |

## SPA 多语言的边界

SPA 多语言通过固定接口输出词典：

```http
GET /_spa/lang/{lang}
```

词条在后台 **开发 → SPA 多语言** 维护。当前没有 `k.spaMultilingual` 这类 KScript 管理 API，也不应在 CLI 示例里伪造一个资源目录。若页面是混合模式，推荐：

- SSR / Page 首屏文案使用 Label 或服务端字典；
- SPA 挂载后按当前语言请求 `/_spa/lang/en` 或 `/_spa/lang/zh-cn`；
- SPA 使用的语言代码和 Page URL 中的语言代码保持同一套约定；
- CMS 更新 SPA 词条后，前端允许短时间缓存延迟。

## Page：语言切换

页面只关心当前语言和 API 返回的数据，不自己硬编码 fallback 规则：

```html
<!-- @k-url /multilingual-site -->
<nav>
  <span data-i18n="nav.home">首页</span>
  <span data-i18n="nav.docs">文档</span>
</nav>

<button type="button" data-lang="zh">中文</button>
<button type="button" data-lang="en">English</button>

<h1 data-i18n="hero.title">多语言内容中心</h1>
<section id="articles"></section>
```

前端加载字典和内容：

```js
async function loadLanguage(lang) {
  const [dictResult, content] = await Promise.all([
    fetch(`/api/multilingual-site/dict?lang=${encodeURIComponent(lang)}`).then((r) => r.json()),
    fetch(`/api/multilingual-site/content?lang=${encodeURIComponent(lang)}`).then((r) => r.json()),
  ]);

  document.documentElement.lang = dictResult.lang;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = dictResult.dictionary[node.dataset.i18n] || node.dataset.i18n;
  });

  renderArticles(content.items);
}
```

真实项目中，切换语言时还应同步 URL、SEO alternate、菜单 URL、面包屑、表单错误文案和用户偏好 cookie。公开内容页建议让不同语言有可索引 URL，而不是只在浏览器里替换文本。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 请求语言不支持 | 回退默认语言，并返回 `requestedLang` 与实际 `lang` |
| 某个字段缺少译文 | 回退默认语言，同时记录 `fallbackItems` 或 `fallbackKeys` |
| 默认语言也缺失 | 返回 key 或空字符串，并在后台内容检查中标记 |
| 内容未发布 | API 层过滤，不进入前台列表和 sitemap |
| Label 未配置 | 后台先启用多语言并维护标签；API 示例可用业务字典兜底 |
| SPA 词典缺失 | 前端显示 key 或默认语言词典，并上报缺失 key |
| SEO 多语言 URL 不一致 | 在发布流程里统一生成 canonical 和 alternate |

## 相关

- [k.site.labels](/api/label/)
- [SPA 多语言](/api/spa-multilingual/)
- [k.api](/api/api/)
- [k.DB.keyValue](/api/key-value/)
- [Page](/templateEngine/page/)
