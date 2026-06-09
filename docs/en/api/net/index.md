# k.net

> Outbound HTTP, WebSocket, DNS and IP geolocation

## Overview

`k.net` provides network-related capabilities in site scripts, divided by sub-modules:

| submodule | path | Purpose |
|--------|------|------|
| [httpClient](./httpclient.md) | `k.net.httpClient` | Recommended: proxy forwarding, JSON/form/multipart, `send` unified request |
| [url](./url.md) | `k.net.url` | Simple synchronization HTTP; suitable for quickly pulling binaries (such as images) |
| [webSocket](./websocket.md) | `k.net.webSocket` | Upgrade the current request to WebSocket and manage the connection |
| [DNS](./dns.md) | `k.net.DNS` | Parse A/MX/NS, reverse DNS, Whois (note case) |
| [IP](./ip.md) | `k.net.IP` | Current request IP, IP geographic information (note case) |

::: tip selection: httpClient and url
| scene | suggestion |
|------|------|
| API proxy, with custom Header/Body, multipart upload | **`k.net.httpClient`** |
| Batch download, need `KHttpResponse.save` to download | **`k.net.httpClient`** (including batch) |
| Fast GET remote **image/file binary** | **`k.net.url.getAsBinary(url)`** |
| One line GET string or JSON | `k.net.url.get` / `k.net.url.getJson` |

ICMP probes use **`k.utils.ping`** (not under `k.net`). SSH/SFTP/Telnet see **`k.utils`** (document to be added).
:::

## Related Docs

- [k.file](../file/file.md) — site disk file (different from outbound HTTP)
- [k.request](../request/) — Current inbound request
