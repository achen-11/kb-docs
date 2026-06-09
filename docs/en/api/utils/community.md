# k.utils.community

> Kooboo community resource sharing and search

## Overview

`k.utils.community` Upload/search/download shared packages (templates, modules, etc., distinguished by `type`) to the Kooboo community.

## shareBinary() / share()

Upload resources: `shareBinary` uses byte array; `share` uses Base64 string.

## search()

| Overload | illustrate |
|------|------|
| `search(type)` | List by type |
| `search(type, keyword, skip, count)` | Keyword page search |

## downloadFile()

Press `packageUrl` to download the package bytes.

## delete()

Delete community entry by Id.

## Related Docs

- [k.utils Overview](./index.md)
