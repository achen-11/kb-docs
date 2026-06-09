# 表单提交与服务端校验

> 用 Page 承载表单，用 API 接收请求，并把字段校验、错误返回和成功响应统一放在服务端。

## 适用场景

这套做法适合联系表单、报名表单、线索收集、预约申请、简单反馈等业务。它们通常不需要复杂登录体系，但必须保证前端提交的数据经过服务端校验。

不适合直接处理支付、验证码登录、文件断点上传这类高风险流程；这些场景应单独设计幂等、权限、回调或上传恢复。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 展示表单、收集输入、调用 API、展示结果 | [Page](/templateEngine/page/) |
| API | 接收 JSON body，做字段校验，返回统一 JSON | [k.api](/api/api/) |
| Request | 读取请求体、query 或 form 数据 | [k.request](/api/request/) |
| Response | 需要时设置 JSON 或状态码 | [k.response](/api/response/) |
| CodeBlock | 表单逻辑复杂后，承载 service 和校验函数 | [CMS：代码](/cms/development/code) |

## 推荐架构

最小场景可以只用一个 Page 和一个 API：

```text
src/
├── page/
│   └── contact.html
└── api/
    └── contact-submit.ts
```

当表单开始复用、字段变多、需要写入数据库或发送通知时，把校验、保存和通知逻辑移入 `src/code/services/...`，API 只保留请求入口。

## Page：只做交互和展示

Page 负责渲染表单，并把用户输入提交到 API：

```html
<!-- @k-url /contact -->
<form id="contact-form" novalidate>
  <input name="name" autocomplete="name" />
  <input name="email" autocomplete="email" />
  <textarea name="message"></textarea>
  <button type="submit">提交</button>
</form>

<pre id="result">等待提交。</pre>

<script>
  const form = document.querySelector("#contact-form");
  const result = document.querySelector("#result");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      name: form.elements.name.value,
      email: form.elements.email.value,
      message: form.elements.message.value,
    };

    const response = await fetch("/api/contact-submit/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    result.textContent = JSON.stringify(await response.json(), null, 2);
  });
</script>
```

前端可以做即时提示，但不能只依赖前端校验。浏览器校验、隐藏字段和前端状态都可以被绕过。

## API：统一做服务端校验

API 使用 `{action}` 子路由承载提交动作：

```ts
// @k-url /api/contact-submit/{action}

type ContactFormBody = {
  name?: string;
  email?: string;
  message?: string;
};

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function fail(message: string, field: string) {
  return { success: false, message, field };
}

k.api.post("submit", (body: ContactFormBody) => {
  const name = normalizeText(body?.name);
  const email = normalizeText(body?.email);
  const message = normalizeText(body?.message);

  if (!name) return fail("请填写姓名。", "name");
  if (!email) return fail("请填写邮箱。", "email");
  if (!isEmail(email)) return fail("邮箱格式不正确。", "email");
  if (message.length < 10) return fail("留言至少需要 10 个字符。", "message");

  return {
    success: true,
    message: "提交成功，服务端校验已通过。",
    data: {
      name,
      email,
      messageLength: message.length,
      receivedAt: new Date().toISOString(),
    },
  };
});
```

返回结构建议至少包含 `success` 和 `message`。字段级错误可以额外返回 `field`，前端据此定位输入项。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 必填字段为空 | 返回 `success: false`、可读错误和字段名 |
| 格式错误 | 在服务端重新校验，不信任前端正则 |
| 请求失败 | 前端展示通用失败提示，并保留用户已输入内容 |
| 重复提交 | 提交期间禁用按钮；重要业务再增加幂等键 |
| 需要保存数据 | API 调用 CodeBlock service，由 service 写数据库或内容 |
| 需要通知 | 校验成功后再发送邮件或短信，并记录发送失败 |

## 相关

- [k.api](/api/api/)
- [k.request](/api/request/)
- [k.response](/api/response/)
- [Page](/templateEngine/page/)
- [Script](/templateEngine/js/)
- [CMS：代码](/cms/development/code)
