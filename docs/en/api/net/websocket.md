# k.net.webSocket

> Upgrade current requests to WebSocket and manage intrasite connections

## Overview

Handle WebSocket via `k.net.webSocket` (note the case of **webSocket**): upgrade the connection via `accept` on the current API request, or send a message to an existing connection via `get`.

The client must use **`ws://` or `wss://`** to access the corresponding API address, otherwise an error will be reported.

## accept()

Upgrade the current HTTP request to a WebSocket and block the current script until the connection is closed (commonly used with private WS endpoints).

| Parameter | Type | Description |
|------|------|------|
| `id` | `string` | Connection ID, unique within the same site, for use by `get` / `list` |
| `receive` | `function` | Message callback received, parameter `ctx` contains `text` / `binary` |

```ts
k.api.get("ws", () => {
    k.net.webSocket.accept("user_1", (ctx) => {
        if (ctx.text) {
            // Handle text frame
        }
        if (ctx.binary) {
            // Handle binary frame
        }
    })
})
```

Subject to site WebSocket configuration restrictions (maximum number of connections, sending and receiving size, timeout, etc.), an exception will be thrown if the limit is exceeded.

## list()

Returns the list of registered connection ids for the current site.

```ts
const ids = k.net.webSocket.list()
```

## get()

Get the connection by id for active push by the server.

```ts
const conn = k.net.webSocket.get("user_1")
if (conn) {
    conn.sendText("hello")
    conn.sendBinary([1, 2, 3])
    conn.close()
}
```

| Method | Description |
|------|------|
| `sendText(text, callback?)` | Send text frame |
| `sendBinary(bytes, callback?)` | Send binary frame |
| `close(status?, description?)` | close connection |

## Related Docs

- [k.net Overview](./index.md)
- [k.net.httpClient](./httpclient.md)
