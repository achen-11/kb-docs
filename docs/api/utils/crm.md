# k.utils.CRM

> Kooboo CRM 客户与订单拉取

## 概述

`k.utils.CRM` 从 Kooboo CRM 接口按起始日期拉取数据（属性名 **`CRM`**，大小写敏感）。须配置有效的 `crmKey`。

## getCustomers()

```ts
const list = k.utils.CRM.getCustomers(startDate, crmKey)
```

**返回：** `CRMCustomer[]`。

## getOrders()

```ts
const orders = k.utils.CRM.getOrders(startDate, crmKey)
```

**返回：** `CRMOrder[]`。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `startDate` | `Date` | 是 | 起始日期，运行时会按本地时间提交 |
| `crmKey` | `string` | 是 | CRM 密钥 |

## 相关文档

- [k.utils 概述](./index.md)
