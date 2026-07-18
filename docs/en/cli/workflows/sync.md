# Continuous synchronization

`kb sync` continuously watches site resources in the current project. When a file is added, modified, or deleted, the CLI writes the corresponding change to the remote site.

## Start synchronization

```bash
kb sync
```

If the project's `package.json` maps `dev` to `kb sync`, you can also run:

```bash
pnpm dev
```

After it starts, the process keeps running. Leave the terminal open and press `Ctrl+C` to stop watching.

## Initial synchronization

```bash
kb sync --init
```

Ordinary `kb sync` processes changes made after the watcher starts. `--init` also processes files that already exist in resource folders, so it can modify many remote resources at once.

Before initial synchronization, run:

```bash
git status --short
kb check
```

Confirm that the local project should be the resource source for the target site before running `kb sync --init`.

## Temporarily specify connection details

```bash
kb sync \
  --site-url https://example.com \
  --username your-username \
  --password your-password
```

Command options affect only this synchronization session. For daily development, prefer the project `.env` to reduce the risk of connecting to the wrong site.

## Synchronize shared module files

To mirror a common folder into every module in the project, specify:

```bash
kb sync --common-module-path ../common-module
```

Adds, changes, and deletions in the common folder are mirrored to matching module locations and continue through the normal resource workflow to the remote site. Use this only when the modules should share the same files.

## Remote impact

The synchronization process handles:

- added files: creates or updates remote resources;
- changed files: overwrites corresponding remote resources;
- deleted files: deletes corresponding remote resources;
- Pages and APIs: require a valid `@k-url`;
- unsupported extensions: are not saved as the corresponding resource type.

Stopping `kb sync` only stops future watching. It does not undo changes already written to the remote site.

## Difference from `.pushignore`

`.pushignore` affects only `kb push`. `kb sync` does not read `.pushignore`.

If some files must not be synchronized:

- keep them outside CLI-watched resource folders;
- stop `kb sync` before editing temporary files;
- use a separate source or build folder and copy only final artifacts into resource folders.

## Recommendations

- Do not keep `kb sync` running during purely local editing.
- Start it only when you need live remote integration.
- Do not run multiple synchronization processes for the same project.
- Stop synchronization before changing `.env` to another site.
- Commit Git before large renames or deletions so that you can review and recover them.

## Related documentation

- [Project resources and folders](../project/resources.md)
- [Push local resources](./push.md)
- [Compare and clean remote resources](./check-and-prune.md)
