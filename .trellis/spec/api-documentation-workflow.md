# API 文档重构流程

> 完整流程：从源码到可发布文档

## TaskBanner（KB-Docs 项目）

文档站任务使用 TaskBanner 项目 **KB-Docs**（`project_id`: `736837a913b24f248d39ff056c198b04`）。  
Kooboo 平台源码相关任务放在 **Kooboo** 项目，避免与 `kb-docs` 仓库工作混淆。  
Backlog 清单：`.trellis/spec/kscript-api-backlog.md`。

## 范围与约定（2026-05 确认）

### 文档范围

- **本期只做服务端 KScript API**（`k.*` 运行时 API），路径 `docs/api/**`
- **模板引擎**（`docs/templateEngine/**`）与最佳实践指南后续单独里程碑

### 模块粒度与提交

- 默认以 **`k.xxx` 命名空间** 为一次工作单元（对应一次 PR / 提交）
- **大模块可细分**：例如 `k.utils.foo.bar` 可拆成更小子模块，各自独立文档 + check + 提交
- 一次只推进一个模块，避免并行改多篇

### 验证（强制）

- **每个模块都必须** 完成 ai-check 测试 + `curl` 交叉验证（见 Step 4–6）
- 不允许仅凭方法返回值判断成功

### CLI 语法 vs 站点文档（重要）

测试代码写在 `old-source/kb-doc/`，经 `kb push` 同步；其中部分写法是 **CLI 部署约定**，**不得** 原样写入 VitePress 用户文档。

| 仅用于测试 / CLI | 写入 `docs/api/*.md` |
| ---------------- | -------------------- |
| `// @k-url /api/...` | 使用文档中的真实访问路径说明，不写 `@k-url` |
| `code/xxx` 等资源路径约定 | 用业务语义描述，不写 CLI 目录映射 |
| `AI-Check:` 等测试文件头注释 | 不出现在用户文档 |
| `kb push`、`src/api/ai-check/` 路径 | 可写在 workflow / 开发说明，不出现在 API 参考示例 |

**文档中的代码示例** 应表达「在 Kooboo API / CodeBlock 里怎么写」，与 ai-check 文件里的部署注释分离。可从测试逻辑 **提炼** 验证过的 `k.api.get/post` 片段，但去掉 CLI 专用行。

### Agent 执行原则

1. **不确定时**：先查 `old-source/kooboo.d.ts`、旧文档、`old-source/api/`，必要时查 **Kooboo 服务端源码**
2. **仍无法确认行为或签名**：**停下来向维护者提问**，不要猜测、不要反复试错
3. **不钻牛角尖**：同一问题尝试有限次后应升级为人机对齐，而非在 loop 里硬推

### 源码与本地资源

| 资源 | 路径 |
| ---- | ---- |
| 类型定义 | `old-source/kooboo.d.ts` |
| 旧文档 | `old-source/api/` |
| 测试站点 | `old-source/kb-doc/`（`kb push` + https://kb-doc.redev.cn） |

`old-source/` 在 `.gitignore` 中，但开发者本地应保留完整目录。

## 流程概述

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: 阅读源码                                                │
│  · 旧文档 (old-source/api/)                                      │
│  · kooboo.d.ts TypeScript 定义                                     │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: 确认文档状态                                              │
│  · 是否已有文档？                                                  │
│  · vitepress 侧边栏是否配置？                                       │
│  · 需要新建还是重构？                                               │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: 重构/创建文档                                             │
│  · 基于 kooboo.d.ts 完整定义                                       │
│  · 包含所有方法（含重载）                                           │
│  · 包含结构体定义                                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: 撰写测试 API                                              │
│  · 路径: old-source/kb-doc/src/api/ai-check/                    │
│  · 每个方法都要有测试                                              │
│  · 验证类操作必须通过其他 API 验证结果                                  │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: 推送测试 API                                             │
│  cd old-source/kb-doc && kb push api ai-check/xxx-test.ts        │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: curl 验证                                                │
│  curl https://kb-doc.redev.cn/api/ai-check/xxx/{action}          │
└─────────────────────────────┬───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: 验证失败 → 修改文档/测试                                     │
│  验证成功 → 完成                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Step 1: 阅读源码

