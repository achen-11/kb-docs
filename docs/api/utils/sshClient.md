# k.utils.sshClient

> SSH 命令执行

## 概述

`k.utils.sshClient` 建立 SSH 连接并在回调中执行命令。

## passwordConnect() / privateKeyConnect()

```ts
k.utils.sshClient.passwordConnect(host, user, password, (client) => {
    const output = client.runCommand("uname -a")
}, 30)
```

| 参数 | 说明 |
|------|------|
| `host` / `user` | 主机与用户名 |
| `password` 或 `privateKey` | 认证方式 |
| `callback` | 连接成功后执行 |
| `timeout` | 超时秒数，默认 30 |

## ConnectedClient.runCommand()

执行 shell 命令并返回输出字符串。

## 相关文档

- [k.utils.sftpClient](./sftpClient.md)
