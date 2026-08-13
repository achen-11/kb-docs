# Deploy Git artifacts

`kb deploy` publishes Kooboo resource artifacts that have already been committed to Git. It compares the last successfully deployed commit with the candidate commit, builds a complete plan, performs uploads, deletions, and remote verification in one CLI process, and produces a deployment receipt.

Unlike `kb push --git --commit`, `kb deploy` is designed for formal releases. It processes an explicit commit range, requires separate approval for deletions, and returns a nonzero exit code when any write or verification fails.

## Prerequisites

The current directory must be a Git project containing the final Kooboo resources, and the candidate artifact must already be committed. Deployment does not read uncommitted worktree content.

Configure the project root:

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
KOOBOO_SITE_ID=your-site-id
```

`KOOBOO_SITE_ID` is optional, but recommended for formal releases. After login, the CLI compares it with the actual site ID and performs no remote writes if they differ.

## Select the deployment range

Prepare two Git commits:

- `from`: the artifact commit from the last successful deployment receipt;
- `to`: the candidate artifact commit for this release.

They do not need to be parent and child. The CLI resolves both values to full immutable commit IDs and calculates additions, modifications, deletions, and renames across the complete `from → to` range.

## Build and review the plan first

```bash
kb deploy \
  --from <last-successful-commit> \
  --to <candidate-commit> \
  --dry-run \
  --write-plan .kooboo/deploy-plan.json
```

A dry run does not log in or write to the remote site. Its output lists:

- resources to create or update;
- resources to delete;
- files skipped because they are not Kooboo resources or match `.pushignore`;
- a digest used to detect changes to the plan contents.

Resource content comes from the candidate commit, not the current worktree. The `.pushignore` in the candidate commit determines which Git changes are skipped.

## Execute the deployment

When the plan contains no deletions:

```bash
kb deploy \
  --from <last-successful-commit> \
  --to <candidate-commit> \
  --output .kooboo/deploy-receipt.json
```

When the plan contains deletions, approve them explicitly after review:

```bash
kb deploy \
  --from <last-successful-commit> \
  --to <candidate-commit> \
  --apply-deletes \
  --output .kooboo/deploy-receipt.json
```

Without `--apply-deletes`, any deletion in the plan stops the entire deployment before login and remote writes. The CLI does not upload the remaining resources separately.

## Execute a saved plan

```bash
kb deploy \
  --plan .kooboo/deploy-plan.json \
  --apply-deletes \
  --output .kooboo/deploy-receipt.json
```

`--plan` cannot be combined with `--from` or `--to`. Before writing remotely, the CLI checks the plan digest, Git commits, change coverage, and candidate snapshot content. An expired plan, missing change, or content mismatch stops execution.

## Execution order and failure rules

The CLI executes these stages:

1. upload supporting resources such as Script, Style, Content File, Images, API, and View;
2. upload Page resources;
3. perform approved deletions.

If a stage fails, later stages are skipped. This prevents Pages from referencing supporting resources that were not uploaded successfully and prevents old resources from being deleted after an upload failure.

You can retry the same `from → to` range. If a resource in the deletion plan is already missing remotely, the result is recorded as `already_absent` instead of failing the recovery attempt.

## Post-deployment verification

By default, the CLI reloads remote resources after all writes:

- it compares persisted content hashes for created and updated resources;
- it confirms that deleted resources no longer exist remotely.

A verification failure is written to the receipt and causes a nonzero exit code. You can skip this step with `--no-verify`, but the receipt explicitly marks verification as disabled. In that mode, the CLI can only show that the write requests did not report failures; it cannot prove that remote content matches the artifact.

## Plan and receipt output

```bash
# Print the plan as JSON
kb deploy --from <from> --to <to> --dry-run --format json

# Suppress terminal body output and write only the receipt file
kb deploy --from <from> --to <to> --format silent \
  --output .kooboo/deploy-receipt.json
```

`--format` supports `table`, `json`, and `silent`. `--write-plan` writes a deployment plan, while `--output` writes an execution receipt or failure payload. They serve different purposes.

A successful receipt includes the target site, commit range, plan digest, per-resource execution results, and verification results. Record `to` as the new successful deployment baseline only when `success` is `true` and the process exit code is `0`.

## Common options

| Option | Purpose |
|--------|---------|
| `--from <commit>` | Artifact commit from the last successful deployment |
| `--to <commit>` | Candidate artifact commit for this release |
| `--plan <path>` | Execute a saved deployment plan |
| `--write-plan <path>` | Write the validated plan to a JSON file |
| `--dry-run` | Build a plan without login or remote writes |
| `--apply-deletes` | Approve deletion operations in the plan |
| `--no-verify` | Skip remote verification after writes |
| `--format <format>` | Terminal output format: `table`, `json`, or `silent` |
| `--output <path>` | Write the receipt or failure payload to a JSON file |
| `--site-id <siteId>` | Require a matching target site ID |
| `--site-url <url>` | Temporarily specify the site URL |
| `--username <username>` | Temporarily specify the username |
| `--password <password>` | Temporarily specify the password |

## Related documentation

- [Before you start](../getting-started/preparation.md)
- [Push local resources](./push.md)
- [Compare and clean remote resources](./check-and-prune.md)
- [Troubleshooting](../troubleshooting.md)
