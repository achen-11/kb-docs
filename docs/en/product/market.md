# Market

> Choose a starting point from the template market, inspect template details, or manage templates that you have shared.

## How to Open It

| Item | Details |
|------|---------|
| Top navigation | Select **Market** in the top navigation. |
| Template list | `/_Admin/templates` |
| Template details | `/_Admin/template/detail?templateId={TemplateId}` |
| My Shared Templates | `/_Admin/template/my-shared` |
| Scope | Account-level page; the URL normally does not include `SiteId`. |

Market helps you choose a useful starting point before creating a site. Using a template creates a normal Kooboo site; maintain its pages, content, styles, and scripts in the site CMS afterward.

<DocImage src="/product/market/templates-overview.png" alt="Template Market with search, category, theme, and color filters" width="1120" />

## Template List

The toolbar contains these controls:

| Control | Details |
|---------|---------|
| **Template Name** | Searches automatically as you type. The frontend removes spaces before submitting the query. |
| Type | Filters by a template type returned by the template-type API. |
| **Theme** | Available for All or Site templates. Supports multiple selections and displays the active filters above the list. |
| **Color** | Available for All or Site templates. Supports multiple selections and refreshes the list. |
| **My Shared Templates** | Opens the templates shared by the current account. |

Templates are displayed as cards with a cover, name, and download count. Select a card to open its details. Active theme and color filters appear above the list; remove one filter from its tag or select **Clear All** to reset them.

If no template matches, clear some filters or try a shorter search term.

## View a Template and Create a Site

Select a template card to open its details. This page provides both the preview and the create-site form.

<DocImage src="/product/market/template-detail.png" alt="Template details with the site name, domain selection, create action, and preview" width="1120" />

| Area | What to enter or review |
|------|-------------------------|
| Back | Returns to the template list and preserves the `currentFolder` query parameter when Market was opened from a site folder. |
| **Site Name** | Required administration name for the new site. Length: 1-50 characters. It must follow the simple-name rules and must not duplicate an existing site. |
| **Domain** | Required subdomain prefix for the new site. Length: 1-63 characters. It must be a valid subdomain and must not duplicate an existing binding. |
| Root domain | Select an available root domain. The interface may display `-root` or `.root` forms depending on the domain. |
| **Create** | Validates the form and creates the site from the template. If Market was opened from a site folder, the new site is returned to that folder. |

The preview area may display screenshots or an online preview in an iframe. Online previews can switch between desktop, tablet, and mobile sizes. The metadata below the preview includes the author, category, size, downloads, last modified time, and counts for layouts, menus, pages, views, images, and content.

After creation, Kooboo returns to the site list. Select **Manage** on the new site to open `/_Admin/site?SiteId={SiteGUID}` and continue editing its pages, content, and settings.

## My Shared Templates

Select **My Shared Templates** from the template list to manage templates shared by the current account.

<DocImage src="/product/market/my-shared.png" alt="My Shared Templates list with preview and sharing actions" width="1120" />

| Action | Details |
|--------|---------|
| **Share** | Open the Share Template dialog and add a template. |
| Preview | Select the eye icon on a template card to open its preview URL. |
| **Edit** | Change the name, price, cover, and screenshots. You can also add Chinese-market content. |
| **Update** | Replace the template package from an existing Kooboo site or an uploaded ZIP file. |
| More -> **Delete** | Delete a shared template after confirmation. |

An empty list means that the current account has not shared a template. Select **Share** to add one, or switch to the appropriate account.

## Share a Template

The dialog supports two workflows. Select **Share** on My Shared Templates to add a new template, or select **Update** on a template card to replace its package.

<DocImage src="/product/market/share-template-dialog.png" alt="Share Template dialog with template name, source, site or ZIP file, cover, and screenshots" width="1120" />

When sharing a new template, configure:

| Field | Details |
|-------|---------|
| **Template Name** | Required name displayed in Market. |
| **Category** | Select a template type. |
| **Price** | Displayed in `CNY`; enter `0` for a free template. |
| **Source** | Select an existing Kooboo site or upload a ZIP file. |
| **Site** | Required when the source is a Kooboo site. Kooboo uses the site cover as the initial cover and screenshot. |
| **File** | Upload a `.zip` package when the source is ZIP. |
| **Cover / Screenshots** | Keep the generated images or replace them from the image controls. |
| **Add Chinese** | Add a Chinese name, cover, and screenshots for the Chinese Market. |

When updating a package, the dialog changes to **Update Template Package** and only replaces the content source. Use **Edit** to maintain the name, price, cover, and screenshots.

## Edit Template Information

Select **Edit** on a template card to maintain the information displayed in Market.

| Field | Details |
|-------|---------|
| **Template Name** | Required name displayed in the list and details page. |
| **Price** | Template price displayed in `CNY`. |
| **Cover** | Thumbnail used on the template card. |
| **Screenshot** | Long-form image that may be displayed on the details page. |
| **Add Chinese** | Add a Chinese name, cover, and screenshots. The Chinese name is required when this option is enabled. |

## When to Use Market

| Scenario | Recommendation |
|----------|----------------|
| Evaluate Kooboo quickly | Create a site from a template, then follow [Quick Start](/en/quick-start/). |
| Reuse an industry page structure | Choose the closest template, then update pages, content, styles, and scripts in the site CMS. |
| Build a reusable team template | Clean the site, prepare representative content, covers, and screenshots, then share it. |
| Update a published template | Use **Update** to replace the package and **Edit** to change how it is presented. |

## Market vs. CMS

| Market | CMS |
|--------|-----|
| Select and preview templates, then create a site. | Maintain the new site's pages, content, menus, styles, and scripts. |
| Share a site or ZIP package as a template. | Clean test data and organize pages and media before sharing. |
| Maintain template covers, screenshots, prices, and localized presentation. | Continue maintaining the site's business functionality. |

## Common Workflows

| Goal | Workflow |
|------|----------|
| Create a site from a template | Market -> search or filter -> open a template -> enter the site name, subdomain, and root domain -> **Create**. |
| Share an existing site | Clean test content in the CMS -> Market -> **My Shared Templates** -> **Share** -> select the site -> review the cover and screenshots -> **Share**. |
| Replace a template package | **My Shared Templates** -> **Update** -> select a site or upload a ZIP file -> confirm. |
| Improve a template listing | **My Shared Templates** -> **Edit** -> update the name, price, cover, screenshots, and localized content. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Create Your First Site](/en/quick-start/create-first-site.md) | Start from a template, blank site, import, or clone. |
| [CMS: Pages](/en/cms/site/pages.md) | Maintain pages after creating the site. |
| [CMS: Development](/en/cms/development/) | Maintain Layouts, Views, Scripts, Styles, Code, and other resources. |
| [Template Engine](/en/templateEngine/) | Understand how template resources are organized. |
