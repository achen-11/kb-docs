# k.net.DNS

> DNS lookups, reverse resolution, and Whois

## Overview

`k.net.DNS` provides host name resolution and email/domain name related record query. The attribute name is **`DNS`** (case sensitive).

## getIPs()

Resolve the hostname to get a list of IPs.

```ts
k.api.get("resolve", () => {
    const ips = k.net.DNS.getIPs("kooboo.com")
    return {
        count: ips ? ips.length : 0,
        first: ips && ips[0] ? ips[0].address : null
    }
})
```

| Overload | Description |
|------|------|
| `getIPs(host)` | Use system DNS |
| `getIPs(nsServer, host)` | Specify NS server to query A records |

**Returns:** `KIPAddress[]` or `null`

### KIPAddress

| Field/Method | Description |
|-------------|------|
| `address` | IP string |
| `isIP4` / `isIP6` | address family |
| `toIP4()` / `toIP6()` | mapped string |

## getMXs()

Query MX records.

| Overload | Description |
|------|------|
| `getMXs(host)` | Default parsing |
| `getMXs(nsServer, host)` | Specify NS |

**Returns:** `string[]` or `null`

## getNsServers()

Get the NS server list of the domain name.

```ts
const ns = k.net.DNS.getNsServers("kooboo.com")
```

## getReverseDNS()

Do reverse DNS on the IP.

```ts
const host = k.net.DNS.getReverseDNS("8.8.8.8")
```

## whoisInfo()

Returns the original Whois record text for a domain name.

```ts
const raw = k.net.DNS.whoisInfo("kooboo.com")
```

## Related Docs

- [k.net.IP](./ip.md) — IP geography (complementary to DNS resolution)
