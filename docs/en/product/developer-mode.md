# Developer Mode

> A VS Code-style workspace inside the site administration interface for opening, editing, searching, and debugging multiple site resources.

## How to Open It

| Item | Details |
|------|---------|
| Top navigation | Open a site, then select the **Developer Mode** icon in the top navigation. |
| Direct URL | `/_Admin/dev-mode?SiteId={SiteGUID}` |
| Open a specific panel | `/_Admin/dev-mode?SiteId={SiteGUID}&activity={PanelName}` |
| Frontend route | `/dev-mode` |
| Scope | Site-level page; `SiteId` is required. |

Developer Mode is designed for editing several related site resources in one workspace. It complements the CMS Development pages: the CMS is better for structured forms, lists, creation, deletion, and bulk management, while Developer Mode is better for moving between Pages, Layouts, Views, Scripts, Styles, and Code during implementation.

<DocImage src="/product/developer-mode/developer-mode-overview.png" alt="Developer Mode with the activity bar, resource tree, and editing workspace" width="1120" />

## Permissions and Visible Panels

Developer Mode displays panels according to the current user's site permissions. A panel is hidden when the user does not have its required permission.

| Panel | Permission | Main use |
|-------|------------|----------|
| Pages | `pages` | Open normal, rich-text, and designer pages. |
| Views | `view` | Edit View components. |
| Layouts | `layout` | Edit Layout resources. |
| Styles | `style` | Edit inline styles, external styles, and style groups. |
| Scripts | `script` | Edit inline scripts, external scripts, and script groups. |
| Code | `code` | Edit APIs, CodeBlocks, PageScripts, and other code resources. |
| Menus | `menu` | Browse and open menu resources. |
| Forms | `form` | Edit form resources. |
| Search | `code` | Search across the source of site resources. |
| Debug | `code · debug` | Open supported code resources in the debugger. |
| Modules | `module` | Browse module resources or return from module editing to the standard Developer Mode workspace. |
| Settings | `site · edit` | Open Site Settings as a workspace tab from the gear icon. |

If a user can see only part of the workspace, check the role permissions before investigating the route URL.

## Workspace Structure

Developer Mode has three main areas:

| Area | How to use it |
|------|---------------|
| Activity bar | Select an icon to switch between Pages, Views, Layouts, Styles, Scripts, Code, Search, Debug, and other available panels. |
| Resource panel | Browse the file tree or list for the selected resource type. Use the search field to filter resources by name. |
| Tabs and editor | Select a resource to open it in a tab, then edit, save, refresh, or preview it. |

The resource panel header commonly includes these actions:

| Action | Details |
|--------|---------|
| Refresh | Reload the resources in the current panel. |
| More | Open the corresponding CMS Development list, such as the Pages, Layouts, or Scripts page. |

The gear icon at the bottom opens Site Settings in a tab. This is convenient for a quick site-level change; use [CMS: Site Settings](/en/cms/settings/) for the complete settings interface.

## Open, Edit, and Save Resources

Select a file in the resource panel to open it in the editor. Selecting the same resource again returns to the existing tab instead of creating a duplicate.

<DocImage src="/product/developer-mode/opened-resource.png" alt="An open resource in Developer Mode with a tab and code editor" width="1120" />

| Action | Details |
|--------|---------|
| Open a resource | Select its name in the resource panel. |
| Switch tabs | Select a tab at the top of the editor. Scroll horizontally when many tabs are open. |
| Reorder tabs | Drag a tab to a new position. |
| Save | Select the save action for the tab or use the configured save shortcut. |
| Refresh | Reload the current resource. Kooboo asks for confirmation when unsaved changes exist. |
| Preview | Supported resources, including Pages, Views, Layouts, Scripts, Styles, and APIs, show a preview action. |
| Close | Select the close icon on a tab. Kooboo asks for confirmation when the resource has unsaved changes. |

A dot on a tab means that the resource has changed but has not been saved. Kooboo also asks for confirmation before leaving Developer Mode, switching sites, or closing multiple tabs when unsaved changes exist.

## Tab Context Menu

Right-click a tab to open the tab management menu.

