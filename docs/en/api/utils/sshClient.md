# k.utils.sshClient

> SSH command execution

## Overview

`k.utils.sshClient` Establishes an SSH connection and executes the command in the callback.

## passwordConnect() / privateKeyConnect()

```ts
k.utils.sshClient.passwordConnect(host, user, password, (client) => {
    const output = client.runCommand("uname -a")
}, 30)
```

| Parameter | Description |
|------|------|
| `host` / `user` | Host and username |
| `password` or `privateKey` | Authentication method |
| `callback` | Execute after successful connection |
| `timeout` | Timeout seconds, default 30 |

## ConnectedClient.runCommand()

Execute a shell command and return an output string.

## Related Docs

- [k.utils.sftpClient](./sftpClient.md)