### 旧文档

路径: `old-source/api/` 目录下对应的 md 文件

### TypeScript 定义

路径: `old-source/kooboo.d.ts`

查找方法:

```bash
# 查找接口定义
grep -n "interface KXxx" old-source/kooboo.d.ts

# 查找具体方法
grep -n "k\.commerce\." old-source/kooboo.d.ts
```

## Step 2: 确认文档状态

### 检查文档是否存在

```bash
ls docs/api/{category}/
```

### 检查 vitepress 侧边栏配置

文件: `docs/.vitepress/config.mts`

如果新增模块，需要添加侧边栏配置:

```ts
{
  text: 'module-name',
  link: '/api/category/module-name.md'
}
```

## Step 3: 重构/创建文档

### 文档结构规范

```md
# module-name

> 模块说明

## 概述
// 1-2 句话描述

## method1()
// 每个方法都要有
### 参数表格
| 参数 | 类型 | 必填 | 说明 |

### 返回值
### 代码示例
```

### 必须包含的内容

1. **所有方法** - 包括重载版本
2. **参数说明** - 含类型、是否必填、说明
3. **返回类型** - 引用结构体
4. **代码示例** - 经验证的
5. **结构体定义** - FileInfo、FolderInfo 等

### 易漏内容检查清单

- 方法重载版本（如 `write(content)` 和 `write(content, withAuthor)`）
- 子模块（如 `resumableUpload.create()`）
- `options` 可选参数的结构
- `folderExists()` 等工具方法

## Step 4: 撰写测试 API

### 文件命名

```
ai-check/k-{module}-test.ts
// 例如: k-commerce-wishlist-test.ts, k-file-test.ts
```

### URL 路径规范（仅测试文件）

```ts
// @k-url /api/ai-check/k-{module}/{action}   ← 仅 ai-check 源文件，勿复制到 docs/api
```

### 测试验证规范（核心原则）

**⚠️ 严禁只依赖方法返回值判断成功**

❌ 错误示例：

```ts
// 错误 - 仅返回 success 无法证明操作成功
k.api.post("rename", () => {
    k.file.rename("old.txt", "new.txt")
    return "rename success"
})

// 错误 - 仅返回 void 无法证明操作成功
k.api.post("delete", () => {
    k.file.delete("test.txt")
    return "delete success"
})
```

✅ 正确示例：

```ts
// 正确 - 通过其他 API 验证操作确实生效
k.api.post("rename", () => {
    k.file.write("old.txt", "content")        // 先创建文件
    k.file.rename("old.txt", "new.txt")        // 执行重命名
    const newExists = k.file.exists("new.txt") // 验证新文件存在
    const oldExists = k.file.exists("old.txt") // 验证旧文件不存在
    return { newExists, oldExists }            // 返回验证结果
})

// 正确 - 通过读取验证文件内容
k.api.post("write", () => {
    k.file.write("test.txt", "hello world")
    const content = k.file.read("test.txt")    // 读取验证
    return { content }
})
```

### 验证方法对照表


| 操作类型                     | 必须验证方式                                               |
| ------------------------ | ---------------------------------------------------- |
| `write`                  | write 后用 `read()` 读取内容确认                             |
| `writeBinary`            | writeBinary 后用 `readBinary()` 读取确认                   |
| `append`                 | append 后用 `read()` 读取确认内容已追加                         |
| `rename`                 | rename 后用 `exists()` 验证新文件存在、旧文件不存在                  |
| `copy`                   | copy 后用 `exists()` 验证目标文件存在                          |
| `delete`                 | delete 后用 `exists()` 验证文件不存在                         |
| `createFolder`           | createFolder 后用 `subFolders()` 或 `folderExists()` 验证 |
| `renameFolder`           | renameFolder 后用 `subFolders()` 验证新名称存在、旧名称不存在        |
| `deleteFolder`           | deleteFolder 后用 `folderExists()` 验证文件夹不存在            |
| `resumableUpload.create` | 验证返回的 task 对象结构完整                                    |
| `resumableUpload.remove` | remove 后用 `get()` 验证返回 null/undefined                |


### 测试示例

