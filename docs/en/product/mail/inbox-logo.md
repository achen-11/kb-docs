# Mail: Inbox Logo

> Maintain BIMI logo and VMC URLs so supported mail clients can display a verified brand mark.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Settings** -> **Inbox Logo** |
| Direct URL | `/_Admin/kmail-settings/inbox-logo` |
| Frontend route | `/kmail-settings/inbox-logo` |
| Required role | Organization administrator |

<DocImage src="/product/mail/inbox-logo-overview.png" alt="Inbox Logo settings with Logo and VMC URLs" width="1120" />

## Page Structure

| Card | Details |
|------|---------|
| Logo | Current logo URL, guidance, and an input for a new URL. |
| VMC | Current VMC URL, guidance, and an input for a new URL. |

The backend supplies the title, description, and current URL. Enter only the replacement URL, then select `Update`.

## Update the Logo

1. Prepare a publicly accessible logo file URL.
2. Enter it in the Logo card.
3. Select `Update`.
4. Confirm the current URL after the page reloads.

The URL is required and must pass format validation.

## Update the VMC

1. Prepare the VMC file URL.
2. Enter it in the VMC card.
3. Select `Update`.
4. Confirm the current URL after saving.

VMC normally also requires certificate and domain validation. This page stores only the URL; verify certificate issuance, DNS, and mail-client support separately.

## Recommended Workflows

| Scenario | Workflow |
|----------|----------|
| Configure branding | Prepare Logo and VMC files -> host them at accessible URLs -> update the URLs -> send a test message. |
| Replace a logo | Replace the hosted file -> update the Logo URL -> wait for client caches to refresh. |
| Logo does not appear | Check the URL, DNS, DMARC, BIMI/VMC requirements, and client support. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Security Reports](./security-report.md) | Review DMARC reports. |
| [Console: Domain DNS](../console/domains.md#dns-records) | Maintain DNS records. |
