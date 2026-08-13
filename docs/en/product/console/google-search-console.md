# Console: Google SC

> Connect Google Search Console, authorize the account, verify sites, inspect Analytics data, and submit sitemaps.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Console** -> **Google SC** |
| Direct URL | `/_Admin/kconsole/searchConsole` |
| Frontend route | `/kconsole/searchConsole` |
| Required role | Organization administrator |

Google SC is an organization-level page. It checks whether the current account has authorized Google and then shows either a login prompt or the site list.

<DocImage src="/product/console/google-search-console-overview.png" alt="Google Search Console site list in Console" width="1120" />

## Authorization

Before authorization, the page asks you to authenticate before accessing Google Search Console data.

```text
Complete authentication before accessing Google Search Console data.
```

Select `Login` to open the authorization URL returned by the backend. The callback uses the current page URL. After authorization, return to Google SC to view the sites.

## Site List

| Column | Details |
|--------|---------|
| Site | Search Console site URL. |
| Permission | Permission level, such as `siteOwner` or `siteUnverifiedUser`. |
| Actions | Unverified sites show `Validation`; verified sites show `Analytics` and `Sitemap`. |

The Add Site action is commented out in the current frontend, so the normal interface manages sites returned by Search Console. If another environment exposes an add action, follow that interface.

## Validate a Site

When the permission is `siteUnverifiedUser`, select `Validation`. Kooboo calls the validation endpoint and reloads the site list. A successful validation changes the site to the verified state and exposes `Analytics` and `Sitemap`.

## Analytics

Select `Analytics` on a verified site.

| Filter | Details |
|--------|---------|
| Aggregation | `Auto`, `By Page`, or `By Property`. |
| Date range | Defaults to the previous 30 days. |
| `Search` | Reloads data with the selected filters. |

| Result column | Details |
|---------------|---------|
| Clicks | Number of clicks. |
| CTR | Click-through rate. |
| Impressions | Number of impressions. |
| Keys | Key values returned by Search Console. |

## Sitemap

Select `Sitemap` on a verified site. The `Submit` dropdown lists feeds for the site that have not yet been submitted. Selecting one submits the sitemap and reloads the list.

| Column | Details |
|--------|---------|
| Path | Sitemap path. |
| Last Submitted | Most recent submission time. |
| Last Downloaded | Most recent Google download time. |
| Error | Error count. |
| Warning | Warning count. |

Select existing sitemap rows to delete them. Kooboo asks for confirmation first.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Connect Search Console | Google SC -> Login -> complete authorization -> return to the site list. |
| Verify a site | Site list -> Validation -> reload and confirm the new permission. |
| Submit a sitemap | Sitemap -> Submit -> select a feed -> review Error and Warning. |
| Review search performance | Analytics -> select aggregation and date range -> Search. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Console Overview](../console.md) | Console navigation map. |
| [Domains](./domains.md) | Search Console normally depends on a domain already connected to the account. |
| [CMS: SEO Settings](/en/cms/settings/basic/seo.md) | Site-level SEO settings. |
