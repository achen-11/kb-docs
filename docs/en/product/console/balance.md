# Console: Balance

> Review the current organization's balance and recent transactions, and create a top-up order.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Console** -> **Balance** |
| Direct URL | `/_Admin/kconsole/balance` |
| Frontend route | `/kconsole/balance` |
| Required role | Organization administrator |

Balance data belongs to the current organization. Switching organizations changes the balance, transactions, and orders shown on the page.

<DocImage src="/product/console/balance-overview.png" alt="Console balance and recent transactions with amounts redacted" width="1120" />

## Current Balance

The summary above the table shows:

| Area | Details |
|------|---------|
| Current Balance | Available balance. |
| Currency | Currency used by the balance. |
| Recharge | Opens the top-up dialog. |

Check the balance before purchasing a domain, renewing membership, or using paid online AI capabilities.

## Recent Transactions

| Column | Details |
|--------|---------|
| Name | Transaction description. |
| Date | Transaction time. |
| Direction | Credit or debit. |
| Amount | Transaction amount. |

`Direction` uses an icon to distinguish credits from debits. To investigate a charge, locate it by date and amount, then verify the corresponding status under [Orders](./orders.md).

## Add Funds

Select `Recharge` to open the top-up dialog.

| Field | Details |
|-------|---------|
| Amount | Top-up amount; defaults to `50`. |
| Currency | Current balance currency; read-only. |
| Recharge | Validates the amount and creates a top-up order. |

After confirmation, Kooboo opens:

```text
/_Admin/kconsole/checkOrder?orderId={orderId}
```

Choose credit card or WeChat Pay on the [Orders checkout page](./orders.md#checkout).

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Add funds | Balance -> Recharge -> enter an amount -> pay at checkout. |
| Investigate a charge | Balance -> recent transactions -> verify the matching order. |
| Prepare to use AI | Balance -> [AI Configuration](./ai-config.md) -> [CMS: AI Service](/en/cms/settings/ai-service.md) |
| Prepare to purchase a domain | Balance -> [Domains](./domains.md#purchase-a-domain) |

## Balance Page vs. Top-up Panel

| Top-up panel in the header | Balance page |
|----------------------------|--------------|
| Quickly shows balance and upcoming domain or membership expiration. | Shows the current balance and recent transactions. |
| Convenient for a quick top-up or renewal reminder. | Better for billing reconciliation. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Console Overview](../console.md) | Console navigation map. |
| [Orders](./orders.md) | Payment and order status after a top-up. |
| [Renewals](./renewals.md) | Items that require renewal. |
