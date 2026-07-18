# Pull remote resources

`kb pull` writes remote site resources into the current local project. It can pull all resources, a specific folder or file, or only refresh type definitions.

## Before you pull

Confirm that `.env` in the project root contains:

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
```

Pull can overwrite local files at matching paths. Commit, stash, or back up local changes you need to keep, and stop any `kb sync` process running for this project.

## Pull all resources

```bash
kb pull
```

This refreshes type definitions and pulls supported site resources, content files, images, MCP tools, and online modules.

## Refresh only type definitions

```bash
kb pull type
```

Use this when you only need updated local type assistance. It does not pull other site resources.

## Pull by path

Prefer paths to limit the scope:

```bash
kb pull code
kb pull code/server
kb pull code/server/order.ts
kb pull images/gallery
kb pull images/gallery/hero.png
kb pull content-file/assets
kb pull mcp-tools/weather.ts
kb pull module/shop
```

The leading `src/` is optional. For example, `kb pull src/code/server` and `kb pull code/server` target the same scope.

If the target path matches no remote resources, the CLI reports that no resources matched. It does not fall back to a full pull.

## Compatible resource-type syntax

The CLI still supports pulling by resource type and name:

```bash
kb pull api
kb pull api user.get
```

For new workflows, prefer paths because folders, files, and module scopes are clearer.

## Check after pulling

```bash
git status --short
git diff --stat
```

Confirm:

- which local files were overwritten or added;
- whether type definitions changed;
- whether the target path matched your intent;
- whether uncommitted local changes are still intact.

`kb pull` is not a Git merge tool. When you need to keep both local and remote edits, protect the local version first and merge the differences through Git.

## Related documentation

- [Project resources and folders](../project/resources.md)
- [Push local resources](./push.md)
- [Continuous synchronization](./sync.md)
