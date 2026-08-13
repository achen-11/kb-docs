# Console: Orders

> Review orders for the current organization, continue payment for incomplete orders, and choose a payment method at checkout.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Console** -> **Orders** |
| Order list | `/_Admin/kconsole/consoleOrder` |
| Checkout | `/_Admin/kconsole/checkOrder?orderId={orderId}` |
| Frontend routes | `/kconsole/consoleOrder` and `/kconsole/checkOrder` |
| Required role | Organization administrator |

Domain purchases and renewals, membership purchases, top-ups, and other paid workflows create orders for the current organization.

<DocImage src="/product/console/orders-overview.png" alt="Order list in Console with amounts and domains redacted" width="1120" />

## Order List

The page shows an order notice and a non-refundable reminder above the table.

| Column | Details |
|--------|---------|
| Line Title | Order title. |
| Total Amount | Total and currency. |
| Date | Creation time. |
| Type | Order type. |
| Is Paid | Payment status. |
| Is Delivered | Delivery status. |
| Pay | Available for an unpaid order that can still be paid. |

Order types include purchases, membership, bandwidth, services, servers, top-ups, API Market, Application Market, and renewals.

Selecting `Pay` opens:

```text
/_Admin/kconsole/checkOrder?orderId={orderId}
```

## Checkout

The left side contains the order summary and payment method; the right side contains the amount summary.

| Left-side area | Details |
|----------------|---------|
| Order title and Summary | Order description. |
| Payment Method | `Credit Card` and `Wechat Pay` tabs. |
| Saved cards | Shows card endings that can be selected directly. |
| Add card | Opens the credit-card form. |
| WeChat Pay QR code | Generated after switching to `Wechat Pay`; payment status is polled automatically. |

| Amount area | Details |
|-------------|---------|
| Order Summary | Order line items. |
| Subtotal | Subtotal before tax. |
| VAT | Tax. |
| Total | Final total and currency. |
| Submit Payment / Scan To Pay | Submits a card payment or prompts the user to scan the QR code. |

## Credit Card

To use a saved card, select it and choose `Submit Payment`.

To add a card, enter:

| Field | Details |
|-------|---------|
| Card Number | Card number. |
| Expiration Date | Month and year. |
| Name on Card | Cardholder name. |
| CVC | Security code. |

If the backend returns a redirect URL, the browser continues payment there. If payment succeeds without a redirect, Kooboo returns to the order list.

## WeChat Pay

Switch to `Wechat Pay` to generate a QR code. The page checks payment status once per second and returns to the order list after payment completes.

If the QR code does not update or the page does not redirect after payment, check whether the order is still unpaid in the order list, then reopen checkout.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Continue an unpaid order | Orders -> Pay -> checkout. |
| Pay after purchasing a domain | [Purchase a Domain](./domains.md#purchase-a-domain) -> checkout -> verify in Orders. |
| Pay after adding funds | [Balance](./balance.md#add-funds) -> checkout -> verify in Balance. |
| Pay after purchasing membership | [Membership](./membership.md) -> checkout -> verify in Membership. |

## Balance, Orders, and Renewals

| Page | Responsibility |
|------|----------------|
| [Balance](./balance.md) | Starts top-ups and shows transactions. |
| Orders | Shows orders and payment status. |
| [Renewals](./renewals.md) | Finds expiring items and creates renewal orders. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Console Overview](../console.md) | Console navigation map. |
| [Balance](./balance.md) | Top-up entry point. |
| [Renewals](./renewals.md) | Renewal entry point. |
