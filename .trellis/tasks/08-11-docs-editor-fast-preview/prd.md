# Fast draft preview with background stable builds

## Goal

Reduce the edit-to-preview feedback loop from roughly 30 seconds to a few seconds without removing production-grade VitePress verification or atomic stable releases.

## In scope

- Run a persistent VitePress Dev Server with HMR on port 4173.
- Move the immutable production preview service to port 4175.
- Return from `PUT /api/document` after the hash-checked atomic save and build scheduling, without waiting for a production build.
- Debounce and coalesce stable builds in the background while retaining the shared preview lock.
- Keep Git synchronization deferred while an editor draft exists.
- Show fast-preview and stable-build state separately in the editor.
- Preserve the current authenticated editing, conflict, audit, and atomic release contracts.

## Out of scope

- Multiple independent draft worktrees.
- Git commit or review submission.
- Replacing VitePress with a custom Markdown renderer.
- Treating the Dev Server as production verification.

## Acceptance criteria

- A successful save returns before the production build finishes.
- Port 4173 reflects the saved Markdown through HMR without waiting for a stable release.
- Repeated saves inside the debounce window produce one stable build.
- Port 4175 continues serving the last successful immutable release during builds and failures.
- Stable builds still own the cross-process preview lock.
- Git sync continues to return deferred while the draft marker exists.
- Editor status distinguishes fast draft preview from queued/building/ready/error stable verification.
- Focused Node tests, editor build, VitePress build, local browser acceptance, and a reversible kbdev save pass.
