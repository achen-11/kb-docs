# Before you start

Before operating on a site, confirm that the CLI is available and configure the target site and credentials in the project root.

## Confirm the command is available

```bash
kb --help
kb --version
```

If the terminal cannot find `kb`, complete your team's CLI installation process before configuring the project.

## Configure the project environment

Create `.env` in the project root:

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
KOOBOO_SITE_ID=your-site-id
```

| Variable | Description |
|----------|-------------|
| `KOOBOO_SITE_URL` | The Kooboo site to connect to |
| `KOOBOO_USERNAME` | Login username |
| `KOOBOO_PASSWORD` | Login password |
| `KOOBOO_SITE_ID` | Optional; used by `kb deploy` to confirm the actual target site |

`pull` and `push` use the first three connection variables directly. `deploy`, `sync`, `check`, `prune`, and `export` can also accept temporary connection options; see the corresponding pages for details.

## Protect credentials

`.env` contains a username and password and must not be committed to Git. The project can keep an `.env.example` without real credentials:

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=YOUR_USERNAME
KOOBOO_PASSWORD=YOUR_PASSWORD
KOOBOO_SITE_ID=YOUR_SITE_ID
```

Check before committing:

```bash
git status --short
git check-ignore .env
```

## Pre-operation checklist

Before every remote operation, confirm that:

- the terminal is in the intended CLI project;
- `KOOBOO_SITE_URL` points to the correct site;
- uncommitted local changes are protected;
- the pull or push scope is correct;
- another terminal is not running `kb sync` for the same project.

## Next steps

- [Create or clone a project](./create-or-clone.md)
- [Project resources and folders](../project/resources.md)
- [Deploy Git artifacts](../workflows/deploy.md)
