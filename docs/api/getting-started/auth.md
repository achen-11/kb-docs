# 认证与授权

> 站点内用户登录、会话与访问控制相关 API

## 概述

Kooboo 中与「当前用户是否已登录」相关的操作主要通过 `k.account` 完成；请求级会话见 [k.session](../core/session.md)，Cookie 见 [k.cookie](../core/cookie.md)。加密与令牌见 [k.security](../core/security.md)。

::: tip
`k.user` 上部分属性已标记为过时，新代码请使用 `k.account` / `k.account.user`。
:::

## k.account.isLogin

判断当前请求是否已登录。

```ts
k.api.get("isLogin", () => {
    return { isLogin: k.account.isLogin }
})
```

## k.account.login()

使用用户名和密码登录。

| 参数 | 类型 | 说明 |
|------|------|------|
| username | `string` | 用户名 |
| password | `string` | 密码 |
| code | `string` | 可选，验证码等 |

```ts
k.api.post("login", () => {
    const username = k.request.form.username
    const password = k.request.form.password
    k.account.login(username, password)
    return { isLogin: k.account.isLogin }
})
```

## k.account.logout()

退出登录，可选跳转到指定 URL。

```ts
k.api.get("logout", () => {
    k.account.logout("/")
    return { isLogin: k.account.isLogin }
})
```

## k.account.ensureLogin()

未登录时重定向到登录页（常用于需要登录的页面或 API）。

```ts
k.api.get("profile", () => {
    k.account.ensureLogin("/login?return=" + encodeURIComponent(k.request.url))
    return k.account.user.current
})
```

## 相关文档

- [k.session](../core/session.md) — 服务端会话存储
- [k.security](../core/security.md) — 加密、哈希等
- [快速开始](./index.md)
