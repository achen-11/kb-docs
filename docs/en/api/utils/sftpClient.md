# k.utils.sftpClient

> SFTP file upload and download

## Overview

The connection method is the same as [sshClient](./sshClient.md); use `ConnectedClient` inside the callback.

## passwordConnect() / privateKeyConnect()

## ConnectedClient

| method | illustrate |
|------|------|
| `upload(data, path)` | Upload bytes to remote path |
| `download(path)` | Download remote file as byte array |

## Related Docs

- [k.utils.sshClient](./sshClient.md)
