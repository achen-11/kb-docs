# Console: Renewals

> Review domains and membership items that require renewal, filter them by type, and enter the appropriate renewal workflow.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Console** -> **Renewals** |
| Direct URL | `/_Admin/kconsole/renew` |
| Frontend route | `/kconsole/renew` |
| Required role | Organization administrator |

This page does not process payment directly. It finds renewal items and opens either the domain renewal dialog or the Membership page.

<DocImage src="/product/console/renewals-overview.png" alt="Renewal list in Console with amounts and domains redacted" width="1120" />

## Filters

| Filter | Details |
|--------|---------|
| All | Shows all renewal items. |
| Domain Renew | Shows only domains. |
| Membership Renew | Shows only membership items. |

The frontend contains handling for an Application type, but the standard interface currently exposes only domain and membership filters.

## Renewal List

| Column | Details |
|--------|---------|
| Item | Item type and name. |
| Status | Normal or Expired. |
| Expire Date | Expiration date. |
| Charge Period | Billing period in years or months. |
| Renew Price | Price and currency. |
| Renew Now | Opens the relevant renewal workflow. |

The status is derived from `expiredIn`: a time before now is Expired; otherwise it is Normal.

## Renew a Domain

Select `Renew Now` for a domain.

| Field | Details |
|-------|---------|
| Domain | Current domain; read-only. |
| Period | Renewal period from 1 to 10 years. |
| OK | Creates the domain renewal order. |

Kooboo then opens [Orders: Checkout](./orders.md#checkout).

## Renew Membership

Selecting `Renew Now` for membership opens:

```text
/_Admin/kconsole/member
```

Review the current plan and package on [Membership](./membership.md), then create the renewal order.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Review all expiring items | Renewals -> All. |
| Renew only domains | Renewals -> Domain Renew -> Renew Now -> checkout. |
| Renew only membership | Renewals -> Membership Renew -> Membership -> checkout. |
| Verify after payment | Orders -> Renewals -> confirm the item status. |

## Renewals vs. Orders

| Renewals | Orders |
|----------|--------|
| Finds expiring items and creates renewal orders. | Shows whether created orders have been paid and delivered. |
| Organized around expiring items. | Organized around orders that already exist. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Console Overview](../console.md) | Console navigation map. |
| [Domains](./domains.md) | Domain management and domain renewal entry points. |
| [Membership](./membership.md) | Membership renewal entry point. |
| [Orders](./orders.md) | Checkout after creating a renewal order. |
