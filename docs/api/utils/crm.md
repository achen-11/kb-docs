# k.utils.CRM

> Kooboo CRM 客户与订单拉取

## 概述

`k.utils.CRM` 从 Kooboo CRM 接口按起始日期拉取数据（属性名 **`CRM`**，大小写敏感）。须配置有效的 `crmKey`。

## getCustomers()

```ts
const list = k.utils.CRM.getCustomers(startDate, crmKey)
```

## getOrders()

```ts
const orders = k.utils.CRM.getOrders(startDate, crmKey)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `startDate` | `DateTime` | 起始日期 |
| `crmKey` | `string` | CRM 密钥 |

## 相关文档

- [k.utils 概述](./index.md)
