# SQLite 业务模块 CRUD

> 用 `k.DB.sqlite` 为站点内轻量业务模块建表、查询、创建、更新和删除数据。

## 适用场景

这套做法适合站点内轻量、结构化、需要查询和分页的数据模块：

- 工单、任务、报名、预约、线索等小型业务表；
- 运营后台里的临时名单、活动反馈、审核队列；
- 需要按状态、负责人、关键字筛选的数据；
- 不需要接入独立 MySQL / SQL Server 的站点级数据。

如果只是保存单个开关或配置，优先用 [KeyValue 配置与缓存](./keyvalue-config.md)。如果数据来自 CMS 内容编辑流程，优先考虑内容类型或后台表结构；如果数据量很大、需要复杂报表或跨系统查询，应使用外部数据库。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| SQLite | 建表、索引、参数化查询、事务写入 | [k.DB.sqlite](/api/sqlite/) |
| API | 封装 CRUD、字段校验、分页筛选和失败结构 | [k.api](/api/api/) |
| Request | 读取 queryString 和 JSON body | [k.request](/api/request/) |
| Page | 调用 API 完成创建、更新、删除和列表刷新 | [Page](/templateEngine/page/) |
| CMS | 查看 SQLite 表能力和后台数据库入口 | [SQLite 表](/cms/database/sqlite-table) |

## 推荐架构

业务模块不要把 SQL 散落在多个页面里。推荐把表结构和 SQL 操作集中在 API 或 CodeBlock service：

```text
Page / 前端表单
   ↓
/api/tasks/{action}
   ↓
字段校验、分页参数归一化
   ↓
k.DB.sqlite.execute / query / transaction
   ↓
稳定响应结构
```

表结构初始化要幂等。API 每次操作前可以调用 `ensureTable()`，确保临时站点、导入站点或首次访问时都能自动建表。

## API：建表与查询

下面示例使用任务模块作为业务对象。ID 由 API 生成字符串，避免依赖自增 ID 的返回语义：

```ts
// @k-url /api/tasks/{action}

const tableName = "guide_tasks";

function ensureTable() {
  k.DB.sqlite.execute(`
    CREATE TABLE IF NOT EXISTS guide_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      task_status TEXT NOT NULL,
      priority TEXT NOT NULL,
      assignee TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  k.DB.sqlite.execute("CREATE INDEX IF NOT EXISTS idx_guide_tasks_status ON guide_tasks(task_status)");
}
```

列表查询用受控 SQL 片段组合筛选条件，用户输入只放进参数：

```ts
k.api.get("list", () => {
  ensureTable();

  const status = String(k.request.queryString.get("status") || "").trim();
  const search = String(k.request.queryString.get("search") || "").trim();
  const page = Math.max(1, Number(k.request.queryString.get("page") || 1));
  const pageSize = Math.min(20, Math.max(1, Number(k.request.queryString.get("pageSize") || 10)));

  const clauses = [];
  const params = { size: pageSize, offset: (page - 1) * pageSize };

  if (["open", "doing", "done"].includes(status)) {
    clauses.push("task_status = @status");
    params.status = status;
  }

  if (search) {
    clauses.push("(title LIKE @search OR assignee LIKE @search)");
    params.search = `%${search}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const items = k.DB.sqlite.query(
    `SELECT id, title, task_status as status, priority, assignee, createdAt, updatedAt
     FROM guide_tasks
     ${where}
     ORDER BY createdAt DESC
     LIMIT @size OFFSET @offset`,
    params
  );

  return { success: true, page, pageSize, items };
});
```

不要把搜索词、状态、排序字段直接拼进 SQL。排序字段如果要开放给前端，也应先映射到服务端白名单。

## API：创建、更新和删除

写操作应先校验字段，再执行 SQL：

```ts
k.api.post("create", () => {
  ensureTable();

  const body = JSON.parse(k.request.body || "{}");
  const title = String(body.title || "").trim();
  const status = String(body.status || "open").trim();
  const priority = String(body.priority || "normal").trim();
  const assignee = String(body.assignee || "unassigned").trim();

  if (title.length < 2) {
    return { success: false, code: "INVALID_TITLE", message: "任务标题至少需要 2 个字符。" };
  }

  if (!["open", "doing", "done"].includes(status)) {
    return { success: false, code: "INVALID_STATUS", message: "状态只能是 open、doing 或 done。" };
  }

  const id = `task_${Date.now()}`;
  const now = new Date().toISOString();

  k.DB.sqlite.execute(
    `INSERT INTO guide_tasks (id, title, task_status, priority, assignee, createdAt, updatedAt)
     VALUES (@id, @title, @status, @priority, @assignee, @createdAt, @updatedAt)`,
    { id, title, status, priority, assignee, createdAt: now, updatedAt: now }
  );

  return { success: true, id };
});
```

更新和删除要先查是否存在，避免前端把“无影响行数”误判成成功：

```ts
function findTask(id) {
  const rows = k.DB.sqlite.query("SELECT * FROM guide_tasks WHERE id = @id LIMIT 1", { id });
  return rows[0] || null;
}

k.api.post("remove", () => {
  ensureTable();

  const body = JSON.parse(k.request.body || "{}");
  const id = String(body.id || "").trim();

  if (!id) return { success: false, code: "MISSING_ID", message: "缺少任务 ID。" };
  if (!findTask(id)) return { success: false, code: "NOT_FOUND", message: "任务不存在。" };

  k.DB.sqlite.execute("DELETE FROM guide_tasks WHERE id = @id", { id });
  return { success: true, id };
});
```

批量初始化、导入或多表写入时使用 `transaction()`。如果中间一步失败，应让整组写入保持一致。

## Page：完成业务流程

页面负责采集字段、调用 API，并在列表中展示结果：

```html
<!-- @k-url /tasks -->
<input id="title" value="跟进企业客户演示">
<select id="status">
  <option value="open">open</option>
  <option value="doing">doing</option>
  <option value="done">done</option>
</select>
<button id="create" type="button">创建任务</button>
<button id="list" type="button">查询列表</button>
<pre id="result">等待操作。</pre>

<script>
  async function post(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  document.querySelector("#create").addEventListener("click", async () => {
    const data = await post("/api/tasks/create", {
      title: document.querySelector("#title").value,
      status: document.querySelector("#status").value,
    });
    document.querySelector("#result").textContent = JSON.stringify(data, null, 2);
  });
</script>
```

实际项目中，列表页面通常还需要权限校验、批量操作、导入导出和审计日志。本文聚焦最小 CRUD 链路，方便先确认 SQLite 与 API 组合方式。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 首次访问还没有表 | `CREATE TABLE IF NOT EXISTS` 幂等建表 |
| 标题为空或过短 | 返回 `INVALID_TITLE`，不写入数据库 |
| 状态 / 优先级非法 | 用服务端白名单校验，不相信前端 select |
| 更新或删除不存在 ID | 返回 `NOT_FOUND`，不要静默成功 |
| 搜索和筛选 | 使用参数化查询，只拼接受控 SQL 片段 |
| 多条写入需要一致性 | 使用 `k.DB.sqlite.transaction()` |
| 数据量持续增长 | 增加索引、分页上限，必要时迁移到外部数据库 |

## 相关

- [k.DB.sqlite](/api/sqlite/)
- [k.DB 概述](/api/database/)
- [k.request](/api/request/)
- [k.api](/api/api/)
- [SQLite 表](/cms/database/sqlite-table)
