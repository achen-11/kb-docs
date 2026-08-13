# Mail: Mail Extension Modules

> Add custom processing capabilities to Kooboo Mail. The administration interface creates, imports, installs, enables, disables, and configures modules; maintain module code in the editor and use the API documentation for script details.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Settings** -> **Mail Extension Modules** |
| Direct URL | `/_Admin/kmail-settings/mail-module` |
| Editor URL | `/_Admin/mail-module-editor?id={moduleId}` |
| Frontend routes | `/kmail-settings/mail-module` and `/mail-module-editor` |
| Required role | Organization administrator |

<DocImage src="/product/mail/mail-modules-overview.png" alt="Mail Extension Modules list" width="1120" />

## Module List

| Toolbar action | Details |
|----------------|---------|
| `Create` | Create an empty module. |
| `Import` | Import a ZIP package. |
| `Search` | Find and install a module from the module market. |

| Column or action | Details |
|------------------|---------|
| Name | Opens the module editor. |
| Online | Enables or disables the module. |
| Backend | Shows `Manage` when the module provides an administration page. |
| Settings | Builds a settings form from the module definition. |
| Description | Opens the module's `Readme.md`. |
| Export | Exports the module package. |
| Share | Shares the module. |
| Delete | Deletes selected modules. |

## Create, Import, or Install

| Action | Required input |
|--------|----------------|
| Create | Module name, 1-50 characters, beginning with a letter or number. |
| Import | Module name and ZIP file. |
| Search | Search term, then `Install` on a result. |

Import errors are displayed on the page. After a search result has been installed, its Install action is disabled.

## Settings and Documentation

The Settings action reads `module.config` from the module root.

| Configuration type | Control |
|--------------------|---------|
| `switch` | Toggle |
| `number` | Number input |
| `select` | Select input |
| `textarea` | Multiline input |
| Other | Text input |

The Description action renders `Readme.md` in a dialog. Module authors should document prerequisites, settings, and the entry point for any administration page.

## Module Editor

Select a module name to open the editor.

<DocImage src="/product/mail/mail-module-editor.png" alt="Mail Extension Module editor" width="1120" />

Resources are grouped by types returned by the backend, commonly root files, scripts, styles, views, administration pages, APIs, images, and other binary files. Text resources use Monaco; image and binary resources can be uploaded.

| Action | Details |
|--------|---------|
| New file | Select **+** on a group that supports text resources, then enter a file name. |
| Upload | Select a local file in an image or binary group. |
| Open | Select a file name to open a tab. |
| Save | Appears in the tab toolbar after the file changes. |
| Refresh | Reloads the current file. |
| Preview | Opens the preview URL for resources other than root files. |
| Leave warning | Kooboo asks for confirmation when tabs contain unsaved changes. |

## Backend Administration Page

If a module returns `backendViewUrl`, the list shows `Manage`. It opens the module's administration page in a dialog iframe. Use this page for module status, queues, logs, or business settings.

## Relationship to APIs

| Module administration | API or scripts |
|-----------------------|----------------|
| Create, import, install, enable, and disable modules. | Use [k.mail](/en/api/mail/) inside the module to process mail. |
| Configure values defined by `module.config`. | Read those values from module scripts. |
| Edit module files. | See [API](/en/api/) and [Template Engine](/en/templateEngine/) for KScript syntax and objects. |

## Related Documentation

| Document | Details |
|----------|---------|
| [k.mail](/en/api/mail/) | Mail API. |
| [k.module](/en/api/module/) | Module context. |
| [Compose](./compose.md#extension-drawer) | Module extension entry point on the Compose page. |
