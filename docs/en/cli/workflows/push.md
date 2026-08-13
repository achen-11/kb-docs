# Push local resources

`kb push` writes local resources from the current project to the remote site configured in `.env`. It can push all resources, a folder or file, or only Git changes.

Use [`kb deploy`](./deploy.md) when you need an auditable release from the last successful version to a candidate version, explicit deletion approval, and a deployment receipt.

## Before you push

Confirm that:

- the current directory is the intended CLI project;
- `.env` points to the correct site;
- you reviewed the files that will be pushed;
- important sites have a recoverable version or backup.

## Push all resources

```bash
kb push
```

A full push processes existing supported resources in the project. It does not automatically delete a remote resource merely because the corresponding local file is gone. Use Git change mode when deletions and renames from Git must be synchronized.

## Push by path

```bash
kb push code
kb push code/server
kb push code/server/order.ts
kb push images/gallery
kb push images/gallery/hero.png
kb push mcp-tools/weather.ts
kb push module/shop
```

The leading `src/` is optional. Limiting the scope to a specific file or folder reduces the risk of updating unrelated resources.

If no local files match the target path, the CLI reports the missing match and does not fall back to a full push.

## Push Git changes

Push resource changes in the current worktree, including staged, unstaged, untracked, and deleted files:

```bash
kb push --git
```

Push only the Git index:

```bash
kb push --git --staged
```

Push only unstaged changes to tracked files:

```bash
kb push --git --unstaged
```

Push resource changes contained in a commit:

```bash
kb push --git --commit abc123
```

Git change mode processes resource deletions and renames. Deletion modifies the remote site, so review first:

```bash
git status --short
git diff --name-status
git diff --cached --name-status
```

A target path cannot be combined with `--git`. The `--staged`, `--unstaged`, and `--commit` selectors are also mutually exclusive.

## Use `.pushignore`

Create `.pushignore` in the project root to exclude files from `kb push`:

```text
src/temp/
*.log
!important/*.log
```

Rules are applied in order, so later rules can override earlier rules. `.pushignore` applies to both ordinary push and Git change push.

`.pushignore` does not control `kb sync`. Keep files that must not be synchronized outside watched resource folders, or stop synchronization before editing them.

## Control push speed

For large pushes, adjust concurrency and the delay between batches in `.env`:

```ini
KOOBOO_PUSH_CONCURRENCY=5
KOOBOO_PUSH_INTERVAL_MS=1000
```

| Variable | Default | Description |
|----------|---------|-------------|
| `KOOBOO_PUSH_CONCURRENCY` | `5` | Resources processed in parallel per batch |
| `KOOBOO_PUSH_INTERVAL_MS` | `100` | Milliseconds to wait after the previous batch finishes |

If the remote site rate-limits requests or reports repeated failures, reduce concurrency and increase the interval.

## Check after pushing

- Confirm that the terminal shows no resource save failures.
- Page and API files must contain a valid `@k-url`.
- Open the real site and verify the result.
- For important releases, use [`kb check`](./check-and-prune.md) to compare local and remote resources.

## Related documentation

- [Pull remote resources](./pull.md)
- [Continuous synchronization](./sync.md)
- [Deploy Git artifacts](./deploy.md)
- [Compare and clean remote resources](./check-and-prune.md)
