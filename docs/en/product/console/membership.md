# Console: Membership

> Review the current organization's membership plan, purchase or renew membership, and continue to checkout.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Console** -> **Membership** |
| Direct URL | `/_Admin/kconsole/member` |
| Frontend route | `/kconsole/member` |
| Required role | Organization administrator |

Membership belongs to the current organization. Switching organizations changes the plan, package state, and related orders displayed here.

<DocImage src="/product/console/membership-overview.png" alt="Membership packages and the current plan in Console" width="1120" />

## Current Plan

When a plan is active, the page shows:

| Item | Details |
|------|---------|
| Current Plan | Current membership plan. |
| Expired At | Expiration time. |
| Renew | Creates a renewal order for the current membership level. |

If the organization is a Partner or has a service level above standard membership, the page shows Partner guidance instead of the normal purchase flow.

## Package Cards

| Area | Details |
|------|---------|
| Title and Headline | Package name and summary. |
| Price | Currency, price, and monthly or annual period. |
| Purchase Now | Creates a membership purchase order. |
| In Use | Identifies the current package; the action is disabled. |
| Feature list | Online features included in the package. |

Selecting `Purchase Now` or `Renew` creates an order and opens:

```text
/_Admin/kconsole/checkOrder?orderId={orderId}
```

See [Orders: Checkout](./orders.md#checkout) for payment.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Review membership | Membership -> review Current Plan and Expired At. |
| Purchase for the first time | Membership -> select a package -> Purchase Now -> checkout. |
| Renew the current plan | Membership -> Renew -> checkout. |
| Verify the order | Membership -> checkout -> [Orders](./orders.md). |

## Membership vs. Renewals

| Membership | Renewals |
|------------|----------|
| Shows package details and creates purchase or renewal orders. | Collects expiring domain and membership items. |
| Purchase and renewal actions create orders. | Selecting a membership renewal returns to Membership. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Console Overview](../console.md) | Console navigation map. |
| [Renewals](./renewals.md) | Domain and membership renewal items. |
| [Orders](./orders.md) | Checkout after purchasing membership. |
