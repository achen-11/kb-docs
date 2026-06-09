# WebSocket 实时通信

> WebSocket 适合需要服务端主动推送的业务：聊天、客服、协作编辑、长任务进度、在线状态和实时通知。握手、消息格式、重连和权限边界要一起设计。

## 适用场景

这套做法适合：

- 客服或站内消息；
- 导入、导出、AI 生成、报表等长任务进度；
- 多人协作编辑、在线状态、房间广播；
- 订单、审批、工单等实时状态提醒。

不适合把 WebSocket 当作所有 API 的替代品。普通 CRUD、搜索、分页、表单提交仍然用 HTTP API 更清晰。WebSocket 应用于“连接保持 + 服务端主动推送 + 低延迟交互”的部分。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| WebSocket API | 升级当前请求、接收消息、向连接发送消息 | [k.net.webSocket](/api/net/websocket) |
| Session / Token | 握手前校验登录态或短期 token | [k.session](/api/session/) · [k.security](/api/security/) |
| HTTP API | 生成 token、列连接、服务端主动 push | [k.api](/api/api/) |
| Logger / KeyValue | 记录关键事件、在线状态和调试日志 | [k.logger](/api/logger/) · [k.DB.keyValue](/api/key-value/) |

## 推荐流程

```text
页面加载
        ↓
HTTP API 获取短期 realtime token
        ↓
WebSocket 连接 /api/realtime/ws?token=...&clientId=...
        ↓
服务端校验 token，accept(connectionId)
        ↓
客户端发送带 type + requestId 的消息
        ↓
服务端回 pong / ack / progress / push
        ↓
断线后客户端重新获取 token 并退避重连
```

连接 ID 建议由服务端生成或校验，例如 `userId__clientId`。不要让前端随便声明自己是另一个用户，也不要只靠前端隐藏按钮控制实时权限。

## API：token、连接和 push

下面示例用 KeyValue 保存短期 token 和事件日志，用 `k.net.webSocket.accept()` 接收真实 WebSocket 连接：

```ts
// @k-url /api/realtime/{action}

const tokensKey = "guide-realtime:tokens";
const eventsKey = "guide-realtime:events";
const tokenTtlSeconds = 600;

k.api.get("token", () => {
  const userId = normalize(k.request.queryString.userId) || "member-1";
  const token = `rt-${k.security.shortGuid()}`;
  saveToken({
    token,
    userId,
    expiresAt: Math.floor(Date.now() / 1000) + tokenTtlSeconds,
  });
  return { success: true, token, userId };
});
```

WebSocket 端点必须使用 `ws://` 或 `wss://` 访问，不能用普通 `http://` fetch：

```ts
k.api.get("ws", () => {
  const token = normalize(k.request.queryString.token);
  const clientId = normalize(k.request.queryString.clientId) || "browser";
  const record = readToken(token);
  if (!record || record.expiresAt < Math.floor(Date.now() / 1000)) {
    return fail(401, "INVALID_TOKEN", "WebSocket token 无效或已过期。");
  }

  const connectionId = `${record.userId}__${clientId}`;

  k.net.webSocket.accept(connectionId, (frame) => {
    const message = JSON.parse(frame.text || "{}");
    if (!message.type || !message.requestId) {
      send(connectionId, {
        type: "error",
        code: "INVALID_MESSAGE",
        message: "消息必须包含 type 和 requestId。",
      });
      return;
    }

    if (message.type === "ping") {
      send(connectionId, { type: "pong", requestId: message.requestId });
    }
  });
});
```

服务端主动推送时，通过连接 ID 找到连接：

```ts
k.api.post("push", (body: { connectionId?: string; message?: string }) => {
  const conn = k.net.webSocket.get(normalize(body.connectionId));
  if (!conn) return fail(404, "CONNECTION_NOT_FOUND", "WebSocket 连接不存在或已关闭。");

  conn.sendText(JSON.stringify({
    type: "server.push",
    requestId: `push-${Date.now()}`,
    message: body.message,
  }));

  return { success: true };
});
```

## 消息格式

所有业务消息都应带 `type` 和 `requestId`：

```json
{
  "type": "task.start",
  "requestId": "req-20260609-001",
  "taskId": "export-orders"
}
```

推荐约定：

| 字段 | 说明 |
|------|------|
| `type` | 消息类型，例如 `ping`、`echo`、`task.start`、`task.progress` |
| `requestId` | 请求或动作 ID，用于去重、追踪和前端匹配响应 |
| `taskId` / `roomId` / `orderId` | 业务对象 ID |
| `payload` | 业务数据，避免把所有字段摊在顶层 |

客户端收到重复 `requestId` 或重复 `task.progress` 时应可幂等处理。服务端也要拒绝没有权限的 room、order、task 订阅。

## 前端连接

```html
<!-- @k-url /realtime -->
<script>
  async function connect() {
    const tokenData = await fetch("/api/realtime/token").then((response) => response.json());
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${protocol}//${location.host}/api/realtime/ws?token=${encodeURIComponent(tokenData.token)}&clientId=browser`
    );

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      // 根据 message.type 和 message.requestId 更新 UI
    });

    socket.addEventListener("close", () => {
      // 退避重连：先重新获取 token，再重新连接
    });
  }
</script>
```

重连不要无限紧密重试。建议按 1s、2s、5s、10s 退避，并在页面隐藏、用户退出登录、权限失效时停止重连。

## 相关

- [k.net.webSocket](/api/net/websocket)
- [会话、角色与权限](/guide/auth/sessions-and-roles)
- [业务日志与错误追踪](/guide/troubleshooting/business-logging)
- [统一 API 响应与错误结构](/guide/troubleshooting/api-error-contract)
