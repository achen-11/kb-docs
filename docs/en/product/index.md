# Product Features

> Product areas commonly used outside an individual site's CMS: Console, Mail, Market, Developer Mode, and AI.

## Feature Map

| Feature | Entry point | Typical users |
|---------|-------------|---------------|
| [Console](./console.md) | **Console** in the top navigation; `/_Admin/kconsole` | Organization administrators, operations staff, and billing staff |
| [Mail](./mail.md) | **Mail** in the top navigation; `/_Admin/kmail` | Site operators, customer support, and implementation staff |
| [Market](./market.md) | **Market** in the top navigation; `/_Admin/templates` | Site creators and template maintainers |
| [Developer Mode](./developer-mode.md) | **Developer Mode** in the site header | Frontend and template developers |
| [AI Claw / AI Chat](./ai-chat.md) | **AI** in the site header | Site administrators, implementation staff, and developers |
| [AI Floating Assistant](./ai-floating-assistant.md) | Floating panel in the lower-right corner of a site administration page | Anyone currently working in the site administration interface |

## Account Level and Site Level

| Level | Typical features | URL pattern |
|-------|------------------|-------------|
| Account or organization | Console, Mail, Market, Organizations, Balance, Orders, and Renewals | Does not necessarily include `SiteId` |
| Site | Developer Mode, AI Chat, AI Floating Assistant, and site AI services | Usually includes `SiteId={SiteGUID}` |

For pages, content, integrations, cookies, and site AI services, return to the [CMS](/en/cms/). For KScript and templates, see [API](/en/api/) and [Template Engine](/en/templateEngine/).

## Recommended Reading Paths

| Goal | Read in this order |
|------|--------------------|
| Prepare the account, organization, balance, and domains | [Console](./console.md) -> [Organization](./console/organization.md) -> [Balance](./console/balance.md) -> [Domains](./console/domains.md) |
| Create a site from a template | [Market](./market.md) -> [Quick Start](/en/quick-start/) |
| Work with site resources | [Developer Mode](./developer-mode.md) -> [Template Engine](/en/templateEngine/) |
| Configure mail or send business notifications | [Mail](./mail.md) -> [k.mail](/en/api/mail/) |
| Use AI for site building or administration | [AI Configuration](./console/ai-config.md) -> [AI Claw / AI Chat](./ai-chat.md) -> [AI Floating Assistant](./ai-floating-assistant.md) -> [AI Service](/en/cms/settings/ai-service.md) |
