# URL 解析与安全跳转

> 处理登录后 returnUrl、支付回跳、OAuth 回跳和活动落地页跳转时，先在服务端归一化目标 URL，再执行 `k.response.redirect`。

## 适用场景

这套做法适合需要“完成某个动作后跳回业务页”的场景，例如：

- 登录后回到原页面；
- 支付完成后回到订单页；
- OAuth 授权完成后回到用户中心；
- 活动页提交表单后跳到站内结果页。

不适合直接转发任意外部链接。只要跳转目标来自 query、表单、cookie、第三方回调或前端状态，都要先做白名单和归一化，否则容易变成 open redirect。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 收集或携带 returnUrl，展示拦截结果 | [Page](/templateEngine/page/) |
| API | 统一检查目标 URL，并返回安全判定或执行跳转 | [k.api](/api/api/) |
| Request | 读取 query 中的 `target` / `returnUrl` | [k.request](/api/request/) |
| Response | 对允许目标执行 302 跳转 | [k.response](/api/response/) |
| Account / Payment | 登录、支付等真实业务动作完成后调用安全跳转 | [登录](/api/account/login) · [支付](/api/payment/) |

## 推荐架构

把跳转判断集中在一个 API 或 CodeBlock service 中，不要让每个业务 API 自己拼 redirect：

```text
登录 / 支付 / OAuth 回调
        ↓
safeRedirect service
        ↓
k.response.redirect(站内安全路径)
```

默认策略建议只允许站内相对路径，例如 `/account?tab=orders`。确实需要跳外部域名时，也应维护明确的域名白名单，而不是允许任意 `https://...`。

## API：归一化 returnUrl

下面示例只允许站内相对路径，并拦截绝对 URL、协议相对 URL、反斜杠和控制字符：

```ts
// @k-url /api/safe-redirect/{action}

const fallbackPath = "/login?blocked=1";

function decodeOnce(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function fail(target: string, reason: string) {
  return {
    success: true,
    safe: false,
    target,
    redirectTo: fallbackPath,
    reason,
  };
}

function normalizeTarget(value: unknown) {
  const original = String(value || "").trim();
  const target = decodeOnce(original).trim() || "/";

  if (/[\u0000-\u001f\u007f]/.test(target) || target.includes("\\")) {
    return fail(original, "目标包含控制字符或反斜杠");
  }

  if (target.startsWith("//")) {
    return fail(original, "禁止协议相对 URL");
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(target)) {
    return fail(original, "禁止绝对外部 URL");
  }

  if (!target.startsWith("/")) {
    return fail(original, "只允许站内相对路径");
  }

  return {
    success: true,
    safe: true,
    target: original,
    redirectTo: target,
    reason: "允许站内相对路径",
  };
}

k.api.get("check", () => {
  return normalizeTarget(k.request.queryString.target || "/");
});

k.api.get("go", () => {
  const decision = normalizeTarget(k.request.queryString.target || "/");
  return k.response.redirect(decision.redirectTo);
});
```

`check` 便于前端预览和测试；真实业务完成后调用 `go` 或直接在业务 API 里复用 `normalizeTarget` 的结果。

## Page：展示拦截结果

页面只负责把用户输入传给 API，并在被拦截时展示提示：

```html
<!-- @k-url /safe-redirect-demo -->
<input id="target" value="/account?tab=orders">
<button id="check" type="button">检查目标</button>
<a id="go" href="/api/safe-redirect/go?target=%2Faccount">执行跳转</a>
<pre id="result"></pre>

<script>
  const target = document.querySelector("#target");
  const result = document.querySelector("#result");
  const go = document.querySelector("#go");

  function updateGoLink() {
    go.href = `/api/safe-redirect/go?target=${encodeURIComponent(target.value)}`;
  }

  document.querySelector("#check").addEventListener("click", async () => {
    updateGoLink();
    const response = await fetch(`/api/safe-redirect/check?target=${encodeURIComponent(target.value)}`);
    result.textContent = JSON.stringify(await response.json(), null, 2);
  });

  target.addEventListener("input", updateGoLink);
  updateGoLink();
</script>
```

前端可以提示“该链接被拦截”，但不能把“是否允许跳转”的判断只放在前端。

## 安全与失败处理

| 情况 | 推荐处理 |
|------|----------|
| `/account?tab=orders` | 允许，保留 query 和 hash |
| `https://evil.example/phishing` | 拦截，回退到固定站内地址 |
| `//evil.example/phishing` | 拦截协议相对 URL |
| `\evil.example` 或含控制字符 | 拦截，避免浏览器解析差异 |
| `account` | 拦截，要求以 `/` 开头 |
| 需要外部白名单 | 先解析 origin，再只允许明确维护的域名 |

登录、支付、OAuth 回调等场景还要注意：

- returnUrl 只决定跳转位置，不决定权限；
- 目标页面和 API 仍要独立校验登录态、订单归属或业务权限；
- fallback 地址必须固定，不能继续使用用户输入；
- 日志里记录拦截原因，但不要记录敏感 token。

## 相关

- [k.request](/api/request/)
- [k.response](/api/response/)
- [k.api](/api/api/)
- [登录](/api/account/login)
- [支付](/api/payment/)
