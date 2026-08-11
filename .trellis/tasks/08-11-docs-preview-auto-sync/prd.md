# Phase 1: Git-backed automatic documentation preview updates

## Goal

After a reviewed commit reaches the configured remote branch, the internal host must pull it and publish a new VitePress release to `http://192.168.10.75:4173/` without requiring SSH or a manual CLI deployment.

## In scope

- Persist the approved multi-phase editing and preview roadmap.
- Add a Git synchronization command for an existing checkout.
- Reject dirty, ahead, or diverged server worktrees.
- Allow fast-forward updates only.
- Serialize Git updates and VitePress publishing across processes.
- Retry a commit whose previous build failed by advancing the published marker only after health succeeds.
- Render optional systemd service and timer units for active polling.
- Keep Git sync opt-in during installation.
- Verify all behavior locally with temporary Git repositories before applying it to `kooboo-kbdev`.

## Out of scope

- Committing or pushing the current dirty local repository.
- Replacing the current remote preview checkout before a safe Git baseline exists.
- VitePress edit links.
- The web editing platform.
- Per-user worktrees and preview hosts.
- Kooboo candidate or production deployment.

## Safety rules

1. Never use `git reset --hard` to synchronize the server checkout.
2. Never update a dirty checkout automatically.
3. Never overwrite a local-only or diverged server commit.
4. Never run two Git/build/update processes concurrently.
5. Never mark a commit as published before build and health checks succeed.
6. A failed update must leave the previous preview release available.
7. Git credentials remain server-side and must not be written to generated public files or logs.

## Acceptance criteria

- No-op when remote branch and published commit already match.
- Fast-forward and publish when the remote branch advances.
- Retry when the checkout is at the target commit but the published marker is missing or stale.
- Refuse dirty and non-fast-forward worktrees with a non-zero result and actionable error.
- Concurrent invocations are serialized by a shared lock.
- Dependency installation is run for a new or retried commit using the frozen lockfile.
- Generated systemd timer configuration is validated by focused tests.
- Existing preview service remains active and Kooboo.Web remains untouched.

## Current status — 2026-08-11

- Git fast-forward synchronization, retry semantics, shared update locking, and optional systemd polling are implemented.
- CNB does not expose repository-level SSH Deploy Keys for this repository. A repository deployment token was created with only `repo-code` read access; Release and registry permissions remain disabled.
- The service account successfully executed `git ls-remote` against `https://cnb.cool/kooboo.com/kooboo/team/kooboo-doc.git` and resolved `main` to `dc5f634267b427c77d1e9f53e5a23dd5a8578725`.
- HTTPS credentials are stored under `/etc/kb-docs-preview/` and consumed through `GIT_ASKPASS`; the token is not stored in the repository, rendered config, systemd unit, or command arguments.
- Focused Git/lock tests pass 6/6, deployment-render tests pass 2/2, and preview tests pass 5/5. Shell syntax, rendered placeholders, Git whitespace, and systemd unit verification pass.
- The server uses the clean checkout `/opt/kb-docs-git` on `codex/docs-preview-phase1`; the original non-Git `/opt/kb-docs` deployment remains available for rollback.
- `kb-docs-preview.service` and `kb-docs-preview-sync.timer` are enabled and active. The timer polls CNB every 30 seconds.
- End-to-end commit `18c23fe` was automatically fetched, fast-forwarded, built, health-checked, and published as release `20260811T043851Z-18c23fe-7`. The marker `preview-sync-e2e-20260811-1237` was verified through the LAN URL while the previous release remained available during the build.
- The temporary verification page is removed by the completion commit; its disappearance is verified after the final automatic rebuild.
