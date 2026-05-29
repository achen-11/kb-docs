# k.utils.IP

> IP 地理信息（与 k.net.IP 相同实现）

## 概述

`k.utils.IP` 与 [k.net.IP](../net/ip.md) 使用同一 `KIP` 实现：读取当前请求 IP 或查询 IP 地理信息。属性名 **`IP`**（大小写敏感）。

| 入口 | 说明 |
|------|------|
| `k.utils.IP` | 工具命名空间下访问 |
| `k.net.IP` | 网络命名空间下访问 |

## myIP

当前请求的客户端 IP。

## getCity() / getCountry() / getCityOrCountry()

传入 IP 字符串，返回 `IPInfo`（`city`、`state`、`countryCode`、`latitude`、`longitude` 等）。

```ts
const info = k.utils.IP.getCountry("8.8.8.8")
```

完整字段说明见 [k.net.IP](../net/ip.md)。

## 相关文档

- [k.net.IP](../net/ip.md)
