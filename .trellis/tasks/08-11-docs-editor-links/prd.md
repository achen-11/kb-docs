# Phase 2: VitePress edit links and read-only editor platform

## Goal

An authorized content maintainer can click an edit link on the internal VitePress preview, authenticate to a separate editor service, and open the exact Markdown source file in a read-only workspace with current preview build status.

## In scope

- Enable VitePress edit links only when `DOCS_EDITOR_BASE_URL` is present.
- Build edit URLs from VitePress `PageData.filePath`.
- Add a Vue 3 editor interface on a separate port.
- Require a server-side shared authentication token and HttpOnly session cookie.
- Allow reads only from existing `docs/**/*.md` files.
- Reject absolute paths, traversal, non-Markdown files, hidden path segments, and symlink escapes.
- Show document content, SHA-256 hash, size, modification time, and Phase 1 preview status.
- Add systemd-ready editor deployment templates without modifying Kooboo.Web or ports 80/443.

## Out of scope

- Saving or writing Markdown.
- Draft workspaces and conflict detection.
- Git commits, branches, pushes, or review requests from the browser.
- Image upload or asset management.
- Kooboo candidate or production deployment.
- Multiple users, roles, SSO, or per-user worktrees.

## Safety rules

1. Public builds must not render internal editor links by default.
2. The browser never receives Git, CNB, SSH, Kooboo, or filesystem credentials.
3. Authentication secrets are loaded from a root-owned file, not committed or placed in systemd command arguments.
4. Document paths are validated again by the server; edit-link input is never trusted.
5. The editor service has no write API in Phase 2.
6. The editor service runs independently from the 4173 preview service.

## Acceptance criteria

- A build without `DOCS_EDITOR_BASE_URL` contains no editor URL.
- A build with the variable contains a correctly encoded link for Chinese and English pages.
- Unauthenticated document requests return 401.
- Valid login creates an HttpOnly, SameSite=Strict session.
- `docs/**/*.md` reads succeed and return content metadata.
- traversal, absolute, non-Markdown, hidden, and symlink-escape paths fail.
- Preview status is visible from the editor.
- The editor UI clearly states that Phase 2 is read-only.
- Focused Node tests and the editor production build pass.
