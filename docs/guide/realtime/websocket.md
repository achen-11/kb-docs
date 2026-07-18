# WebSocket 实时客服

> WebSocket 最直观的用途，是让两个在线客户端在不刷新页面的情况下实时收发消息。本实践以“访客咨询、客服回复”为主线，完整展示短期 token、房间隔离、消息广播、心跳、断线重连和服务端主动推送。

## 先体验这个场景

案例页同时打开两个真实 WebSocket 客户端：

- **林晓 · 访客端**：发送产品咨询；
- **客服小周 · 客服端**：实时收到问题并回复；
- 两个连接加入同一个 `support-demo` 房间；
- 任一端发送消息后，服务端把标准消息广播给房间内所有在线连接；
- 页面只渲染一次相同的 `messageId`，避免发送端和接收端重复显示；
- token、connectionId、心跳延迟、断线与协议事件放在“连接详情”中，不干扰主要对话。

为了在一个页面中直观看到消息从一端到达另一端，演示站点同时创建访客和客服连接。真实项目中，这两个连接通常来自不同用户的浏览器、App 或客服工作台。

## 什么时候使用 WebSocket

适合 WebSocket 的共同特征是：连接需要保持，服务端需要主动推送，而且用户能够感知延迟。

- 在线客服、站内聊天、群组消息；
- 协作编辑、在线状态、输入中提示；
- 订单、审批、工单等状态变化提醒；
- 导入、导出、AI 生成、报表等长任务进度。

普通 CRUD、搜索、分页、表单提交仍然优先使用 HTTP API。创建订单用 HTTP，订单状态变化再通过 WebSocket 通知，通常比“所有操作都走长连接”更清晰。

## 会话如何建立

```text
访客页面 / 客服工作台
        ↓
HTTP 获取绑定用户、角色和房间的短期 token
        ↓
WebSocket 连接 /api/realtime/ws?token=...&clientId=...
        ↓
服务端校验 token，生成 connectionId 并 accept
        ↓
客户端发送 chat.send / chat.typing / ping
        ↓
服务端按 roomId 广播 chat.message / chat.typing
        ↓
连接中断后重新获取 token，并按 1s、2s、5s、10s 退避重连
```

连接 ID 使用：

```text
support-demo__visitor-1__visitor-browser-1783670000000
```

它由 `roomId`、服务端确认的 `userId` 和当前设备的 `clientId` 组成。前端可以提供 `clientId` 区分浏览器或设备，但不能自行声明“我是客服”或“我属于另一个房间”。

## 能力拆解

| 层级 | 在实时客服中的职责 | 相关文档 |
|------|--------------------|----------|
| WebSocket API | 接受连接、接收帧、向一个连接或房间广播 | [k.net.webSocket](/api/net/websocket) |
| Token / Session | 在握手前确认用户、角色、房间和过期时间 | [k.session](/api/session/) · [k.security](/api/security/) |
| HTTP API | 签发短期 token、读取历史、服务端主动 push | [k.api](/api/api/) |
| KeyValue / Logger | 演示消息历史、连接资料和关键事件 | [k.DB.keyValue](/api/key-value/) · [k.logger](/api/logger/) |

## 签发房间绑定的短期 token

案例站点把 `userId`、`displayName`、`role` 和 `roomId` 写入服务端 token 记录。token 是一次性握手凭证：成功建立连接后立即删除；签发新 token 前同时清理过期记录，避免刷新和重连让临时凭证无限累积。

```ts
const tokenTtlSeconds = 600;

k.api.get("token", () => {
  const userId = safeSegment(k.request.queryString.userId, "member-1");
  const displayName = normalize(k.request.queryString.displayName) || "Demo Member";
  const requestedRole = safeSegment(k.request.queryString.role, "member");
  const role = requestedRole === "agent"
    ? "agent"
    : requestedRole === "visitor" ? "visitor" : "member";
  const roomId = safeSegment(k.request.queryString.roomId, "support-demo");
  const token = `rt-${k.security.shortGuid()}`;
  const tokens = pruneTokens(readJson(tokensKey, {}));

  tokens[token] = {
    token,
    userId,
    displayName,
    role,
    roomId,
    issuedAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + tokenTtlSeconds,
  };
  writeJson(tokensKey, tokens);

  return {
    success: true,
    token,
    userId,
    displayName,
    role,
    roomId,
    expiresAt: tokens[token].expiresAt,
  };
});
```

演示页允许通过 query 参数选择两个固定身份，是为了展示双端通信。生产项目应先读取当前登录用户和业务权限，再由服务端决定 `userId`、`role` 与可加入的 `roomId`，不能直接信任请求参数。

## 握手与服务端身份

WebSocket 端点只能通过 `ws://` 或 `wss://` 连接。服务端在 `accept()` 前校验 token，并从 token 记录生成连接 ID：

