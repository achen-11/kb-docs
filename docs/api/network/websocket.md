# k.net.webSocket

> 将当前请求升级为 WebSocket 并管理连接

## 概述

通过 `k.net.webSocket`（运行时属性名，注意大小写）处理 WebSocket 连接。

## accept()

将当前请求转为 WebSocket，**阻塞**直到连接关闭。

| 参数 | 类型 | 说明 |
|------|------|------|
| id | `string` | 连接标识 |
| receive | `function` | 收到消息时的回调 |

```ts
k.api.get("ws", () => {
    k.net.webSocket.accept("user_1", (ctx) => {
        // ctx.text / ctx.binary
    })
})
```

## list() / get()

```ts
const ids = k.net.webSocket.list()
const conn = k.net.webSocket.get("user_1")
conn.sendText("hello")
conn.close()
```

## 相关文档

- [k.net.httpClient](./httpclient.md)
