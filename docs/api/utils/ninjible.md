# k.utils.ninjible

> 站点导入与 Lighthouse 对比任务（Ninjible）

## 概述

`k.utils.ninjible` 创建远程站点迁移/优化任务并查询进度。

## createTask()

创建完整任务（含优化流程）。

```ts
const taskId = k.utils.ninjible.createTask(oldUrl, rootDomain, orgName)
```

## createImportTask()

仅导入站点。

## getStatus()

按 `taskId` 获取 `NinjibleProgress`：`isDone`、`percent`、`oldUrl`、`newUrl`、Lighthouse 分数等。

## 相关文档

- [k.utils.google](./google.md)