| Action | Details |
|--------|---------|
| Add Code Reference | Add the current editor content to AI Chat as a code reference, when the resource supports it. |
| Close | Close the current tab. |
| Close to the Right | Close every tab to the right of the current tab. |
| Close Others | Keep only the current tab open. |
| Close Saved | Close tabs that do not contain unsaved changes. |
| Close All | Close all tabs. Kooboo asks for confirmation when unsaved changes exist. |

**Add Code Reference** gives the AI assistant the current resource as context. It does not modify the resource automatically.

## Search

Developer Mode provides two different search tools.

<DocImage src="/product/developer-mode/code-search.png" alt="Developer Mode global code search with keyword, case-sensitive, regular-expression, and result controls" width="1120" />

| Search | Entry point | Best for |
|--------|-------------|----------|
| Resource-name filter | Press `Ctrl + F` in a resource panel, or select its search field. | Quickly narrowing a long list of resources of the current type. |
| Global code search | Select **Search** in the activity bar. | Finding text in Pages, Layouts, Views, Scripts, Styles, Code, and other resource sources. |

The global code search panel contains three primary controls:

| Control | Details |
|---------|---------|
| Keyword | Searches automatically as you type. |
| `Aa` | Enables or disables case-sensitive matching. |
| `.*` | Enables or disables regular-expression search. An invalid expression is not submitted. |

Results are grouped by resource and show matching lines. Select a resource name to open it at the beginning, or select a matching line to open the resource at that line.

## Debug

The Debug panel is visible only to users with the `code · debug` permission. It groups supported resources by Code type and opens the selected resource in a debug tab.

<DocImage src="/product/developer-mode/debug-panel.png" alt="Developer Mode debug panel with debuggable resources and a debug tab" width="1120" />

| Area | Details |
|------|---------|
| Debug resource list | Groups resources by Code type, such as API, CodeBlock, and PageScript. |
| Debug tab | Opens the current debug session and provides refresh and preview actions. |
| Console input | While the debug session is active, enter an expression and press Enter to run it. |
| Result | Displays the returned value as text or a JSON tree. |

This page covers the user interface. For writing debuggable code and using context variables, see [API](/en/api/) and [Template Engine](/en/templateEngine/).

## Common Workflows

| Goal | Workflow |
|------|----------|
| Update a page and its layout together | Open **Pages** -> open the page -> open **Layouts** -> open the layout -> switch between the tabs and save each resource. |
| Modify external CSS or JavaScript | Open **Styles** or **Scripts** -> select the external resource -> edit -> save -> preview. |
| Find where code is defined | Open **Search** -> enter a keyword -> enable `Aa` or `.*` when needed -> select a matching line. |
| Debug an API or CodeBlock | Open **Debug** -> select the code resource -> use the debug tab and console as needed. |
| Ask AI about the current file | Open the resource -> right-click its tab -> **Add Code Reference** -> continue in AI Chat. |

## Developer Mode vs. CMS Development

| CMS Development pages | Developer Mode |
|-----------------------|----------------|
| Best for creating, deleting, bulk-managing, and reviewing structured lists. | Best for editing several related resources continuously. |
| Each resource type has its own page and form. | Pages, Views, Layouts, Scripts, Styles, and Code share one workspace. |
| Documentation is organized by individual menus, fields, and forms. | This page documents the unified development workspace. |
| Suited to configuration through structured forms. | Suited to implementation and investigation through file context. |

## Before You Leave

Before leaving Developer Mode, check that:

1. No required tab still shows an unsaved-change dot.
2. Every resource you intend to keep has been saved.
3. The preview has been refreshed and verified.
4. Before switching sites, the current site's tabs have been saved or closed.

If tabs are still open, Kooboo warns that leaving the current site's Developer Mode will close them.

## Related Documentation

| Document | Details |
|----------|---------|
| [CMS: Development](/en/cms/development/) | List and form interfaces for site resources. |
| [CMS: Pages](/en/cms/site/pages.md) | Create, edit, and configure pages. |
| [Template Engine](/en/templateEngine/) | How Page, Layout, View, Script, and Style resources run. |
| [API](/en/api/) | KScript APIs, CodeBlocks, and other development references. |
| [AI Claw / AI Chat](./ai-chat.md) | AI workspace that can use Developer Mode resources as context. |
