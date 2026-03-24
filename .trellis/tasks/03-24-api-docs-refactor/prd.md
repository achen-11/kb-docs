# 重构 API 文档结构

## Goal

将 Kooboo API 文档从 `old-source/api/` 重构为结构统一、类型完善、可维护性高的新文档。

## Requirements

1. **统一文档模板** - 每个 API 页面包含：概述、TypeScript 定义、方法列表、参数表格、示例、错误码
2. **充分利用 `kooboo.d.ts`** - 从类型定义文件中提取 API 类型
3. **清晰导航分类** - 按功能域分组（核心/数据/业务/站点/网络）
4. **可运行示例** - 基于 `old-source/kb-doc/` 中的测试代码

## Navigation Structure

```
API 详情
├── 入门
│   ├── 快速开始
│   └── 认证与授权
│
├── 核心
│   ├── k.request / k.response
│   ├── k.session / k.cookie
│   └── k.security
│
├── 数据
│   ├── k.DB
│   ├── k.content
│   └── k.storage
│
├── 业务
│   ├── k.commerce
│   ├── k.payment
│   ├── k.emailMarketing
│   └── k.mail
│
├── 站点
│   ├── k.site
│   ├── k.page / k.label
│   └── k.file / k.module
│
└── 网络
    ├── k.net.httpClient
    ├── k.net.webSocket
    └── k.net.DNS
```

## Template Structure (per API page)

```markdown
# k.{module}

> 一句话描述

## 概述
- 使用场景
- 依赖关系

## TypeScript 定义

## 方法列表

### methodName()

**参数：**
| 参数 | 类型 | 必填 | 默认值 | 描述 |

**返回：** `ReturnType`

**示例：**
```ts
```

**错误：**
| 错误码 | 条件 | 处理 |
```

## Out of Scope

- 暂不重构 dev-guide（最佳实践）
- 暂不实现搜索功能
- 暂不考虑国际化

## Technical Notes

- 参考 `old-source/.vitepress/config.mts` 的导航结构
- 参考 `old-source/api/k-DB.md` 的内容
- 类型定义来自 `old-source/kooboo.d.ts`（20776 行）
- 测试代码位于 `old-source/kb-doc/src/api/`
