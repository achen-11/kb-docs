# k.utils.community

> Kooboo 社区资源分享与搜索

## 概述

`k.utils.community` 向 Kooboo 社区上传/搜索/下载共享包（模板、模块等，由 `type` 区分）。

## shareBinary() / share()

上传资源：`shareBinary` 使用字节数组；`share` 使用 Base64 字符串。

## search()

| 重载 | 说明 |
|------|------|
| `search(type)` | 按类型列出 |
| `search(type, keyword, skip, count)` | 关键字分页搜索 |

## downloadFile()

按 `packageUrl` 下载包字节。

## delete()

按 Id 删除社区条目。

## 相关文档

- [k.utils 概述](./index.md)
