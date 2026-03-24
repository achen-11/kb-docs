# API 快速开始

> 了解如何在 Kooboo 中使用 KScript API

## 什么是 KScript

KScript 是 Kooboo 的脚本语言，基于 JavaScript/TypeScript 语法。你可以在 Kooboo 站点的代码块、API、模块中编写 KScript。

## 基本结构

```ts
// 创建一个 GET API
k.api.get(() => {
    return { message: "Hello Kooboo" }
})

// 创建一个 POST API
k.api.post(async (ctx) => {
    const body = await ctx.request.json()
    return { received: body }
})
```

## 全局对象 `k`

`k` 对象是 KScript 的全局入口，提供所有内置功能：

| 模块 | 描述 |
|------|------|
| `k.request` | HTTP 请求数据 |
| `k.response` | HTTP 响应操作 |
| `k.session` | 会话状态管理 |
| `k.DB` | 数据库操作 |
| `k.content` | 内容管理 |
| `k.file` | 文件操作 |
| `k.site` | 站点管理 |
| `k.net` | 网络请求 |
| `k.commerce` | 电商功能 |
| `k.payment` | 支付功能 |
| `k.mail` | 邮件发送 |

## 类型提示

在 `kb-doc` 项目或 IDE 中，你可以引入 `kooboo.d.ts` 获取完整的 TypeScript 类型提示：

```ts
/// <reference path="kooboo.d.ts" />

// 现在你将获得完整的代码补全和类型检查
k.DB.
```

## 下一步

- [文档验证流程](./verification.md) - 如何验证文档中的示例代码
- [k.DB 数据库操作](./data/database.md) - 了解数据库 CRUD
- [k.request](./core/request.md) - 处理 HTTP 请求
- [k.site](./site/site.md) - 站点管理
