# 邮件与短信通知

> 登录验证码、订单通知、表单提交通知都不要直接散落在业务接口里发送。推荐先写通知 outbox，再由发送器处理模板渲染、供应商失败、重试和脱敏日志。

## 适用场景

这套做法适合：

- 注册、登录、找回密码验证码；
- 订单支付、发货、签收、退款通知；
- 表单提交后的管理员提醒和用户确认；
- 预约、报名、审核状态变更通知。

不适合把 SMTP、短信供应商调用直接写在每一个业务 API 的最后一行。真实供应商可能超时、限流、失败或重复回调；业务写入和通知发送应解耦，否则通知失败会拖垮核心业务流程。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Mail | 发送邮件、配置发件账号 | [k.mail](/api/mail/) |
| SMS | 发送短信验证码或业务短信 | [k.utils.sms](/api/utils/sms) |
| API | 写入通知 outbox、校验收件人和幂等键 | [k.api](/api/api/) |
| KeyValue / 数据库 | 保存模板、outbox、重试次数和错误原因 | [k.DB.keyValue](/api/key-value/) |
| Job | 批量发送 queued / failed 通知 | [定时任务](/guide/integrations/scheduled-jobs) |

## 推荐流程

```text
业务动作成功
        ↓
按模板和收件人写入 outbox
        ↓
发送器读取 queued 消息
        ↓
渲染模板并调用 k.mail / k.utils.sms
        ↓
成功标记 sent；失败记录错误和 attempts
        ↓
定时任务重试 failed 且未超过 maxAttempts 的消息
```

验证码类通知可以在 API 中立即触发发送，但仍建议保留 outbox 记录。订单、表单、审批等业务通知更适合由 job 或后台 worker 异步发送。

## API：通知入队

下面示例用 KeyValue 模拟模板和 outbox，便于本地验证。生产项目可把 outbox 放在 SQLite 或业务通知表中。

```ts
// Example route: /api/notifications/{action}

type NotificationMessage = {
  id: string;
  channel: "email" | "sms";
  to: string;
  maskedTo: string;
  template: string;
  payload: Record<string, unknown>;
  status: "queued" | "sent" | "failed";
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
};

const outboxKey = "guide-notifications:outbox";
const idempotencyPrefix = "guide-notifications:idempotency:";
```

入队时先校验模板、收件人和幂等键。公开响应只返回脱敏后的摘要，不返回原始 `payload` 或渲染后的通知正文：

```ts
function publicMessage(message: NotificationMessage) {
  return {
    id: message.id,
    channel: message.channel,
    to: message.maskedTo,
    template: message.template,
    status: message.status,
    attempts: message.attempts,
    maxAttempts: message.maxAttempts,
    payloadKeys: Object.keys(message.payload || {}),
  };
}

k.api.post("enqueue", (body: EnqueueBody) => {
  const template = normalize(body?.template) || "order-paid";
  if (!readTemplates()[template]) {
    return fail(400, "TEMPLATE_NOT_FOUND", "通知模板不存在。");
  }

  const idempotencyKey = normalize(body?.idempotencyKey);
  if (!idempotencyKey) {
    return fail(400, "IDEMPOTENCY_REQUIRED", "通知入队必须提供幂等键。");
  }

  const email = normalize(body?.email);
  const phone = normalize(body?.phone);
  if (!email && !phone) {
    return fail(400, "RECIPIENT_REQUIRED", "至少提供邮箱或手机号。");
  }

  const messages = [];
  if (email) messages.push(enqueue("email", email, template, body.payload, idempotencyKey));
  if (phone) messages.push(enqueue("sms", phone, template, body.payload, idempotencyKey));

  return {
    success: true,
    idempotent: messages.every((item) => item.idempotent),
    messages: messages.map((item) => publicMessage(item.message)),
  };
});
```

幂等键应按业务动作生成，例如 `order-paid:<orderId>`、`reset-password:<tokenId>`。不要只用时间戳，否则重复点击或重试无法识别同一业务动作。

常见错误码建议固定为：

| 错误码 | 触发条件 |
|--------|----------|
| `TEMPLATE_NOT_FOUND` | 模板不存在 |
| `IDEMPOTENCY_REQUIRED` | 缺少幂等键 |
| `RECIPIENT_REQUIRED` | 邮箱和手机号都为空 |
| `INVALID_EMAIL` | 邮箱格式无效 |
| `INVALID_PHONE` | 手机号格式无效 |

## 发送器与重试

发送器只处理 `queued`，或在明确 `retryFailed` 时处理未超过最大次数的 `failed`：

```ts
k.api.post("process", (body: { retryFailed?: boolean }) => {
  const outbox = readOutbox();
  const candidates = outbox.filter((item) =>
    item.status === "queued" ||
    (body.retryFailed && item.status === "failed" && item.attempts < item.maxAttempts)
  );

  for (const item of candidates) {
    item.attempts += 1;
    const result = sendNotification(item);
    if (result.ok) {
      item.status = "sent";
      item.sentAt = new Date().toISOString();
      item.lastError = "";
    } else {
      item.status = "failed";
      item.lastError = result.error;
    }
  }

  writeOutbox(outbox);
  return { success: true };
});
```

真实发送时把模拟发送替换为 `k.mail` 或 `k.utils.sms`。供应商错误、限流和超时都应落到 `lastError`，不要把异常直接抛给用户页面。`process` 的公开响应建议只返回 `id`、`channel`、`status`、`error` 和脱敏 outbox 摘要，不要返回渲染后的验证码正文。

## 脱敏与日志

响应和日志里只展示脱敏收件人：

```ts
function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}
```

验证码、完整手机号、完整邮箱、供应商 token、SMTP 密码、短信签名密钥都不要写到前台响应、普通日志或错误堆栈里。需要审计时记录 messageId、template、maskedTo、attempts、lastError 和 traceId。

## 前端验证页

可以提供一个 `/notifications` 验证页，用按钮驱动以下流程：

- 订单通知入队，确认邮件和短信各写入一条 queued 消息；
- 使用同一幂等键重复入队，确认不会新增 outbox 行；
- 触发供应商失败，确认消息进入 failed 且记录 `PROVIDER_UNAVAILABLE`；
- 开启 `retryFailed` 后重试，确认 failed 消息转为 sent；
- 显示 outbox 时只展示 `maskedTo`、`status`、`attempts`、`lastError` 和 `payloadKeys`。

前端调试面板可以保留 JSON 响应，便于核对错误码和重试次数，但不要把验证码、完整邮箱、完整手机号或供应商凭据渲染出来。

## 相关

- [邮箱注册与找回密码](/guide/auth/email-register-reset)
- [短信验证码登录](/guide/auth/sms-login)
- [订单履约与通知](/guide/commerce/order-fulfillment)
- [定时任务](/guide/integrations/scheduled-jobs)
- [业务日志与错误追踪](/guide/troubleshooting/business-logging)
