# k.utils.compression

> Gzip 解压与 ZIP 打包

## 概述

`k.utils.compression` 处理 Gzip 与 ZIP 归档（内存或站点文件路径）。

## decompressGzip()

| 重载 | 说明 |
|------|------|
| `decompressGzip(path)` | 从站点文件路径读取并解压为字符串 |
| `decompressGzipBinary(bytes)` | 从字节数组解压 |

## zip()

| 重载 | 说明 |
|------|------|
| `zip(items)` | `items` 为 `{ name, binary }[]`，返回 ZIP 字节 |
| `zip(folder, zipPath)` | 将站点目录打包写入 `zipPath` |

## unzip()

| 重载 | 说明 |
|------|------|
| `unzip(binary)` | 解压为 `ZipItem[]`（含 `name`、`binary`） |
| `unzip(zipPath, folder)` | 解压到站点目录 |

## 相关文档

- [k.file](../file/file.md)
