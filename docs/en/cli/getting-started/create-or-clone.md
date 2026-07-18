# Create or clone a project

Use `kb new` to create a remote site and a local project. Use `kb clone` to bring an existing site into a local project.

## Create a site project

```bash
kb new my-site
```

To specify a Kooboo server:

```bash
kb new my-site --host https://example.com
```

During the command, the CLI asks for missing credentials, the site name, and a project template. After creation, the local directory contains project files and environment configuration for the target site.

`kb new` creates a remote site. Confirm the server address and site name before continuing so that you do not create a site in the wrong environment.

## Clone an existing site

```bash
kb clone https://example.com
```

Specify a local directory:

```bash
kb clone https://example.com my-site
```

Specify a project template:

```bash
kb clone https://example.com my-site --template vitest
```

When you do not specify a template, the CLI interactively asks for the target directory, project capabilities, and package manager, then clones onto an empty project base. After cloning, supported site resources and type definitions are written into the local project.

## Initialize the local project

Enter the created or cloned directory and install dependencies:

```bash
cd my-site
pnpm install
```

Then inspect `.env`:

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
```

Do not commit an `.env` file that contains real credentials.

## Create versus clone

| Method | Remote result | Local result |
|--------|---------------|--------------|
| `kb new` | Creates a new site | Generates a project from the selected template |
| `kb clone` | Does not create a site | Pulls an existing site's resources into a project |

After cloning an existing site, run `git status` and create an initial commit before editing. Before the first publication of a new project, understand the remote impact of [`kb push`](../workflows/push.md) and [`kb sync --init`](../workflows/sync.md).

## Related documentation

- [Project resources and folders](../project/resources.md)
- [Pull remote resources](../workflows/pull.md)
- [Push local resources](../workflows/push.md)
