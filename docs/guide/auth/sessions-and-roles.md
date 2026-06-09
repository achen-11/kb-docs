# 会话、角色与权限

> 登录后把当前用户、角色和组织写入服务端 session；页面可以按角色隐藏入口，但每个 API 仍要重新校验 session、角色、组织和资源归属。

## 适用场景

这套做法适合会员中心、客户门户、组织协作、订单查询、项目管理、资料库和轻量后台。用户登录后会有不同角色，例如普通成员、组织经理、客服、运营、管理员；同一个角色还可能受组织、租户、部门或资源归属限制。

不适合只用 cookie 保存 `role=admin` 这类前端可改状态，也不适合只靠页面隐藏按钮作为权限边界。前端隐藏入口只是体验优化，真正的边界必须在服务端 API。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 展示当前用户、角色和可操作入口 | [Page](/templateEngine/page/) |
| API | 每次读取和修改业务资源前重新校验权限 | [k.api](/api/api/) |
| Session | 保存当前登录用户、角色和组织 | [k.session](/api/session/) |
| Cookie | 保存非敏感角色提示或 UI 偏好 | [k.cookie](/api/cookie/) |
| KeyValue / 数据库 | 保存项目、订单等资源的 ownerId / organizationId | [k.DB.keyValue](/api/key-value/) |
| CMS 用户/角色 | 维护后台站点用户和管理权限 | [站点用户](/cms/settings/site-users)、[角色权限](/cms/settings/roles) |

## 推荐架构

把权限判断设计成三层：

```text
登录 API
   ↓
校验业务用户
   ↓
k.session.set(currentUser)
   ↓
Page 读取 me 决定显示哪些入口

业务 API
   ↓
读取 k.session 当前用户
   ↓
读取资源 ownerId / organizationId / confidential
   ↓
按角色和资源归属做服务端判断
   ↓
返回数据或稳定错误码
```

不要把“页面上看不到按钮”当成权限。用户可以直接调用 API、修改 query 参数、复用浏览器请求或构造新的 HTTP 请求。页面权限和 API 权限要同时存在，但 API 权限才是边界。

## API：登录后写入 session

下面示例用固定测试用户和 KeyValue 项目列表验证角色规则。真实项目可以把用户换成站点用户、业务会员、客户表或组织成员表。

```ts
// @k-url /api/sessions-and-roles/{action}

type Role = "member" | "manager" | "admin";

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
};

const sessionUserKey = "guide:sessions-roles:user";
const roleCookie = "guide_role_hint";

function safeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
  };
}

k.api.post("login", (body: { userId?: string }) => {
  const user = users().find((item) => item.id === String(body?.userId || ""));
  if (!user) {
    k.response.statusCode(404);
    return { success: false, code: "USER_NOT_FOUND", message: "用户不存在。" };
  }

  const roleHint = `${user.role}:${user.organizationId}`;
  k.session.set(sessionUserKey, JSON.stringify(safeUser(user)));
  k.cookie.setByMinutes(roleCookie, roleHint, 60);

  return {
    success: true,
    message: "已写入服务端 session。",
    data: safeUser(user),
    session: {
      hasSession: k.session.containsKey(sessionUserKey),
      roleHint,
    },
  };
});
```

cookie 里的 `roleHint` 只用于前端显示或调试提示，不作为服务端权限依据。服务端要从 session 或数据库重新读取可信身份。

## API：当前用户和登出

`me` 接口给前端判断当前登录态；未登录时返回 401：

```ts
function currentUser(): User | null {
  const raw = k.session.get(sessionUserKey);
  if (!raw) return null;

  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

k.api.get("me", () => {
  const user = currentUser();
  if (!user) {
    k.response.statusCode(401);
    return { success: false, code: "AUTH_REQUIRED", message: "请先登录。" };
  }

  return {
    success: true,
    data: user,
    roleHint: k.cookie.get(roleCookie),
  };
});

k.api.get("logout", () => {
  return {
    success: true,
    message: "已退出登录。",
    data: {
      removedSession: k.session.remove(sessionUserKey),
      removedCookie: k.cookie.remove(roleCookie),
    },
  };
});
```

