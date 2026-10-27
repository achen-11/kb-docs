# Build Your First Page

> Use the Pages feature in Admin to create an accessible URL.

## Open the Page List

| Item | Details |
|------|---------|
| Menu path | Site Admin -> Site -> Pages |
| Deep link | `/_Admin/site/pages?SiteId={site-guid}` |
| Detailed documentation | [CMS: Pages](/en/cms/site/pages.md) |

After selecting **New**, give the page a clear name and URL. For the first page, start with a simple path such as `/about`, `/news`, or `/contact`.

## Choose an Editing Method

| Method | Recommended use | Continue with |
|--------|-----------------|---------------|
| Inline editing | Quickly adjust visual content | [Inline Editing](/en/cms/site/pages-inline-edit.md) |
| Edit code | Maintain HTML, template bindings, and resource references directly | [Edit Code](/en/cms/site/pages-edit-code.md) |
| Development section | Edit pages, layouts, views, scripts, styles, and code from the site administration area | [Development](/en/cms/development/) |

## Understand Page Resources

A Kooboo page is normally composed of the following resources:

| Resource | Purpose | Documentation |
|----------|---------|---------------|
| Page | Defines the accessible URL and page content | [Page](/en/templateEngine/page/) |
| Layout | Reuses the page frame, navigation, and placeholders | [Layout](/en/templateEngine/layout/) |
| View | Reuses partial sections such as headers and list cards | [View](/en/templateEngine/view/) |
| Script / Style | Provides frontend behavior and styling | [Script](/en/templateEngine/js/) · [Style](/en/templateEngine/css/) |

## Verify the Page

1. Save the page.
2. Select Preview in the page list or copy the page URL.
3. Confirm that the browser can open it and that its title, navigation, and basic styling are correct.
4. If you need SEO fields, return to [Page Settings](/en/cms/site/pages-setting.md) or [Basic Settings: SEO](/en/cms/settings/basic/seo.md).

## Next Step

Continue to [Add Content](./add-content.md) so the page can read data maintained in Admin.
