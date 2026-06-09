# Integrations · Payment

> Group: **Payment**  
> Deep link: `/_Admin/system/config?SiteId={siteGuid}&group=Payment`

The **Payment** group enables and configures **payment channels**: merchant keys, callbacks, certificates. After save, Code and Commerce call **`k.payment.get('…')`** or properties like **`k.payment.alipayForm`**; item **names** must match API property names.

<DocImage src="/cms/settings/settings-integrations-payment.png" alt="Payment group (sensitive fields redacted in doc image)" width="1120" />

List **Value** column may show JSON summaries; doc image redacts secrets—your admin shows your site config.

## Items and API Docs

| Name (list) | Script entry (example) | API doc |
|-------------|------------------------|---------|
| **Alipay** | `k.payment.alipayForm` / `alipayH5` / `alipayApp` | [Alipay](/en/api/payment/alipay.md) |
| **WeChatV3** | `k.payment.wechat` / `weChatH5` / `wechatJsApi` | [WeChat Pay](/en/api/payment/wechat.md) |
| **Paypal** | `k.payment.paypalCheckout` | [PayPal](/en/api/payment/paypal.md) |
| **PaypalForm** | `k.payment.paypalForm` | [PayPal](/en/api/payment/paypal.md) |
| **StripePayment** | `k.payment.stripeCheckout` / `stripe` | [Stripe](/en/api/payment/stripe.md) |
| **SquarePay** | `k.payment.square` | [Square](/en/api/payment/square.md) |
| **Paynl** | `k.payment.paynlCheckout` | [Pay.NL](/en/api/payment/paynl.md) |
| **TwoCheckout** | `k.payment.twoCheckout` | [TwoCheckout](/en/api/payment/two-checkout.md) |
| **MoneyBoxs** | `k.payment.moneyBoxs` | [MoneyBoxs](/en/api/payment/moneyboxs.md) |

Full capabilities and `charge()` flow: [k.payment overview](/en/api/payment/).

## Admin Steps

1. Expand **Payment**, find channel **name**.  
2. **Edit**, fill AppId, keys, certificate **file** fields per Alert.  
3. **Save**, then run a small test payment in a test environment.  

Some fields are **files** (e.g. merchant cert): choose local file (≤10KB), saved as `filename|base64`.

## Relationship to Commerce

- Currency, shipping, orders live under **Commerce**; **payment channel secrets are configured only here**.  
- Multi-currency must satisfy [k.commerce](/en/api/commerce/commerce.md) and channel `supportedCurrency` ([k.payment · multi-currency](/en/api/payment/#multi-currency-note)).

## Related

- [Integrations overview](./index.md)  
- [Commerce overview](../../commerce/index.md)
