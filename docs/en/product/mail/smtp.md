# Mail: SMTP

> Configure a custom SMTP server in supported environments. This page is primarily for organization administrators using self-hosted, local, or other non-online-service deployments.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Settings** -> **SMTP** |
| Direct URL | `/_Admin/kmail-settings/smtp-setting` |
| Frontend route | `/kmail-settings/smtp-setting` |
| Visibility | Organization administrators when the current environment is not an online-service environment. |

<DocImage src="/product/mail/smtp-settings.png" alt="SMTP settings in Kooboo Mail with the password redacted" width="1120" />

## Fields

| Field | Details |
|-------|---------|
| Server | SMTP hostname or IP address. |
| Port | SMTP port, commonly `587`, `465`, or a provider-specific port. |
| Username | SMTP login username. |
| Password | SMTP login password or authorization code. |

Select `Save` to store the configuration and reload the page data.

## Validation

| Field | Rule |
|-------|------|
| Server | Required; must be a valid URL or IP format. |
| Port | Required; must be a valid integer port. |
| Username | Required. |
| Password | Required; 2-30 characters. |

The password is sensitive and must be redacted in screenshots, documentation, and support tickets.

## When to Configure It

| Scenario | Recommendation |
|----------|----------------|
| Kooboo online mail service | Normally no configuration is required, and the page may be hidden. |
| Self-hosted Kooboo | Configure an internal or third-party SMTP service according to the organization's mail policy. |
| Rotate an SMTP account | Update Password, save, and send a test message. |
| Sending fails | Verify Server, Port, Username, and Password, then check network and provider restrictions. |

## SMTP Settings vs. IMAP

| SMTP Settings | IMAP |
|---------------|------|
| Configures the custom SMTP server used by the organization. | Shows the IMAP/SMTP settings external clients use to connect to Kooboo Mail. |
| Controls the backend sending channel. | Generates authorization codes for external clients. |
| Visible only in selected environments. | Visible in the standard settings menu. |

## Related Documentation

| Document | Details |
|----------|---------|
| [IMAP](./imap.md) | External client connection settings and authorization codes. |
| [Mail Addresses](./addresses.md) | Default sender address. |
| [k.mail](/en/api/mail/) | Server-side mail API. |