```ts
k.api.get("ws", () => {
  const token = normalize(k.request.queryString.token);
  const clientId = safeSegment(k.request.queryString.clientId, "browser");
  const record = readToken(token);

  if (!record || record.expiresAt < Math.floor(Date.now() / 1000)) {
    return fail(401, "INVALID_TOKEN", "WebSocket token 无效或已过期。");
  }

  const connectionId = `${record.roomId}__${record.userId}__${clientId}`;

  delete tokens[token];
  writeJson(tokensKey, tokens);

  k.net.webSocket.accept(connectionId, (frame) => {
    const message = parseMessage(frame.text);
    // senderId、senderName、role、roomId 始终使用 record 中的值
  });
});
```

这是实时权限的第一道边界：即使客户端在消息中伪造 `senderName: "管理员"` 或 `role: "agent"`，服务端广播的标准消息仍然使用 token 绑定的身份。

## 从 `chat.send` 到 `chat.message`

访客发送的客户端帧只需要动作 ID、消息 ID 和正文：

```json
{
  "type": "chat.send",
  "requestId": "chat-visitor-001",
  "messageId": "message-visitor-001",
  "text": "你好，我想了解 WebSocket 如何用于在线客服。"
}
```

服务端完成四件事：

1. 校验 `type` 和 `requestId`；
2. 拒绝空消息以及超过 500 个字符的正文；
3. 使用 token 中的用户和房间信息生成标准消息；
4. 只向当前房间的在线连接广播 `chat.message`。

```ts
if (message.type === "chat.send") {
  const text = normalize(message.text);
  if (!text) return sendError(connectionId, requestId, "EMPTY_MESSAGE", "请输入消息内容。");
  if (text.length > 500) {
    return sendError(connectionId, requestId, "MESSAGE_TOO_LONG", "消息不能超过 500 个字符。");
  }

  const saved = appendRoomMessage(record.roomId, {
    id: safeSegment(message.messageId, `message-${k.security.shortGuid()}`),
    requestId,
    roomId: record.roomId,
    senderId: record.userId,
    senderName: record.displayName,
    role: record.role,
    text,
    sentAt: new Date().toISOString(),
  });

  broadcastRoom(record.roomId, {
    type: "chat.message",
    requestId,
    message: saved.message,
  });
}
```

接收端得到的是服务端规范化后的消息：

```json
{
  "type": "chat.message",
  "requestId": "chat-visitor-001",
  "message": {
    "id": "message-visitor-001",
    "roomId": "support-demo",
    "senderId": "visitor-1",
    "senderName": "林晓",
    "role": "visitor",
    "text": "你好，我想了解 WebSocket 如何用于在线客服。",
    "sentAt": "2026-07-10T08:00:00.000Z"
  }
}
```

发送端也会收到这条标准消息。前端应按 `message.id` 去重，而不是先乐观插入一条本地消息、收到广播后再显示第二条。

## 房间广播与在线状态

案例站点通过连接 ID 前缀筛选同一房间的实时连接：

```ts
function roomConnections(roomId: string) {
  const prefix = `${roomId}__`;
  const listed = k.net.webSocket.list() || [];
  const result = [];
  for (let index = 0; index < listed.length; index += 1) {
    const connectionId = String(listed[index]);
    if (connectionId.indexOf(prefix) === 0) result.push(connectionId);
  }
  return result;
}

function broadcastRoom(roomId: string, payload: unknown) {
  for (const connectionId of roomConnections(roomId)) {
    const connection = k.net.webSocket.get(connectionId);
    if (connection) connection.sendText(JSON.stringify(payload));
  }
}
```

这足以演示单站点内的实时房间广播。生产项目还要根据业务规模选择消息存储、离线消息、跨实例广播、已读游标和推送通知方案，不能把 `k.net.webSocket.list()` 当成永久在线记录。

案例使用 KeyValue 保存最近 50 条消息，只用于刷新后回看和验证消息格式。正式聊天记录应写入适合查询、分页、审计和数据生命周期管理的持久化存储。

演示页的“重置会话”会先关闭当前站点的 live WebSocket connections，再清理 token、连接资料、消息和事件。只清数据不关连接会留下幽灵在线状态，也会污染下一轮验证。

## 输入中、心跳与服务端推送

聊天消息之外，仍然使用同一套 `type + requestId` 协议：

| 类型 | 方向 | 用途 |
|------|------|------|
| `chat.typing` | 客户端 → 房间其他连接 | 短暂显示“正在输入”，不写入消息历史 |
| `ping` / `pong` | 客户端 ↔ 服务端 | 判断连接仍可用并测量近似往返时间 |
| `presence.get` / `presence.sync` | 客户端 ↔ 服务端 | 获取当前房间的在线连接快照 |
| `server.push` | HTTP 服务端逻辑 → 指定连接 | 演示订单、工单或系统通知主动到达 |
| `close` / `closing` | 客户端 ↔ 服务端 | 明确关闭原因并完成可观察的断开流程 |

案例页每 25 秒发送一次心跳，也允许在连接详情中手动发送。心跳不应过于频繁；具体间隔要结合代理超时、移动网络、电量和服务端连接成本确定。

服务端主动推送通过 `connectionId` 找到连接：

