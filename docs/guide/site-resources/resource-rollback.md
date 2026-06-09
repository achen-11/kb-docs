# 代码生成资源与回滚

> 在业务后台或运营工具中动态创建 Page、Style、Script、API、CodeBlock，并用版本日志验证更新和回滚。

## 适用场景

这套做法适合需要由业务配置生成站点资源的场景：

- 运营后台生成活动页、落地页、专题页；
- AI 或模板工具生成 Page / Style / Script 后需要预览；
- 后台配置发布成前台 API 或 CodeBlock；
- 修改资源后需要保留版本日志，出错时可回滚；
- 生成失败或活动结束后需要清理临时资源。

不适合把所有业务内容都生成成站点资源。普通内容列表、商品、文章、表单数据仍应优先放在 CMS 内容、数据库或业务表里。代码生成适合“资源本身就是交付物”的场景。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 创建可访问页面、预览 URL、按版本日志回滚 body | [k.site.pages](/api/site/page.md) |
| Style | 生成独立 CSS 并注册路由 | [k.site.styles](/api/site/css.md) |
| Script | 生成独立 JS 并注册路由 | [k.site.scripts](/api/site/js.md) |
| Code | 生成 API 或 CodeBlock | [k.site.codes](/api/site/code.md) |
| KeyValue | 保存本次生成的资源名、路由和回滚上下文 | [k.DB.keyValue](/api/key-value/) |
| Page 验证页 | 触发生成、更新、回滚、清理流程 | [Page](/templateEngine/page/) |

## 推荐架构

生成资源前先确定资源边界和命名规则：

```text
后台配置 / AI 生成结果
   ↓
校验名称、URL、资源类型和是否覆盖
   ↓
k.site.pages / styles / scripts / codes 创建资源
   ↓
保存生成上下文
   ↓
访问预览 URL 和动态 API 验证
   ↓
更新后读取版本日志，必要时 getByLog 回滚
```

资源名应稳定且可追踪。不要用用户输入直接拼接路由；要统一加业务前缀、限制字符集，并在生成前检查是否会覆盖已有资源。

## API：生成 Page、Style、Script、API、CodeBlock

下面示例生成一套落地页资源：

```ts
// @k-url /api/resource-rollback/{action}

k.site.styles.add({
  name: "guide-generated-resource.css",
  url: "/generated-resource.css",
  body: ".generated-shell { max-width: 760px; margin: 48px auto; }",
});

k.site.scripts.add({
  name: "guide-generated-resource.js",
  url: "/generated-resource.js",
  body: "document.querySelector('#mark')?.addEventListener('click', function () { document.querySelector('#result').textContent = 'generated script is active'; });",
});
```

生成 API 和 CodeBlock 都走 `k.site.codes`，但 `codeType` 不同：

```ts
k.site.codes.add({
  name: "guide.generatedResourceHelper",
  codeType: "CodeBlock",
  body: "export function generatedResourceMessage() { return 'generated codeblock is available'; }",
});

k.site.codes.add({
  name: "guide-generated-resource-api",
  url: "/api/generated-resource",
  codeType: "Api",
  body: "k.api.get(() => ({ success: true, generated: true, version: 'v1' }));",
});
```

Page 负责把 CSS 和 JS 引入可预览页面：

```ts
k.site.pages.add({
  name: "guide_generated_landing",
  url: "/generated-resource-preview",
  body: `<!doctype html>
<html lang="zh-CN">
  <head>
    <link rel="stylesheet" href="/generated-resource.css">
  </head>
  <body data-version="v1">
    <main class="generated-shell">
      <h1>资源生成预览 v1</h1>
      <button id="mark" type="button">标记访问</button>
      <pre id="result">等待动态脚本。</pre>
    </main>
    <script src="/generated-resource.js"></script>
  </body>
</html>`,
});
```

动态创建 Api Code 时，先验证根路径是否可访问。本文验证中 `/api/generated-resource` 返回 JSON；不要在未验证前假定子路径 action 一定会按 `/api/generated-resource/ping` 分发。

## 更新与版本日志

更新页面时可以先按名称或 URL 取到资源，再调用 `updateBody`：

```ts
const page = k.site.pages.get("guide_generated_landing");
k.site.pages.updateBody(page.id, nextBody);
k.site.styles.updateBody("guide-generated-resource.css", nextCss);
k.site.scripts.updateBody("guide-generated-resource.js", nextJs);
```

更新后用 `getLogs` 读取版本日志：

```ts
const logs = k.site.pages.getLogs("guide_generated_landing") || [];
return logs.map((log) => ({
  logId: log.logId || log.LogId,
  editType: String(log.editType),
  editTime: log.editTime || log.EditTime,
}));
```

日志数量能证明资源发生过新增和更新；真正回滚前还要用 `getByLog` 读取快照，确认快照内容是想要的版本。

## 回滚页面

回滚时遍历日志，找到包含旧版本标记的快照，再把当前页面 body 替换回去：

```ts
const logs = k.site.pages.getLogs("guide_generated_landing") || [];
let rollbackBody = "";

for (const log of logs) {
  const logId = log.logId || log.LogId;
  const snapshot = k.site.pages.getByLog(logId);
  if (snapshot && snapshot.body && snapshot.body.indexOf('data-version="v1"') >= 0) {
    rollbackBody = snapshot.body;
    break;
  }
}

if (rollbackBody) {
  const page = k.site.pages.get("guide_generated_landing");
  k.site.pages.updateBody(page.id, rollbackBody);
}
```

真实项目中不要只按“第一个日志”回滚。应按版本号、发布时间、操作人、审批记录或内容签名来选择目标版本。

## 清理资源

删除动态资源后，不要再用 `getByUrl` 验证，因为部分资源删除后可能存在路由残留。按名称或 id 用 `get` 验证更稳：

```ts
function removeIfExists(repo, name) {
  const current = repo.get(name);
  if (current) repo.delete(name);
  return Boolean(current);
}

return {
  page: removeIfExists(k.site.pages, "guide_generated_landing"),
  style: removeIfExists(k.site.styles, "guide-generated-resource.css"),
  script: removeIfExists(k.site.scripts, "guide-generated-resource.js"),
  api: removeIfExists(k.site.codes, "guide-generated-resource-api"),
  codeBlock: removeIfExists(k.site.codes, "guide.generatedResourceHelper"),
};
```

如果生成资源被其它页面、布局或菜单引用，清理前要先检查引用关系，避免删除后留下前台断链。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 名称或 URL 已存在 | 返回冲突错误，除非用户明确选择覆盖 |
| 动态 API 不可访问 | 检查 `codeType: "Api"`、`url` 和 API 根路径写法 |
| 更新后预览失败 | 保留旧版本日志，立即回滚 Page body |
| 找不到目标日志 | 不执行回滚，提示人工选择版本 |
| 删除后路由残留 | 用 `get(name)` 验证对象删除，不依赖 `getByUrl` |
| 资源被引用 | 先解除引用或阻止删除 |

生成类功能要保留操作日志：谁生成、生成了哪些资源、预览 URL 是什么、是否覆盖、是否回滚。

## 相关

- [k.site.pages](/api/site/page.md)
- [k.site.styles](/api/site/css.md)
- [k.site.scripts](/api/site/js.md)
- [k.site.codes](/api/site/code.md)
- [k.DB.keyValue](/api/key-value/)
