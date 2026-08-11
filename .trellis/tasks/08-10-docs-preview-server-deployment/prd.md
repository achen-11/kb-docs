# Package internal docs preview for SSH deployment

## Goal

Turn the locally verified VitePress preview MVP into a portable server package
that can be copied to an internal computer over SSH without embedding host
credentials or production Kooboo access in the repository.

## Assumption

The first operational template targets a Linux host with systemd and Nginx.
The Node.js publisher, server, persisted status, and health check remain portable.
If the final host is Windows or macOS, only the service-manager and reverse-proxy
templates need replacement.

## Scope

- Split one-shot build/publish from the long-running HTTP server.
- Persist preview state so publishers, health checks, and servers share truth.
- Add a strict health check for the status endpoint and preview root.
- Render environment, systemd, and Nginx configuration from validated inputs.
- Add a dry-run-by-default Linux installer and an unprivileged update command.
- Document initial SSH transfer, installation, update, health check, and rollback.
- Simulate the server filesystem and runtime locally before any SSH operation.

## Safety requirements

- No hostname, username, password, private key, or server IP is committed.
- Installation performs no privileged writes unless `--apply` is explicit.
- Production Kooboo credentials and deployment remain out of scope.
- Failed publication preserves the last successful `current` release.
- Server updates do not require a restart for content-only changes.
- Service templates use a dedicated non-root account and write only to preview data.

## Acceptance criteria

1. `pnpm docs:preview:publish` builds and atomically publishes, then exits.
2. `pnpm docs:preview:serve` serves an existing release without rebuilding it.
3. External publishing updates the status seen by the running server.
4. `pnpm docs:preview:health` validates both status and root page.
5. Configuration rendering rejects unsafe names, hosts, ports, and paths.
6. The installer defaults to dry-run and produces reviewable files.
7. A temporary local server layout passes publish, serve, health, update, and
   configuration-rendering checks.
