# Project resources and folders

Kooboo CLI identifies site resources from their local folders. Only supported resource folders and file types participate in pull, push, and synchronization.

## Site resource folders

| Local folder | Resource | Supported files |
|--------------|----------|-----------------|
| `src/api` | Backend API | `.ts`, `.js` |
| `src/code` | CodeBlock | `.ts`, `.js` |
| `src/pagescript` | PageScript | `.ts`, `.js` |
| `src/page` | Page | `.html` |
| `src/layout` | Layout | `.html` |
| `src/view` | View | `.html` |
| `src/js` | Frontend script | `.js` |
| `src/css` | Frontend style | `.css` |
| `src/job` | Scheduled job | `.ts` |
| `content-file` | Content file | Any extension |
| `images` | Media library file | Any extension |
| `mcp-tools` | MCP tool | Direct child `.ts` files |
| `src/module/<module-name>` | Module resources | Depends on the module subfolder |

`content-file`, `images`, and `mcp-tools` are in the project root. Other site resources are under `src`.

## Names and paths

Nested folders for APIs, CodeBlocks, PageScripts, Pages, Layouts, and Views become dot-separated names. For example:

```text
src/code/services/user.ts       → services.user
src/view/common/header.html     → common.header
src/page/account/profile.html   → account.profile
```

Jobs keep slash-separated hierarchy:

```text
src/job/order/sync.ts           → order/sync
```

Nested Script and Style folders also participate in the resource name:

```text
src/js/app/index.js             → app.index.js
src/css/app/index.css           → app.index.css
```

If a script or style needs a stable public address, declare its URL explicitly at the top of the file:

```js
// @k-url /assets/app.js
```

```css
/* @k-url /assets/app.css */
```

`src/js` and `src/css` are local classification folders and must not appear directly in public URLs referenced by pages.

## Page and API access paths

Page and API files need an access URL declaration. Without it, push or synchronization cannot save them as expected:

```html
<!-- @k-url /products -->
```

```ts
// @k-url /api/products
```

The URL declaration configures the resource and is not the same as the local file path. When moving a file, confirm that both its resource name and public URL still match your intent.

## Module resources

Module resources are stored under:

```text
src/module/<module-name>/
```

Common subfolders include `api`, `code`, `backend`, `view`, `js`, `css`, `root`, `img`, and `file`. When pushing or synchronizing a module, prefer the module or a module subfolder as the target scope to avoid changing unrelated site resources.

## Related documentation

- [Pull remote resources](../workflows/pull.md)
- [Push local resources](../workflows/push.md)
- [Continuous synchronization](../workflows/sync.md)
