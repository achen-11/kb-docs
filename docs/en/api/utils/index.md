# k.utils

> KScript Toolset: Helper API by submodule

## Overview

`k.utils` aggregates commonly used tool methods and sub-objects in site scripts. Except for the **root method** listed below, each submodule corresponds to an independent documentation page (the path is consistent with the script attribute name, which facilitates alphabetical retrieval).

## root method

| method | illustrate |
|------|------|
| `sleep(ms)` | Blocks the current thread for specified milliseconds |
| `ping(host)` | ICMP ping, returns `{ ip, time, success }` |
| `bytesToString(bytes, encoding)` | Convert byte array to string according to encoding |
| `stringToBytes(content, encoding)` | Convert string to byte array according to encoding |

| Parameter | Type | Required | Description |
|------|------|------|------|
| `ms` | `number` | Yes | Sleep duration in milliseconds |
| `host` | `string` | Yes | Host name or IP to ping |
| `bytes` | `number[]` | Yes | Byte array to convert |
| `content` | `string` | Yes | Text to convert |
| `encoding` | `string` | Yes | Character encoding, such as `utf-8` |

| Method | Return |
|------|------|
| `sleep(ms)` | `void` |
| `ping(host)` | `{ ip: string, time: number, success: boolean }` |
| `bytesToString(bytes, encoding)` | `string` |
| `stringToBytes(content, encoding)` | `number[]` |

```ts
k.utils.sleep(100)
const result = k.utils.ping("kooboo.com")
```

Encoding conversion is useful when you work with downloaded files, ZIP entries, or text stored as bytes:

```ts
const bytes = k.utils.stringToBytes("Hello Kooboo", "utf-8")
k.file.writeBinary("exports/hello.txt", bytes)

const saved = k.file.readBinary("exports/hello.txt")
const text = k.utils.bytesToString(saved, "utf-8")

return { text }
```

## Submodules (alphabetical order)

| submodule | document |
|--------|------|
| `CDN` | [cdn](./cdn.md) |
| `clientJS` | [clientJS](./clientJS.md) |
| `community` | [community](./community.md) |
| `compression` | [compression](./compression.md) |
| `converter` | [converter](./converter.md) |
| `CRM` | [crm](./crm.md) |
| `date` | [date](./date.md) |
| `dom` | [dom](./dom.md) |
| `google` | [google](./google.md) |
| `image` | [image](./image.md) |
| `inlineHtml` | [inlineHtml](./inlineHtml.md) |
| `IP` | [ip](./ip.md) |
| `mime` | [mime](./mime.md) |
| `ninjible` | [ninjible](./ninjible.md) |
| `office` | [office](./office.md) |
| `puppeteer` | [puppeteer](./puppeteer.md) |
| `screenShot` | [screenShot](./screenShot.md) |
| `sftpClient` | [sftpClient](./sftpClient.md) |
| `sitemap` | [sitemap](./sitemap.md) |
| `sms` | [sms](./sms.md) |
| `sshClient` | [sshClient](./sshClient.md) |
| `string` | [string](./string.md) |
| `telnetClient` | [telnetClient](./telnetClient.md) |
| `template` | [template](./template.md) |
| `uri` | [uri](./uri.md) |
| `xml` | [xml](./xml.md) |

## Related Docs

- [k.net.IP](../net/ip.md) — Network module description when capabilities overlap with `k.utils.IP`
- [k.file](../file/file.md) — site file reading and writing
