# Console

> The Console is Kooboo's account- and organization-level workspace. Use it to manage domains, organizations, data centers, AI providers, membership, and billing before returning to a specific site's CMS.

## How to Open It

| Item | Details |
|------|---------|
| Top navigation | Select **Console** in the top navigation. |
| Direct URL | `/_Admin/kconsole` |
| Legacy URL | `/_Admin/Console` |
| Frontend route | `/kconsole` |
| Scope | Account or organization; the URL normally does not include `SiteId`. |

The Console is not a menu inside one site. It handles shared concerns such as domain ownership, organization administrators, available balance, and organization-level AI provider credentials.

<DocImage src="/product/console/console-overview.png" alt="Console overview with the domain list and Console navigation" width="1120" />

::: tip Menu visibility

| Role | Visible menus |
|------|---------------|
| All organization members | Domains and Organization |
| Organization administrators | Data Centers, Google SC, Membership, AI Configuration, Orders, Balance, and Renewals |

The frontend still defines routes such as `bandwidth`, `cdn`, `resourceCDN`, and `topupBandwidth`, but the default navigation does not expose them directly. Availability depends on the current environment.

:::

## Menus

| Menu | Direct URL | Documentation | Main use |
|------|------------|---------------|----------|
| Domains | `/_Admin/kconsole` | [Domains](./console/domains.md) | Add or purchase domains, bind sites, manage DNS, renew domains, and obtain transfer codes. |
| Organization | `/_Admin/kconsole/organization` | [Organization](./console/organization.md) | Manage members and departments, create organizations, and switch organizations. |
| Data Centers | `/_Admin/kconsole/serviceDataCenter` | [Data Centers](./console/data-centers.md) | Enable or disable data centers, choose the default, and open a data center. |
| Google SC | `/_Admin/kconsole/searchConsole` | [Google SC](./console/google-search-console.md) | Authorize Search Console, verify sites, inspect Analytics data, and submit sitemaps. |
| Membership | `/_Admin/kconsole/member` | [Membership](./console/membership.md) | Review the current plan and purchase or renew membership. |
| AI Configuration | `/_Admin/kconsole/consoleAIConfig` | [AI Configuration](./console/ai-config.md) | Configure organization-level AI provider API keys. |
| Orders | `/_Admin/kconsole/consoleOrder` | [Orders](./console/orders.md) | Review orders and continue payment for unpaid orders. |
| Balance | `/_Admin/kconsole/balance` | [Balance](./console/balance.md) | Review the current balance, add funds, and inspect transactions. |
| Renewals | `/_Admin/kconsole/renew` | [Renewals](./console/renewals.md) | Review domain and membership renewals in one place. |

## Pages Without a Navigation Item

| Page | Direct URL | Opened from | Documentation |
|------|------------|-------------|---------------|
| Domain Binding | `/_Admin/kconsole/DomainBinding?id={domainId}` | Select a domain name in the Domains list. | [Domains](./console/domains.md#bind-a-site) |
| DNS Records | `/_Admin/kconsole/domainDNS?domainName=example.com` | Select the DNS action for a domain. | [Domains](./console/domains.md#dns-records) |
| Domain Search | `/_Admin/kconsole/domainSearch` | Select **Purchase a Domain** on the Domains page. | [Domains](./console/domains.md#purchase-a-domain) |
| Departments | `/_Admin/kconsole/departments` | Select **Departments** on the Organization page. | [Organization](./console/organization.md#departments) |
| Checkout | `/_Admin/kconsole/checkOrder?orderId={orderId}` | A purchase, top-up, renewal, or order-payment workflow. | [Orders](./console/orders.md#checkout) |

## Recommended Configuration Order

| Scenario | Recommended order |
|----------|-------------------|
| Set up a new organization | [Organization](./console/organization.md) -> [Balance](./console/balance.md) -> [Domains](./console/domains.md) |
| Purchase and bind a domain | [Purchase a Domain](./console/domains.md#purchase-a-domain) -> [Bind a Site](./console/domains.md#bind-a-site) -> [CMS: Domain Management](/en/cms/settings/domains.md) |
| Configure Google Search Console | [Google SC](./console/google-search-console.md) -> authorize the account -> verify the site -> review Analytics or submit a sitemap |
| Enable AI for a site | [Balance](./console/balance.md) -> [AI Configuration](./console/ai-config.md) -> [CMS: AI Service](/en/cms/settings/ai-service.md) |
| Handle unpaid or expiring services | [Orders](./console/orders.md) -> [Checkout](./console/orders.md#checkout) -> [Renewals](./console/renewals.md) |

## Console vs. Site Administration

| Console | Site administration |
|---------|---------------------|
| Manage account domains, DNS, purchases, and renewals. | Bind domains to one site, select its primary domain, and configure SSL. |
| Manage organization members, departments, and organization switching. | Manage users, roles, and permissions for one site. |
| Manage organization-level AI provider credentials. | Manage AI services, MCP servers, and AI functions for one site. |
| Review balance, orders, membership, and renewals. | Configure site content, pages, hooks, cookies, and service integrations. |

For site-level configuration, return to the [CMS](/en/cms/). For KScript signatures and examples, see [API](/en/api/) and [Template Engine](/en/templateEngine/).

## Related Documentation

| Document | Details |
|----------|---------|
| [Balance](./console/balance.md) | Current balance, top-up entry points, and recent transactions. |
| [Orders](./console/orders.md) | Order history, unpaid orders, and checkout. |
| [Renewals](./console/renewals.md) | Domain and membership renewal items. |
| [CMS: Domain Management](/en/cms/settings/domains.md) | Domain bindings and access URLs for one site. |
| [CMS: AI Service](/en/cms/settings/ai-service.md) | Site-level AI services, MCP servers, and AI functions. |
| [CMS: Site Users](/en/cms/settings/site-users.md) | User accounts for one site. |
| [CMS: Role Permissions](/en/cms/settings/roles.md) | Feature permissions inside one site. |
