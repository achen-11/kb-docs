# k.utils.google

> Lighthouse reporting and JSON access

## Overview

`k.utils.google` encapsulates Lighthouse related remote calls and report parsing (non-Google OAuth API).

## LHRJson() / LHRUrl()

Generate Lighthouse JSON or online report links to absolute URLs; `mobileDevice` controls mobile/desktop emulation.

| Parameter | Type | Required | Description |
|------|------|------|------|
| `absoluteUrl` | `string` | Yes | Absolute URL to analyze |
| `mobileDevice` | `boolean` | Yes | Whether to analyze with the mobile device strategy |

**Returns:** `LHRJson()` returns a Lighthouse JSON string; `LHRUrl()` returns an openable report URL.

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

If you only need an openable Lighthouse report link:

```ts
const reportUrl = k.utils.google.LHRUrl("https://www.kooboo.com", true)
return { reportUrl }
```

## parseJson() / saveJson() / getJson()

Parse Lighthouse JSON, save to system and retrieve by Id.

| Method | Parameter | Return | Description |
|------|------|------|------|
| `parseJson(json)` | `string` | `FullLHRObj` | Parse Lighthouse JSON |
| `saveJson(json)` | `string` | `Guid` | Save JSON and return its Id |
| `getJson(id)` | `Guid` | `string \| null` | Read saved JSON by Id |

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

Generate short report URL from JSON.

| Parameter | Type | Required | Description |
|------|------|------|------|
| `json` | `string` | Yes | Lighthouse JSON string |

**Returns:** `string`, a site-local Lighthouse report URL.

```ts
const json = k.utils.google.LHRJson("https://www.kooboo.com", false)
const url = k.utils.google.shortLhrReportUrl(json)

return {
    url,
    fullUrl: k.site.info.makeAbsUrl(url)
}
```

## Related Docs

- [k.utils.ninjible](./ninjible.md) — Site migration vs. Lighthouse