```ts
k.api.post("push", (body: { connectionId?: string; message?: string }) => {
  const connectionId = normalize(body.connectionId);
  const connection = k.net.webSocket.get(connectionId);
  if (!connection) {
    return fail(404, "CONNECTION_NOT_FOUND", "WebSocket 连接不存在或已关闭。");
  }

  connection.sendText(JSON.stringify({
    type: "server.push",
    requestId: `push-${Date.now()}`,
    message: normalize(body.message),
  }));

  return { success: true, connectionId };
});
```

业务 API、后台任务或状态机可以调用同样的推送逻辑，但必须再次校验接收者是否有权看到该业务对象。

## 前端连接与重连

客户端先通过 HTTP 获取 token，再创建 WebSocket：

```html
<script>
  async function connectClient(client) {
    const token = await fetch(
      `/api/realtime/token?userId=${encodeURIComponent(client.userId)}`
      + `&displayName=${encodeURIComponent(client.displayName)}`
      + `&role=${encodeURIComponent(client.role)}`
      + `&roomId=${encodeURIComponent(client.roomId)}`
    ).then((response) => response.json());

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${protocol}//${location.host}/api/realtime/ws`
      + `?token=${encodeURIComponent(token.token)}`
      + `&clientId=${encodeURIComponent(client.clientId)}`
    );

    socket.addEventListener("message", (event) => {
      const frame = JSON.parse(event.data);
      if (frame.type === "chat.message") appendMessage(frame.message);
    });
  }
</script>
```

连接意外关闭时，案例按 1 秒、2 秒、5 秒、10 秒退避。当前 localkooboo 环境已验证的浏览器恢复方式是刷新页面、重新获取两个一次性 token，再恢复消息历史；连接详情中的按钮因此明确写为“刷新并重连”，不会把同一页面内被平台拒绝的二次握手包装成成功能力。

如果部署环境已经验证支持同一浏览器会话直接重新握手，可以只重建 socket，不必刷新整页；无论采用哪种方式，都要重新获取 token、恢复订阅和补拉历史。演示页还会按顺序为访客和客服签发 token，避免用一个共享 KeyValue JSON 做并发写入；生产项目应改用数据库、缓存或其他具备并发控制的凭证存储。

重连还要注意：

- 用户主动退出、手动断开或页面进入永久离线状态时停止重试；
- 同一客户端只能有一个重连计时器，避免同时创建多个连接；
- 重连或刷新成功后重新订阅房间、补拉缺失消息或状态快照；
- 页面隐藏时可以降低心跳和重连频率；
- 服务端返回鉴权失败时，不要无限重试，应回到登录或权限恢复流程。

## 安全与失败处理

### 握手失败

- token 缺失、过期或已撤销：返回 `INVALID_TOKEN`，不要 `accept()`；
- token 已被一次成功握手消费：再次使用同样返回 `INVALID_TOKEN`；
- 用户无权加入房间：返回 `ROOM_FORBIDDEN`；
- `clientId` 只用于区分设备，必须清洗长度和字符范围。

### 消息失败

- 缺少 `type` 或 `requestId`：返回 `INVALID_MESSAGE`；
- 空消息：返回 `EMPTY_MESSAGE`；
- 正文超长：返回 `MESSAGE_TOO_LONG`；
- 未知类型：返回 `UNKNOWN_MESSAGE_TYPE`；
- 重复 `messageId`：返回幂等确认，不能重复写入和广播。

### 权限边界

- 发送者身份、角色和房间必须来自服务端 token 或当前 session；
- 每次订阅或发送业务对象时重新校验权限，不要只在握手时检查一次；
- 不要把敏感信息写入 token query、协议日志或浏览器错误提示；
- 服务端 push 也要检查接收连接与业务对象的关系。

### 资源边界

- 限制单条消息大小、发送频率、房间人数和每个用户的连接数；
- 为慢客户端设置发送队列上限，避免内存持续增长；
- 记录握手失败、异常关闭、消息拒绝和重连次数；
- 对聊天历史设置保留周期、删除策略和审计权限。

## 上线前检查

- [ ] token 有短期过期时间，并绑定用户、角色与房间；
- [ ] 握手失败发生在 `accept()` 之前；
- [ ] 发送者身份不来自客户端消息正文；
- [ ] 房间广播不会跨租户、跨组织或跨会话；
- [ ] `messageId` 和 `requestId` 可用于去重与追踪；
- [ ] 空消息、超长消息、未知类型和无权限订阅均有明确错误；
- [ ] 心跳、异常关闭、手动关闭和退避重连都能观察；
- [ ] 重连后能够补拉历史或状态快照；
- [ ] 服务端主动 push 会再次校验接收权限；
- [ ] 消息存储、离线消息、已读状态和跨实例广播已有生产方案。

## 相关

- [k.net.webSocket](/api/net/websocket)
- [会话、角色与权限](/guide/auth/sessions-and-roles)
- [访问控制](/guide/security/access-control)
- [业务日志与错误追踪](/guide/troubleshooting/business-logging)
- [统一 API 响应与错误结构](/guide/troubleshooting/api-error-contract)
