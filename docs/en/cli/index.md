# Kooboo CLI

Kooboo CLI is the local development tool for Kooboo. It stores site resources as local files and provides workflows for creating or cloning projects, pulling resources, pushing changes, Git artifact deployment, continuous synchronization, resource comparison, and site export.

The full command name is `kooboo-cli`. For daily use, you can use the shorter `kb` command:

```bash
kooboo-cli --help
kb --help
```

## Main capabilities

| Capability | Command | When to use it |
|------------|---------|----------------|
| Create a site project | `kb new` | Create a remote site and generate a local project |
| Clone an existing site | `kb clone` | Bring an existing Kooboo site into local maintenance |
| Pull resources | `kb pull` | Get the latest remote resources or refresh a specific scope |
| Push resources | `kb push` | Write local resources to the remote site |
| Deploy Git artifacts | `kb deploy` | Plan, execute, and verify a formal release by commit range |
| Continuous synchronization | `kb sync` | Watch local file changes and write them to the remote site |
| Compare resources | `kb check` | Compare local and remote resources |
| Clean remote resources | `kb prune` | Preview or delete resources that exist only remotely |
| Export a site | `kb export` | Select resources and download a site archive |

## Recommended learning path

1. Read [Before you start](./getting-started/preparation.md) and configure the target site and credentials.
2. [Create or clone a project](./getting-started/create-or-clone.md).
3. Learn the [project resources and folders](./project/resources.md).
4. Use [`kb pull`](./workflows/pull.md) to get remote changes.
5. Use [`kb push`](./workflows/push.md) to publish local changes.
6. Use [`kb deploy`](./workflows/deploy.md) for formal releases of immutable artifacts.
7. Use [`kb sync`](./workflows/sync.md) only when you need live remote integration.

## Understand the remote impact first

`kb pull` writes remote content into the local project. `kb push`, `kb deploy`, `kb sync`, and `kb prune` with `--yes` modify the remote site.

Before running these commands, confirm the current directory, the site URL in `.env`, and the resource scope you intend to operate on. In team projects, commit or otherwise protect local changes before a pull that may overwrite files.

## Related documentation

- [Before you start](./getting-started/preparation.md)
- [Create or clone a project](./getting-started/create-or-clone.md)
- [Troubleshooting](./troubleshooting.md)
