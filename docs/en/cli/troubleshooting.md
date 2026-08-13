# Troubleshooting

This page organizes common Kooboo CLI problems by symptoms visible in the terminal and the corresponding recovery actions.

## Missing site or credential configuration

Symptom: the command reports a missing `KOOBOO_SITE_URL`, `KOOBOO_USERNAME`, or `KOOBOO_PASSWORD`.

Confirm that the current directory is the CLI project and inspect `.env` in the project root:

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
```

Open a new terminal or run the command again so that the CLI reloads the project environment.

## Authentication fails

Confirm that:

- the site URL uses the correct protocol and domain;
- the account can log in to the site;
- the password contains no accidental quotes or spaces;
- the account has permission to operate on the target resources.

You can adjust the authentication retry limit for `kb new` and `kb clone` with:

```ini
KOOBOO_AUTH_MAX_RETRIES=3
```

Do not hide a wrong account or site URL by continually increasing the retry count.

## No resources match the target path

Symptom: `pull` or `push` reports that no resources match the target.

Check the local project:

```bash
find src content-file images mcp-tools -maxdepth 3 -type f 2>/dev/null
```

Target paths normally omit the leading `src/`:

```bash
kb push code/server
kb pull images/gallery
```

Confirm that resource folders, filenames, and letter case follow [Project resources and folders](./project/resources.md).

## A Page or API reports a missing URL

A Page file needs this at the top:

```html
<!-- @k-url /products -->
```

An API file needs:

```ts
// @k-url /api/products
```

Add the URL and push the specific file again instead of repeating a full push.

## Unsupported file extension

Confirm that the resource folder and extension match:

- Page, Layout, and View use `.html`;
- Script uses `.js`;
- Style uses `.css`;
- Job and MCP tools use `.ts`;
- API, CodeBlock, and PageScript use `.ts` or `.js`.

Do not only rename the extension. The content must also match the purpose of the resource.

## A file is skipped by `.pushignore`

Inspect `.pushignore` in the project root:

```bash
sed -n '1,200p' .pushignore
```

Rules are applied in order, and a later `!` rule can include a file again. After editing the rules, retry with a narrow target:

```bash
kb push path/to/resource
```

Remember that `.pushignore` does not affect `kb sync`.

## Pull overwrote local edits

Stop editing and do not pull again immediately. Inspect and recover through Git:

```bash
git status --short
git diff
git reflog
```

If the edits were not committed, staged, or backed up, Git may not be able to recover them completely. Before future pulls, create a commit or a protective stash.

## Sync changed the remote site unexpectedly

Press `Ctrl+C` immediately to stop synchronization, then:

1. inspect the site URL in `.env`;
2. use `git status` to identify recent local additions, changes, and deletions;
3. use `kb check` to compare local and remote resources;
4. restore resources from a site version, correct Git files, or a saved export;
5. do not restart synchronization until recovery is complete.

## Push or sync processes no changes

Confirm that no `kb pull` is running. If `kooboo-cli.lock` remains in the project root and you have confirmed that no pull process is active, remove it and retry:

```bash
rm kooboo-cli.lock
```

Then test with a specific resource path:

```bash
kb push code/server/order.ts
```

## Prune reports a different site

Do not add `--yes`. Check:

- `KOOBOO_SITE_URL` in the current `.env`;
- the site used when the comparison report was created;
- whether the report was copied from another environment.

Run `kb check --output <path>` again for the current site and generate a new cleanup preview from that report.

## Deploy reports a plan digest mismatch

The plan file changed after generation or its contents are damaged. Do not execute that file. Regenerate it from the original commit range:

```bash
kb deploy --from <from> --to <to> --dry-run \
  --write-plan .kooboo/deploy-plan.json
```

If the regenerated plan is still unexpected, inspect `from`, `to`, and `.pushignore` in the candidate commit.

## Deploy reports a site ID mismatch

The CLI logged in to a site that differs from the plan or `KOOBOO_SITE_ID`, so it stopped before writing. Check:

- `KOOBOO_SITE_URL` in the current project;
- whether `KOOBOO_SITE_ID` belongs to the same site;
- whether the plan was copied from another environment.

Do not remove the site ID merely to bypass the check. Confirm the target environment, then regenerate the plan from the correct artifact project and commit range.

## Deploy requires `--apply-deletes`

The plan contains Git deletions or an old path removed by a rename. Run a dry run and review the deletion items first, then execute:

```bash
kb deploy --plan .kooboo/deploy-plan.json --apply-deletes
```

If those deletions are not acceptable, correct the candidate artifact commit instead of making the CLI ignore them and continue uploading.

## A deploy receipt failed or the exit code is nonzero

Do not advance the successful deployment baseline. Open the JSON file specified by `--output` and inspect:

- `failed` and `skipped` items in `operations`;
- missing resources or hash mismatches in `verification.items`;
- the target site, commit range, and `planDigest`.

After fixing credentials, resource content, or the remote failure, retry the same `from → to` range. Resources that already succeeded are aligned again, and resources already deleted are recorded as `already_absent`.

## Related documentation

- [Before you start](./getting-started/preparation.md)
- [Pull remote resources](./workflows/pull.md)
- [Push local resources](./workflows/push.md)
- [Deploy Git artifacts](./workflows/deploy.md)
- [Continuous synchronization](./workflows/sync.md)
