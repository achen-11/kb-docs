# Write Your First KScript API

> Add a server-side endpoint to Kooboo so the frontend can retrieve JSON or execute business logic.

## Choose an Entry Point

| Entry | Recommended use | Documentation |
|-------|-----------------|---------------|
| API page | A standalone URL that returns JSON or handles a form | [CMS: Open APIs](/en/cms/development/openapis.md) · [k.api](/en/api/api/) |
| CodeBlock | Reuse the same logic from several pages or APIs | [CMS: Code](/en/cms/development/code.md) · [k.site.codes](/en/api/site/code.md) |
| Scheduled job | Periodic synchronization, cleanup, or notifications | [CMS: Jobs](/en/cms/development/jobs.md) · [k.site.runJob](/en/api/site/job.md) |

For your first attempt, start with an API page: enter a URL, save the script, and call it from the browser or a frontend `fetch` request.

## What a Minimal API Must Consider

| Item | Details |
|------|---------|
| Route | Give the API a stable URL such as `/api/news` |
| Input | Read query parameters, body, headers, or files from [k.request](/en/api/request/) |
| Business data | Retrieve data with [k.content](/en/api/content/), [k.DB](/en/api/database/), or an external service |
| Output | Return JSON, a redirect, or a status code with [k.response](/en/api/response/) |
| Permissions | Read [k.session](/en/api/session/) or account APIs when authentication is required |
| Logging | Write important failure paths to [k.logger](/en/api/logger/) |

## Coordinate with Admin Configuration

| Goal | Configure first |
|------|-----------------|
| Read a content list | [Content Types](/en/cms/content/content-types.md) and [Content Folders](/en/cms/content/contents-folders-list.md) |
| Send email | [Mailbox](/en/product/mail.md) and [k.mail](/en/api/mail/) |
| Start a payment | [Payment Integration](/en/cms/settings/integrations/payment.md) and [k.payment](/en/api/payment/) |
| Call an external service | [Open APIs](/en/cms/development/openapis.md) or [k.net.httpClient](/en/api/net/httpclient.md) |
| Store business data | [Database](/en/cms/database/) and [k.DB](/en/api/database/) |

## Debugging Recommendations

1. Return a fixed value first to confirm that the route is accessible.
2. Connect the real data query next.
3. Return an explicit status code and JSON body for each error path.
4. Finally, call the API from the page and inspect the browser Network panel.
