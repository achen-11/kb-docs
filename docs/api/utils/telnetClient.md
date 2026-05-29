# k.utils.telnetClient

> Telnet 会话

## 概述

`k.utils.telnetClient.connect` 建立 Telnet 连接，在回调中读写终端。

## connect()

```ts
k.utils.telnetClient.connect(host, port, (client) => {
    client.writeLine("help")
    const text = client.read(10)
}, 30)
```

## ConnectedClient

| 方法 | 说明 |
|------|------|
| `write` / `writeLine` | 发送命令 |
| `read(timeout?)` | 读取输出 |
| `terminatedRead(terminator, timeout?)` | 读到终止符 |

## 相关文档

- [k.utils 概述](./index.md)
