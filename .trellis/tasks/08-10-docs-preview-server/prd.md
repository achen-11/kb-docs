# Internal documentation preview server MVP

## Background

Content maintainers should not need to clone the repository, run VitePress locally,
locate Markdown files manually, or learn Kooboo CLI deployment commands merely to
review a documentation change.

The company has an available internal computer and an internal Kooboo test
environment at `kbdev.com`. The agreed direction is to validate the workflow
locally first, then migrate the same portable preview process to that computer.

## Approved architecture

The preview workflow has two distinct levels:

1. Per-change VitePress static previews for fast content, layout, image,
   navigation, and local-search review.
2. A serialized Kooboo candidate preview on the internal `kbdev.com` test site
   for Page routes, assets, Request Hook behavior, and deployment validation.

Production deployment remains a separate approval step.

## Local MVP scope

- Build the production VitePress output rather than expose a permanent dev server.
- Keep the last successful preview available while a new build is running.
- Publish a new release only after a complete successful build.
- Switch releases atomically.
- Rebuild automatically after relevant files under `docs/` change.
- Serve the preview on localhost by default and allow an explicit LAN binding.
- Expose a machine-readable build status endpoint.
- Keep generated releases and runtime state out of Git.
- Avoid hard-coded local paths, credentials, hostnames, and SSH assumptions.

## Out of scope for this MVP

- Git-provider web editing and merge-request integration.
- Per-branch hostnames and wildcard internal DNS.
- Self-hosted runner installation.
- SSH migration and service installation on the internal computer.
- Automatic deployment to the `kbdev.com` Kooboo test site.
- Production deployment changes.

## Acceptance criteria

1. `pnpm docs:preview:server` performs an initial production build and serves it.
2. Editing a watched documentation file schedules a new build without overlapping
   an already-running build.
3. A successful build publishes a new immutable release and atomically updates
   `.local-preview/current`.
4. A failed build does not replace the last successful release.
5. `/__preview/status` reports building, ready, degraded, or error state.
6. Clean documentation routes such as `/cms/` resolve to their generated
   `index.html` files.
7. Focused unit tests and a real local build/HTTP smoke test pass.

## Migration boundary

After the local MVP is accepted, migration should add operational packaging only:

- a dedicated unprivileged service account;
- systemd or an equivalent service supervisor;
- Nginx/Caddy or the built-in server behind an internal hostname;
- a self-hosted runner or outbound polling Preview Agent;
- release retention and disk monitoring;
- optional per-change worktrees and hostnames;
- a separate serialized Kooboo staging deployment.

The preview implementation itself must remain environment-neutral so it can be
transferred over SSH without rewriting repository paths or secrets.
