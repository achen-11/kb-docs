# k.utils.uri

> URL parsing and query strings

## Overview

`k.utils.uri` provides `parse` and query parameter reading and writing; `parse` returns a `KUriBuilder` instance.

## parse()

```ts
const builder = k.utils.uri.parse("https://example.com/path?q=1")
builder.setQueryParam("page", "2")
const url = builder.toUri()
```

## Convenience method

| method | illustrate |
|------|------|
| `setQueryParam(uri, name, value)` | Set query parameters and return new URL string |
| `getQueryParam(uri, name)` | Read query parameters |

## KUriBuilder

| member | illustrate |
|------|------|
| `scheme` / `host` / `port` / `path` / `query` | URI components |
| `userName` / `password` | Credentials |
| `setQueryParam(name, value)` | Modify query string |
| `getQueryParam(name)` | Read query parameters |
| `toUri()` | Output full URL string |

## Related Docs

- [k.utils Overview](./index.md)
