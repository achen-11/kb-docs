# Kooboo CLI User Documentation

## Goal

Create a bilingual documentation area that introduces Kooboo CLI capabilities and shows users how to operate the CLI safely.

## Public documentation scope

- Explain user-visible CLI features and workflows.
- Cover preparation, project creation or cloning, local resource organization, pull, push, live synchronization, remote comparison and cleanup, export, and troubleshooting.
- Keep Chinese and English content aligned 1:1.
- Add dedicated VitePress navigation and sidebars.

## Source of truth

All functional claims must be verified against the real CLI project at `/Users/achen/Priv/Yardi/cli`.

README files, skills, previous documentation, and historical notes may help locate a topic, but they cannot override the current project behavior.

## Public content boundary

Published pages must not contain:

- CLI source paths;
- source excerpts;
- internal functions, classes, types, or package structure;
- internal HTTP endpoints or implementation APIs;
- implementation explanations that are not needed to use the CLI.

## Acceptance criteria

- The `/cli/` and `/en/cli/` areas build successfully.
- Every documented command and option reflects verified CLI behavior.
- Registered but non-functional commands are not presented as usable features.
- Public pages contain no CLI source or internal API details.
- Dead-link, bilingual-alignment, build, and diff checks pass.
