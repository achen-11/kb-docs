# Compare and clean remote resources

`kb check` compares the local project with the remote site. `kb prune` uses the comparison result to find resources that exist only remotely and deletes them after explicit confirmation.

Always run `check` first, confirm the target site and difference list, and only then consider `prune`.

## Compare resources

```bash
kb check
```

Limit the scope:

```bash
kb check js
kb check page/admin
kb check images/banner.png
kb check module/shop
```

The report separates in-sync, local-only, remote-only, modified, ignored, and failed resources and suggests whether a push or cleanup is appropriate.

## Comparison levels

```bash
kb check --level 1
kb check --level 2
kb check --level 3
```

| Level | Compared data | When to use it |
|-------|---------------|----------------|
| `1` | Resource inventory | Quickly find local-only or remote-only resources |
| `2` | Inventory and metadata | Check resource names, paths, URLs, and related information |
| `3` | Inventory, metadata, and content | Confirm whether same-name resources have identical content before release |

Higher levels read and compare more data. Use level 1 for quick daily checks and level 3 for important releases.

## Output formats and report files

```bash
kb check --format table
kb check --format json
kb check --format silent
kb check --level 3 --output .kooboo/check-report.json
```

| Option | Description |
|--------|-------------|
| `--format table` | Show a readable terminal summary; this is the default |
| `--format json` | Print the full JSON report in the terminal |
| `--format silent` | Do not print the comparison table |
| `--output <path>` | Write the full report to a file |

Local files matched by `.pushignore` are marked as ignored in the report.

## Preview remote cleanup

```bash
kb prune
```

Without `--yes`, `kb prune` only generates a cleanup plan and does not delete remote resources. Limit the scope:

```bash
kb prune js
kb prune module/shop
```

Use a saved comparison report:

```bash
kb check --level 3 --output .kooboo/check-report.json
kb prune --report .kooboo/check-report.json
```

When using a report, confirm that the site in the report matches the currently connected site.

## Execute deletion

After confirming the preview:

```bash
kb prune --report .kooboo/check-report.json --yes
```

Or compare and delete a specific scope directly:

```bash
kb prune js --yes
```

Protected resources such as the start page are skipped by default. Add this only when you explicitly need to delete protected resources:

```bash
kb prune --report .kooboo/check-report.json --yes --force
```

`--force` expands the deletable scope. Save a site version or export a backup and inspect every cleanup item before executing it.

## Temporarily specify connection details

`check` and `prune` support:

```bash
kb check \
  --site-url https://example.com \
  --username your-username \
  --password your-password
```

For daily use, prefer a project `.env` that fixes the target site and reduces the risk of a report/site mismatch.

## Recommended workflow

```bash
git status --short
kb check --level 3 --output .kooboo/check-report.json
kb prune --report .kooboo/check-report.json
# Review the cleanup plan manually
kb prune --report .kooboo/check-report.json --yes
kb check --level 3
```

## Related documentation

- [Push local resources](./push.md)
- [Export a site](./export.md)
- [Troubleshooting](../troubleshooting.md)
