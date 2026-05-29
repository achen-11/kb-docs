# k.utils.sftpClient

> SFTP 文件上传与下载

## 概述

连接方式与 [sshClient](./sshClient.md) 相同；回调内使用 `ConnectedClient`。

## passwordConnect() / privateKeyConnect()

## ConnectedClient

| 方法 | 说明 |
|------|------|
| `upload(data, path)` | 上传字节到远程路径 |
| `download(path)` | 下载远程文件为字节数组 |

## 相关文档

- [k.utils.sshClient](./sshClient.md)