登出时要清理 session 和非敏感 cookie。若项目有 refresh token、设备会话、一次性链接或第三方绑定，也要同步失效。

## API：角色和组织权限

权限判断应把角色和资源归属放在一起看：

```ts
type Project = {
  id: string;
  title: string;
  organizationId: string;
  ownerId: string;
  confidential: boolean;
};

function canRead(user: User, project: Project) {
  if (user.role === "admin") return true;
  if (user.role === "manager") return user.organizationId === project.organizationId;
  return project.ownerId === user.id && !project.confidential;
}

function canUpdate(user: User, project: Project) {
  if (user.role === "admin") return true;
  if (user.role === "manager") return user.organizationId === project.organizationId && !project.confidential;
  return project.ownerId === user.id && !project.confidential;
}
```

读取接口每次都要重新校验当前用户：

```ts
k.api.get("project", () => {
  const user = currentUser();
  const projectId = String(k.request.queryString.projectId || "").trim();
  if (!user) {
    k.response.statusCode(401);
    return { success: false, code: "AUTH_REQUIRED", message: "请先登录。" };
  }

  const project = readState().find((item) => item.id === projectId);
  if (!project) {
    k.response.statusCode(404);
    return { success: false, code: "PROJECT_NOT_FOUND", message: "项目不存在。" };
  }

  if (!canRead(user, project)) {
    k.response.statusCode(403);
    return {
      success: false,
      code: "FORBIDDEN_PROJECT",
      message: "当前用户无权访问该项目。",
      projectId,
    };
  }

  return {
    success: true,
    data: project,
    currentUser: user,
  };
});
```

管理员全局读取、经理读取本组织、成员读取自己资源，是三种常见规则。实际项目还可能叠加租户、部门、资源状态、审批状态、字段级权限和操作类型。

## Page：展示入口但不承担权限

页面可以根据 `me` 的结果展示不同按钮：

```html
<!-- @k-url /sessions-and-roles -->
<button id="alice" type="button">登录 Alice</button>
<button id="manager" type="button">登录组织经理</button>
<button id="admin" type="button">登录管理员</button>
<button id="readOwn" type="button">读自己的项目</button>
<button id="readOther" type="button">越权读其他组织</button>
<button id="report" type="button">管理员报表</button>
<button id="logout" type="button">登出</button>
<pre id="result"></pre>
```

前端可以隐藏“管理员报表”按钮，但 API 仍要在服务端返回 `ADMIN_REQUIRED`。同理，列表页按当前用户过滤后，详情页也不能信任 URL 中的 `projectId`，仍要单独校验。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 未登录 | HTTP 401，返回 `AUTH_REQUIRED` |
| 用户不存在 | HTTP 404，返回 `USER_NOT_FOUND` |
| 资源不存在 | HTTP 404，返回 `PROJECT_NOT_FOUND` |
| 资源跨组织 | HTTP 403，返回 `FORBIDDEN_PROJECT` |
| 无管理权限 | HTTP 403，返回 `ADMIN_REQUIRED` 或 `FORBIDDEN_UPDATE` |
| 页面隐藏按钮 | 只作为体验优化，不作为权限边界 |
| cookie role hint | 只用于显示，不作为服务端授权依据 |
| 多组织用户 | session 中保存当前 organizationId，API 仍按资源 organizationId 校验 |

复杂项目建议把 `requireLogin`、`canReadProject`、`canUpdateProject`、`requireAdmin` 这类函数放进 CodeBlock service，避免多个 API 复制出不一致的权限规则。

## 相关

- [k.session](/api/session/)
- [k.cookie](/api/cookie/)
- [k.api](/api/api/)
- [k.DB.keyValue](/api/key-value/)
- [站点用户](/cms/settings/site-users)
- [角色权限](/cms/settings/roles)
- [密码登录 / 登出](/guide/auth/password-login)
- [访问控制与 API 防越权](/guide/security/access-control)
- [统一 API 响应与错误结构](/guide/troubleshooting/api-error-contract)
