# Console: AI Configuration

> Configure organization-level API keys for AI providers. A provider is normally configured here before its capabilities are enabled for a site.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Console** -> **AI Configuration** |
| Direct URL | `/_Admin/kconsole/consoleAIConfig` |
| Frontend route | `/kconsole/consoleAIConfig` |
| Required role | Organization administrator |

AI Configuration belongs to the organization, not to an individual site. It stores provider API keys that site-level AI services can use later.

<DocImage src="/product/console/ai-config-overview.png" alt="AI provider list in Console with API keys redacted" width="1120" />

## Page Structure

Each provider is displayed as a card:

| Area | Details |
|------|---------|
| Provider icon | Icon returned by the backend. |
| Display Name | Provider name shown in the interface. |
| Model tags | `Chat` for chat models and `Embedded` for embedding models. |
| `ApiKey` | Custom API key for the provider. |
| Save bar | Saves the keys for all providers shown on the page. |

In the online-service environment, a help icon beside `ApiKey` explains the behavior when the field is empty.

## Configure an API Key

1. Find the provider you want to use.
2. Enter its key in `ApiKey`.
3. Select Save at the bottom of the page.
4. The provider list reloads after the save completes.

Saving submits the provider name and `ApiKey` for every card on the page, even when only one provider was changed.

## Relationship to Site AI Services

| Console: AI Configuration | CMS: AI Service |
|---------------------------|-----------------|
| Stores organization-level provider keys. | Enables site-level AI features, MCP servers, and AI functions. |
| `/_Admin/kconsole/consoleAIConfig` | `/_Admin/system/ai-service?SiteId={GUID}` |
| Prepare a usable provider first. | Then select and enable capabilities for a site. |

If a model call fails from a site, check the balance first, then Console AI Configuration, and finally the site's AI Service settings.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Enable AI for the first time | [Balance](./balance.md) -> AI Configuration -> [CMS: AI Service](/en/cms/settings/ai-service.md) |
| Replace a provider key | AI Configuration -> update `ApiKey` -> save -> return to the site and test. |
| Use only Kooboo-provided capabilities | Review the page guidance and environment support before deciding whether a custom key is required. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Console Overview](../console.md) | Console navigation map. |
| [Balance](./balance.md) | Check the organization balance before using AI. |
| [CMS: AI Service](/en/cms/settings/ai-service.md) | Site-level AI services, MCP servers, and AI functions. |
| [AI Claw / AI Chat](../ai-chat.md) | Site-level AI workspace. |
