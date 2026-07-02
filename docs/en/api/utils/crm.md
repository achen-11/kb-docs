# k.utils.CRM

> Kooboo CRM customer and order pulling

## Overview

`k.utils.CRM` pulls data from the Kooboo CRM interface by start date (attribute name **`CRM`**, case sensitive). A valid `crmKey` must be configured.

## getCustomers()

```ts
const list = k.utils.CRM.getCustomers(startDate, crmKey)
```

**Returns:** `CRMCustomer[]`.

## getOrders()

```ts
const orders = k.utils.CRM.getOrders(startDate, crmKey)
```

**Returns:** `CRMOrder[]`.

| Parameter | Type | Required | Description |
|------|------|------|------|
| `startDate` | `Date` | Yes | Start date; submitted as local time |
| `crmKey` | `string` | Yes | CRM key |

## Related Docs

- [k.utils Overview](./index.md)
