# k.utils.sms

> 短信发送（多提供商）

## 概述

`k.utils.sms` 按站点**控制台 SMS 设置**选择提供商。须在对应平台配置模板与签名。

| 属性 | 说明 |
|------|------|
| `aliSMS` | 阿里云短信 |
| `tencent` | 腾讯云短信 |
| `chinaMobile` | 中国移动 |

## aliSMS

| 方法 | 说明 |
|------|------|
| `send(templateCode, phone, key, value)` | 单变量模板 |
| `send(templateCode, phone, bindings)` | 多变量字典 |
| `sendInternational(...)` | 国际短信 |

## tencent

`send(templateId, phone, parameters)` — `parameters` 为模板参数对象。

## chinaMobile

`send(phone, content)` 或 `send(phones[], content)`。

## 相关文档

- [k.utils 概述](./index.md)
