# 动态菜单与导航

> 用 CMS 菜单维护导航结构，用 API 输出前台可用的菜单树，并在页面里完成身份过滤、当前项高亮和降级处理。

## 适用场景

这套做法适合企业官网、会员中心、电商站点、内容门户和多入口业务系统。菜单项需要由后台维护，前台还要根据登录态、角色、语言、当前路径或业务配置决定是否显示。

不适合只包含两三个固定链接的静态页面；这种页面直接写在 Layout 或 View 中即可。也不适合把权限完全放在前端隐藏菜单里，真正的页面和 API 权限仍要在服务端校验。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS 菜单 | 维护菜单名称、URL 和层级 | [CMS：菜单](/cms/development/menus) |
| Site API | 读取菜单资源，必要时创建或更新菜单 | [k.site](/api/site/) |
| API | 输出前台菜单树，做身份/角色/语言过滤 | [k.api](/api/api/) |
| Request | 读取当前路径、语言、视图身份等上下文 | [k.request](/api/request/) |
| Page / View | 渲染导航、当前项高亮和折叠状态 | [Page](/templateEngine/page/) |

## 推荐架构

建议把“菜单来源”和“前台可见菜单”分开：

```text
CMS 菜单 guide_main_nav
        ↓
src/api/navigation.ts
        ↓
Page / Layout / View 渲染导航
```

CMS 菜单只负责结构和 URL；API 负责把菜单转换成前台需要的格式，并加上 `requiresLogin`、`active`、`children` 等运行时字段。这样后台运营可以维护菜单，开发侧仍能集中处理权限、语言和当前路径。

## API：读取并过滤菜单

下面示例用 `k.site.menus` 读取菜单，并按 `audience` 过滤会员入口。真实项目中，`audience` 应来自 session、cookie 或账号角色，而不是前端传参。

```ts
// @k-url /api/navigation/{action}

const menuName = "main_nav";
const restrictedUrls = ["/account", "/orders"];

function getAudience() {
  return k.request.queryString.audience === "member" ? "member" : "guest";
}

function normalize(item, audience, path) {
  const requiresLogin = restrictedUrls.includes(item.url);
  if (requiresLogin && audience !== "member") return null;

  const children = (item.children || [])
    .map((child) => normalize(child, audience, path))
    .filter(Boolean);

  return {
    id: item.id,
    name: item.name,
    url: item.url,
    children,
    requiresLogin,
    active: item.url === path || children.some((child) => child.active),
  };
}

k.api.get("menu", () => {
  const audience = getAudience();
  const path = k.request.queryString.path || "/";
  const menu = k.site.menus.get(menuName);

  return {
    success: true,
    audience,
    path,
    items: (menu.children || [])
      .map((item) => normalize(item, audience, path))
      .filter(Boolean),
  };
});
```

如果菜单可能还没创建，初始化逻辑应先创建根菜单，再重新读取后创建子项。空站点里直接对刚创建的菜单对象追加子菜单，可能遇到资源尚未完全初始化的问题。

## Page：渲染导航

页面或 Layout 只消费 API，不直接写死菜单规则：

```html
<!-- @k-url /navigation-demo -->
<nav id="navigation" aria-label="主导航"></nav>

<script>
  const navigation = document.querySelector("#navigation");
  let currentPath = location.pathname;

  async function loadMenu() {
    const response = await fetch(`/api/navigation/menu?path=${encodeURIComponent(currentPath)}`);
    const data = await response.json();

    navigation.innerHTML = "";
    data.items.forEach((item) => {
      const link = document.createElement("a");
      link.href = item.url;
      link.textContent = item.name;
      link.className = item.active ? "active" : "";
      navigation.appendChild(link);
    });
  }

  loadMenu();
</script>
```

复杂站点可以把渲染放进 View 或前端组件，把 API 返回结构保持稳定。这样 Layout、移动端菜单、页脚导航和面包屑可以复用同一份菜单树。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| 菜单未创建 | 后台先配置菜单；必要时提供一次性初始化 API |
| 当前用户无权限 | API 过滤菜单，同时页面和 API 入口继续做服务端权限校验 |
| 当前路径不在菜单中 | 不高亮任何项，或回退到所属栏目 |
| 多语言站点 | 菜单 API 接收当前 culture，使用菜单多语言名称或语言 URL |
| 菜单层级过深 | 前台限制展示层级，移动端使用折叠面板 |
| 缓存菜单树 | 缓存 key 包含语言、角色、站点上下文；后台更新后清理缓存 |

## 相关

- [CMS：菜单](/cms/development/menus)
- [k.site](/api/site/)
- [k.api](/api/api/)
- [k.request](/api/request/)
- [Page](/templateEngine/page/)
- [View](/templateEngine/view/)
