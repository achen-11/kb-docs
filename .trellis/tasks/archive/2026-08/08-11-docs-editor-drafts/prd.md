# Phase 3: shared draft saving and automatic preview

## Goal

An authenticated content maintainer can edit Markdown source, save a shared draft safely, observe the serialized production build, and refresh the corresponding 4173 preview without using Git, SSH, or Kooboo CLI.

## In scope

- Replace Phase 2 read-only source display with explicit Markdown source editing.
- Save only existing `docs/**/*.md` files.
- Require the SHA-256 hash returned by the last read and reject stale saves with HTTP 409.
- Write through a same-directory temporary file, fsync, and atomic rename while preserving file permissions.
- Serialize hash checking, writing, VitePress production builds, health checks, and release switching with the existing cross-process preview lock.
- Keep the last successful 4173 release available while a new build runs or fails.
- Expose queue/save/build status and concise failure output to the authenticated editor UI.
- Add a 4173 preview iframe and refresh it only after a successful release.
- Record save/conflict/build outcomes in a server-side audit JSONL file.
- Defer Git synchronization without error while an editor draft marker exists; resume normal sync after the worktree returns clean.

## Out of scope

- Git commit, branch, push, merge request, or review submission.
- Multiple independent users or worktrees.
- Rich-text/WYSIWYG editing.
- Image upload or asset editing.
- Automatic production or Kooboo candidate deployment.
- Silently overwriting a changed file or discarding a saved draft after build failure.

## Safety rules

1. The browser sends only path, Markdown content, and expected hash.
2. The server repeats path and symlink validation before every write.
3. A stale expected hash returns conflict details and never writes.
4. Source files must never be edited while a preview or Git synchronization build holds the shared lock.
5. A failed build keeps the saved draft and the previous successful release; the UI distinguishes save success from preview failure.
6. The editor service receives write access only to the checkout and preview data directory.
7. Git credentials, SSH credentials, auth-token contents, and full build logs are never returned to the browser.

## Acceptance criteria

- An authenticated save changes the exact Markdown file and returns a new hash.
- A stale hash returns 409 and the current server document without modifying it.
- Traversal, non-Markdown, hidden, oversized, NUL-containing, and symlink-escape writes fail.
- Two save requests are processed serially.
- Build status progresses through queued/saving/building and finishes as ready or error.
- A failed build preserves the old 4173 release and reports that the draft itself was saved.
- The preview iframe refreshes to the new release after a successful build.
- Git sync exits successfully with a deferred result while a draft marker exists.
- Restoring all docs to a clean Git state removes the marker and allows Git sync again.
- Focused Node tests, editor production build, VitePress build, and browser verification pass.
