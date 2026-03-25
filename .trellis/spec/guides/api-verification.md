# API 文档验证流程

> 确保文档中的示例代码经过真实测试验证

## 概述

每个 API 文档中的**所有示例**都应通过 `kb-doc` 测试站点验证后，才能正式发布。包括：
- 方法签名示例
- 单独方法示例
- **完整示例（必须全量验证）**

## 测试环境

| 配置 | 值 |
|------|-----|
| 测试站点 | https://kb-doc.redev.cn |
| 本地项目 | `old-source/kb-doc/` |
| 测试目录 | `src/api/ai-check/` |
| kooboo-cli | `kb` 命令 |

## Kooboo 语法规范

**必须遵守：**
- `k.api.post()` 不支持 `async` 和 `ctx` 参数
- 获取表单数据用 `k.request.form`
- 获取请求体（JSON）用 `k.request.body`（登录等场景通常用 body）
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

## 验证流程

### Step 1: 创建测试文件

在 `old-source/kb-doc/src/api/ai-check/` 目录下创建测试文件：

```ts
// @k-url /api/ai-check/k-request/{action}
// AI-Check: k.request documentation verification

// Test 1: queryString
k.api.get("queryString", () => {
    const page = k.request.queryString.page
    const limit = k.request.queryString.limit
    return { page, limit }
})

// Test 2: clientIp
k.api.get("clientIp", () => {
    return { ip: k.request.clientIp }
})
```

::: tip URL 格式说明
- `// @k-url` 注释定义 API 路径
- `{action}` 是动态参数，对应 `k.api.get("action", ...)` 中的名称
- 最终 URL: `/api/ai-check/k-request/queryString`
:::

### Step 2: 推送代码到测试站点

```bash
cd old-source/kb-doc

# 推送特定文件
kb push api ai-check/k-request-test.ts

# 或推送所有 API
kb push api
```

### Step 3: 使用 curl 验证

```bash
# 验证 GET 请求
curl "https://kb-doc.redev.cn/api/ai-check/k-request/queryString?page=1&limit=10"

# 验证 POST 请求
curl -X POST "https://kb-doc.redev.cn/api/ai-check/k-request/form" \
  -d "key=value"
```

### Step 4: 检查结果

验证返回的 JSON 符合文档中描述的格式。

### Step 5: 更新文档

验证通过后，将测试代码中的关键片段添加到文档中。

## 测试文件命名规范

```
ai-check/
├── k-request-test.ts      # k.request 相关测试
├── k-response-test.ts     # k.response 相关测试
├── k-cookie-test.ts       # k.cookie 相关测试
└── ...
```

## 注意事项

1. **每个 API 方法应有独立测试** - 便于定位问题
2. **保留测试代码** - 测试文件作为文档的一部分保留
3. **测试通过后更新文档** - 添加验证后的示例代码
4. **如有变更需重新验证** - 文档修改后必须重新测试

## 示例

### 验证 k.cookie 文档

```ts
// @k-url /api/ai-check/k-cookie/{action}

k.api.get("set", () => {
    k.cookie.set("test_cookie", "hello", 30)
    return "cookie set"
})

k.api.get("get", () => {
    return { value: k.cookie.get("test_cookie") }
})
```

```bash
# 测试
curl "https://kb-doc.redev.cn/api/ai-check/k-cookie/set"
curl "https://kb-doc.redev.cn/api/ai-check/k-cookie/get"
```

## 相关资源

- [kooboo-cli 使用文档](https://github.com/kooboo/kooboo-cli)
- [kb-doc 测试站点](https://kb-doc.redev.cn)
