# k.utils.IP

> IP geoinformation (same implementation as k.net.IP)

## Overview

`k.utils.IP` and [k.net.IP](../net/ip.md) use the same `KIP` implementation: read the current request IP or query IP geographical information. Attribute name **`IP`** (case sensitive).

| Entrance | Description |
|------|------|
| `k.utils.IP` | Access under tool namespace |
| `k.net.IP` | Access under network namespace |

## myIP

The client IP of the current request.

**Type:** `string`.

```ts
const ip = k.utils.IP.myIP
```

## getCity() / getCountry() / getCityOrCountry()

Pass in an IP string and return `IPInfo` (`city`, `state`, `countryCode`, `latitude`, `longitude`, etc.).

| Parameter | Type | Required | Description |
|------|------|------|------|
| `ipAddress` | `string` | Yes | IP address to query |

**Returns:** `IPInfo`.

```ts
const info = k.utils.IP.getCountry("8.8.8.8")
const city = k.utils.IP.getCity("8.8.8.8")
const best = k.utils.IP.getCityOrCountry("8.8.8.8")
```

See [k.net.IP](../net/ip.md) for complete field descriptions.

## Related Docs

- [k.net.IP](../net/ip.md)
