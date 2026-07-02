# k.utils.google

> Lighthouse 报告与 JSON 存取

## 概述

`k.utils.google` 封装 Lighthouse 相关远程调用与报告解析（非 Google OAuth API）。

## LHRJson() / LHRUrl()

对绝对 URL 生成 Lighthouse JSON 或在线报告链接；`mobileDevice` 控制移动/桌面模拟。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `absoluteUrl` | `string` | 是 | 要分析的绝对 URL |
| `mobileDevice` | `boolean` | 是 | 是否按移动设备策略分析 |

**返回：** `LHRJson()` 返回 Lighthouse JSON 字符串；`LHRUrl()` 返回可打开的报告 URL。

```ts
const json = k.utils.google.LHRJson("https://www.kooboo.com", false)
const report = k.utils.google.parseJson(json)
const summary = report.getSummary()

return {
    performance: summary.performance,
    accessibility: summary.accessibility,
    seo: summary.seo
}
```

如果只需要可打开的 Lighthouse 报告链接：

```ts
const reportUrl = k.utils.google.LHRUrl("https://www.kooboo.com", true)
return { reportUrl }
```

## parseJson() / saveJson() / getJson()

解析 Lighthouse JSON、保存到系统并凭 Id 取回。

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `parseJson(json)` | `string` | `FullLHRObj` | 解析 Lighthouse JSON |
| `saveJson(json)` | `string` | `Guid` | 保存 JSON 并返回 Id |
| `getJson(id)` | `Guid` | `string \| null` | 根据 Id 读取已保存 JSON |

```ts
const json = k.utils.google.LHRJson("https://www.kooboo.com", false)
const id = k.utils.google.saveJson(json)
const saved = k.utils.google.getJson(id)

return {
    id,
    saved: !!saved,
    summary: k.utils.google.parseJson(saved).getSummary()
}
```

## shortLhrReportUrl()

由 JSON 生成短报告 URL。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `json` | `string` | 是 | Lighthouse JSON 字符串 |

**返回：** `string`，站点内 Lighthouse 报告读取 URL。

```ts
const json = k.utils.google.LHRJson("https://www.kooboo.com", false)
const url = k.utils.google.shortLhrReportUrl(json)

return {
    url,
    fullUrl: k.site.info.makeAbsUrl(url)
}
```

## 相关文档

- [k.utils.ninjible](./ninjible.md) — 站点迁移与 Lighthouse 对比
