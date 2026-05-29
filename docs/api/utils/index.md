# k.utils

> KScript 工具集：按子模块划分的辅助 API

## 概述

`k.utils` 聚合站点脚本常用的工具方法与子对象。除下文列出的**根方法**外，每个子模块对应独立文档页（路径与脚本属性名一致，便于按字母检索）。

## 根方法

| 方法 | 说明 |
|------|------|
| `sleep(ms)` | 阻塞当前线程指定毫秒 |
| `ping(host)` | ICMP ping，返回 `{ ip, time, success }` |
| `bytesToString(bytes, encoding)` | 字节数组按编码转字符串 |
| `stringToBytes(content, encoding)` | 字符串按编码转字节数组 |

```ts
k.utils.sleep(100)
const result = k.utils.ping("kooboo.com")
```

## 子模块（按字母序）

| 子模块 | 文档 |
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

## 相关文档

- [k.net.IP](../net/ip.md) — 与 `k.utils.IP` 能力重叠时的网络模块说明
- [k.file](../file/file.md) — 站点文件读写