```ts
// @k-url /api/ai-check/k-commerce-wishlist/{action}
// AI-Check: k.commerce.wishlist documentation verification

// Test: add - 验证 add 确实成功
k.api.post("add", () => {
    const customer = k.commerce.customer.getByEmail("test@kooboo.com")
    if (!customer) return "no customer"

    const products = k.commerce.product.list()
    if (!products || products.length === 0) return "no product"

    const product = k.commerce.product.get(products[0].id)
    const variantId = product.variants[0].id

    // 验证：add 前 list 长度
    const before = k.commerce.wishlist.list(customer.id)
    // 执行 add
    k.commerce.wishlist.add(customer.id, variantId)
    // 验证：add 后 list 长度应该 +1
    const after = k.commerce.wishlist.list(customer.id)

    return {
        before: before.length,
        after: after.length,
        added: after.length === before.length + 1
    }
})

// Test: remove - 验证 remove 确实成功
k.api.post("remove", () => {
    const customer = k.commerce.customer.getByEmail("test@kooboo.com")
    if (!customer) return "no customer"

    const products = k.commerce.product.list()
    if (!products || products.length === 0) return "no product"

    const product = k.commerce.product.get(products[0].id)
    const variantId = product.variants[0].id

    // 先添加
    k.commerce.wishlist.add(customer.id, variantId)
    const beforeRemove = k.commerce.wishlist.list(customer.id)

    // 执行 remove
    k.commerce.wishlist.remove(customer.id, variantId)
    const afterRemove = k.commerce.wishlist.list(customer.id)

    return {
        beforeRemove: beforeRemove.length,
        afterRemove: afterRemove.length,
        removed: afterRemove.length === beforeRemove.length - 1
    }
})
```

## Step 5: 推送测试 API

```bash
cd old-source/kb-doc
kb push api ai-check/k-{module}-test.ts
```

## Step 6: curl 验证

### GET 请求

```bash
curl "https://kb-doc.redev.cn/api/ai-check/k-{module}/{action}"
```

### POST 请求

```bash
curl -X POST "https://kb-doc.redev.cn/api/ai-check/k-{module}/{action}"
```

### 验证结果判定

返回的 JSON 必须包含验证结果，而非仅返回 "success"：

✅ 通过：

```json
{
  "before": 0,
  "after": 1,
  "added": true
}
```

❌ 不通过：

```json
"add success"
```

### 验证记录

每次验证需要记录:

- API 路径
- 执行的验证逻辑
- 实际结果
- 是否通过

## Step 7: 完成

验证通过后:

1. 文档已更新
2. 测试文件保留在 ai-check 目录
3. 如需更新 vitepress 配置，已更新

## 测试环境


| 配置         | 值                                                  |
| ---------- | -------------------------------------------------- |
| 测试站点       | [https://kb-doc.redev.cn](https://kb-doc.redev.cn) |
| 本地项目       | `old-source/kb-doc/`                               |
| 测试目录       | `src/api/ai-check/`                                |
| kooboo-cli | `kb` 命令                                            |


## Kooboo 语法规范

**必须遵守：**

- `k.api.post()` 不支持 `async` 和 `ctx` 参数
- 获取表单数据用 `k.request.form`
- 获取请求体（JSON）用 `k.request.body`
- 获取查询参数用 `k.request.queryString.get("key")`

**错误示例：**

```ts
// 错误 ❌
k.api.post(async (ctx) => {
    const { name } = await ctx.request.json()
})

// 正确 ✅
k.api.post(() => {
    const { name } = k.request.form
    // 或
    const body = k.request.body
})
```

## 模块完成定义（DoD）

- [ ] `kooboo.d.ts` 中该模块公开 API 均已文档化（含重载、子模块）
- [ ] `docs/api` 示例与 ai-check + curl 结果一致，且 **无 CLI 专用语法**
- [ ] `docs/.vitepress/config.mts` 与 `docs/api/index.md` 无死链
- [ ] `npm run docs:build` 通过

## 相关资源

- [kooboo-cli 使用文档](https://github.com/kooboo/kooboo-cli)
- [kb-doc 测试站点](https://kb-doc.redev.cn)

