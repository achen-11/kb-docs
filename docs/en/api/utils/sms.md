# k.utils.sms

> SMS sending (multi-provider)

## Overview

`k.utils.sms` Select provider by site **Console SMS Settings**. Templates and signatures must be configured on the corresponding platform.

| Property | Description |
|------|------|
| `aliSMS` | Alibaba Cloud SMS |
| `tencent` | Tencent Cloud SMS |
| `chinaMobile` | China Mobile |

## aliSMS

| Method | Description |
|------|------|
| `send(templateCode, phone, key, value)` | Single variable template |
| `send(templateCode, phone, bindings)` | multivariable dictionary |
| `sendInternational(...)` | International SMS |

## tencent

`send(templateId, phone, parameters)` — `parameters` is the template parameter object.

## chinaMobile

`send(phone, content)` or `send(phones[], content)`.

## Related Docs

- [k.utils Overview](./index.md)
