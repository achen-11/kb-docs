# k.module

> 在**脚本模块**执行上下文中可用的 API

## 概述

部分属性仅在模块运行时可用；在普通 API 中访问可能抛出异常（`part of k.module only available under Module execution context`）。

## baseUrl

当前模块的根 URL（须在模块代码中调用）。

```ts
k.api.get(() => {
    return k.module.baseUrl
})
```

## config

模块配置对象（在 Module 配置中定义后可用）。

```ts
k.api.get(() => {
    return k.module.config
})
```

## task

事件与后台任务，见 `k.module.task`（与 `k.site` 无关）。

## 相关文档

- [k.site](./site.md)
- [k.file](../file/file.md) — 模块本地文件还可通过 `k.module.localFile` 访问（待专文）
