# k.utils.compression

> Gzip decompression and ZIP packaging

## Overview

`k.utils.compression` handles Gzip and ZIP archives (memory or site file path).

## decompressGzip()

| Overload | illustrate |
|------|------|
| `decompressGzip(path)` | Read from site file path and unpack into string |
| `decompressGzipBinary(bytes)` | Decompress from byte array |

## zip()

| Overload | illustrate |
|------|------|
| `zip(items)` | `items` is `{ name, binary }[]`, returning ZIP bytes |
| `zip(folder, zipPath)` | Package the site directory and write it to `zipPath` |

## unzip()

| Overload | illustrate |
|------|------|
| `unzip(binary)` | Unzip to `ZipItem[]` (including `name`, `binary`) |
| `unzip(zipPath, folder)` | Unzip to site directory |

## Related Docs

- [k.file](../file/file.md)
