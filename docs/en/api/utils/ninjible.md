# k.utils.ninjible

> Site import and Lighthouse comparison task (Ninjible)

## Overview

`k.utils.ninjible` Create a remote site migration/optimization task and query the progress.

## createTask()

Create a complete task (including optimization process).

```ts
const taskId = k.utils.ninjible.createTask(oldUrl, rootDomain, orgName)
```

## createImportTask()

Import sites only.

## getStatus()

Press `taskId` to get `NinjibleProgress`: `isDone`, `percent`, `oldUrl`, `newUrl`, Lighthouse scores, and more.

## Related Docs

- [k.utils.google](./google.md)
