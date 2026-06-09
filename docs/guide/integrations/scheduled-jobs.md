# 定时任务

> 用 SiteJob 承载批处理逻辑，用 API 手动触发和观察结果，把过期清理、批量同步、通知重试这类后台任务做成可验证流程。

## 适用场景

这套做法适合不应该由用户请求同步完成的后台工作：

- 清理过期验证码、重置密码 token、临时上传文件；
- 定时同步第三方数据或商品库存；
- 批量补偿失败通知、Webhook 重试、订单超时取消；
- 每日汇总报表、访问统计归档、缓存预热；
- 需要在上线前手动触发一次，确认任务逻辑和日志都正确。

不适合把定时任务当成用户请求的实时响应链路。用户点击提交后必须立即得到结果的流程，应走 API；定时任务只处理可延迟、可重试、可幂等的后台工作。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS Jobs | 管理任务名称、启用状态、调度周期和执行日志 | [定时任务（CMS）](/cms/development/jobs) |
| Job 文件 | 保存任务脚本和 `@jobConfig` 调度配置 | [k.site.runJob](/api/site/job.md) |
| API | 提供 seed、run、state、reset 等验证和后台触发入口 | [k.api](/api/api/) |
| Site | 用 `k.site.runJob` 手动触发任务，用 `k.site.getJob` 查询基础状态 | [k.site.runJob](/api/site/job.md) |
| KeyValue / 数据库 | 保存任务输入、业务结果和运行日志 | [k.DB.keyValue](/api/key-value/) |
| Page | 提供前台验证按钮和结果观察 | [Page](/templateEngine/page/) |

## 推荐架构

任务逻辑应独立于前台页面，页面和 API 只负责触发、观察和运维操作：

```text
业务数据 / 待处理队列
   ↓
SiteJob: cleanupExpiredTokens
   ↓
清理、同步、补偿、汇总
   ↓
写入业务状态和运行日志
   ↓
/api/scheduled-jobs/state 观察结果
```

推荐把任务设计成幂等：同一个任务重复运行，不应重复扣库存、重复发通知或破坏已处理数据。对于通知、支付、库存这类敏感动作，应保存处理 id、状态和失败原因。

## Job：用 `@jobConfig` 描述调度

Kooboo CLI 支持把 `src/job/**.ts` 推送为 SiteJob。文件顶部可以写 `@jobConfig`：

```ts
/**
 * @jobConfig
 * active: true
 * repeat: false
 * startTime: '2099-01-01T00:00:00.000Z'
 * frequency: [1, 'hour']
 */

const tokenKey = "guide-scheduled-jobs:tokens";
const logKey = "guide-scheduled-jobs:logs";
```

示例任务读取 token 列表，移除已过期记录，并把执行摘要写回日志：

```ts
const tokens = readJson(tokenKey, []);
const logs = readJson(logKey, []);
const now = Date.now();
const active = tokens.filter((item) => Date.parse(item.expiresAt) > now);
const expired = tokens.filter((item) => Date.parse(item.expiresAt) <= now);
const run = {
  job: "cleanupExpiredTokens",
  startedAt: new Date(now).toISOString(),
  before: tokens.length,
  removed: expired.length,
  remaining: active.length,
  removedIds: expired.map((item) => item.id),
};

k.DB.keyValue.set(tokenKey, JSON.stringify(active));
k.DB.keyValue.set(logKey, JSON.stringify([run, ...logs].slice(0, 10)));
k.response.write(JSON.stringify(run));
```

`repeat: false` 适合上线前手动验证或单次任务；周期任务再打开 `repeat` 并设置 `frequency`。任务脚本运行时不是 HTTP 请求，不应依赖前台 DOM、浏览器状态或用户会话。

## API：触发任务并观察结果

API 可以给后台按钮、运营工具或验收脚本使用。手动触发时调用 `k.site.runJob`：

```ts
// @k-url /api/scheduled-jobs/{action}

const jobName = "cleanupExpiredTokens";

k.api.post("run", () => {
  try {
    k.site.runJob(jobName);
    return {
      success: true,
      triggered: true,
      job: jobStatus(),
    };
  } catch (error) {
    return {
      success: false,
      code: "JOB_TRIGGER_FAILED",
      message: String(error && error.message ? error.message : error),
      job: jobStatus(),
    };
  }
});
```

状态接口应返回业务状态，而不仅是任务调度状态：

```ts
k.api.get("state", () => {
  const tokens = readTokens();
  return {
    success: true,
    total: tokens.length,
    expired: tokens.filter((item) => Date.parse(item.expiresAt) <= Date.now()).length,
    tokens,
    logs: readLogs(),
    job: jobStatus(),
  };
});
```

`k.site.getJob(name)` 可以确认任务是否存在、是否运行中。业务是否处理成功，应以任务写入的业务日志、状态表或待处理队列变化为准。

## Page：手动触发和观察

前台验证页只需要四个动作：

```html
<!-- @k-url /scheduled-jobs -->
<button id="seed" type="button">生成测试 token</button>
<button id="run" type="button">运行清理任务</button>
<button id="state" type="button">查看状态</button>
<button id="reset" type="button">清空</button>
<pre id="result">等待操作。</pre>
```

`runJob` 是异步触发，页面点击运行后应延迟读取状态，或轮询 `state`：

```js
document.querySelector("#run").addEventListener("click", async () => {
  render(await post("/api/scheduled-jobs/run"));
  await new Promise((resolve) => setTimeout(resolve, 900));
  render(await get("/api/scheduled-jobs/state"));
});
```

真实项目里，触发任务的按钮应只暴露给管理员或内部运营角色。前台访客不应能直接运行批处理。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 任务不存在 | `run` 返回 `JOB_TRIGGER_FAILED`，检查 Job 名称和推送状态 |
| 任务异步执行未完成 | 轮询业务状态或运行日志，不假定触发等于完成 |
| 重复触发 | 任务逻辑保持幂等，必要时用锁或运行状态保护 |
| 部分记录处理失败 | 保存失败明细，下一次只重试失败或未处理记录 |
| 高频任务 | 控制批量大小，避免单次处理过多数据 |
| 敏感任务 | 触发 API 必须做管理员鉴权和操作日志 |

任务失败时不要只依赖页面提示。应能从业务日志、Job 失败日志或错误追踪中找到失败原因和可重试数据。

## 相关

- [定时任务（CMS）](/cms/development/jobs)
- [k.site.runJob](/api/site/job.md)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
- [Page](/templateEngine/page/)
