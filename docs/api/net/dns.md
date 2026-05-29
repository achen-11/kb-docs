# k.net.DNS

> DNS 查询、反向解析与 Whois

## 概述

`k.net.DNS` 提供主机名解析与邮件/域名相关记录查询。属性名为 **`DNS`**（大小写敏感）。

## getIPs()

解析主机名得到 IP 列表。

```ts
k.api.get("resolve", () => {
    const ips = k.net.DNS.getIPs("kooboo.com")
    return {
        count: ips ? ips.length : 0,
        first: ips && ips[0] ? ips[0].address : null
    }
})
```

| 重载 | 说明 |
|------|------|
| `getIPs(host)` | 使用系统 DNS |
| `getIPs(nsServer, host)` | 指定 NS 服务器查询 A 记录 |

**返回：** `KIPAddress[]` 或 `null`

### KIPAddress

| 字段 / 方法 | 说明 |
|-------------|------|
| `address` | IP 字符串 |
| `isIP4` / `isIP6` | 地址族 |
| `toIP4()` / `toIP6()` | 映射后的字符串 |

## getMXs()

查询 MX 记录。

| 重载 | 说明 |
|------|------|
| `getMXs(host)` | 默认解析 |
| `getMXs(nsServer, host)` | 指定 NS |

**返回：** `string[]` 或 `null`

## getNsServers()

获取域名的 NS 服务器列表。

```ts
const ns = k.net.DNS.getNsServers("kooboo.com")
```

## getReverseDNS()

对 IP 做反向 DNS。

```ts
const host = k.net.DNS.getReverseDNS("8.8.8.8")
```

## whoisInfo()

返回域名的 Whois 原始记录文本。

```ts
const raw = k.net.DNS.whoisInfo("kooboo.com")
```

## 相关文档

- [k.net.IP](./ip.md) — IP 地理信息（与 DNS 解析互补）
