# Mail: Mail Addresses

> Define which addresses the account can use to send and receive mail, choose the default sender, and maintain signatures, group members, and forwarding targets. Configure this page before using Mail for the first time.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Settings** -> **Mail Addresses** |
| Direct URL | `/_Admin/kmail-settings/addresses` |
| Frontend route | `/kmail-settings/addresses` |
| Prerequisite | The domain must appear under the current organization. In the online-service environment, Mail is available for domains using Kooboo DNS. |

<DocImage src="/product/mail/addresses-overview.png" alt="Mail Addresses settings with the address list, default address, and address types" width="1120" />

## Toolbar

| Control | Details |
|---------|---------|
| `New Address` | Creates a standard, catch-all, group, or forwarding address. |
| Default address | Selects the default sender from addresses other than catch-all addresses. |

Kooboo asks for confirmation before changing the default. The default sender is also used when generating IMAP authorization codes and sending calendar invitations.

## Address Types

| Type | Use when | Fields |
|------|----------|--------|
| Standard address | A fixed personal or business mailbox such as `support@example.com`. | Name, address prefix, domain |
| Catch-all address | Receive mail for addresses under the domain that were not created separately. | Name, wildcard address, domain |
| Group | Distribute one address to several members. | Name, group address, domain; maintain members after saving |
| Forwarding address | Forward incoming mail to an external address. | Name, proxy address, domain, forwarding target |

When creating an address, enter its prefix and select `@domain`. For an existing address, only the display name can be changed; a forwarding address can also change its target.

## Address List

| Column or action | Details |
|------------------|---------|
| Address | Full email address. |
| Name | Display name. |
| Use For | Address type. |
| Remark | Forwarding target or group member count. |
| Edit Signature | Available for addresses other than catch-all addresses. |
| Edit | Changes the name and, for forwarding addresses, the target. |
| Open Inbox | Opens Inbox filtered by this address. |
| Delete | Deletes one or more selected addresses. |

Deleting the default address clears the default selection. Choose another address afterward.

## Group Members

Select the member-count tag for a group address.

| Action | Details |
|--------|---------|
| Add | Select **+**, enter a member email address, and save. |
| Remove | Select `Remove` on a member row. |
| Validation | Each member must be a valid email address within the supported length. |

Groups are appropriate for addresses such as `team@example.com` and `support@example.com` that several people should receive.

## Signatures

Select the signature action for an address to open the rich-text editor. Compose inserts the saved signature according to the selected sender.

| Scenario | Position |
|----------|----------|
| New message | End of the message body. |
| Reply or Forward | Before the quoted original message. |
| Multiple sender addresses | Each address has its own signature. |

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Send mail for the first time | Confirm domain DNS -> create a standard address -> set it as default -> send a test message. |
| Create a support group address | Create a group -> add members -> open Inbox and verify delivery. |
| Forward to an external system | Create a forwarding address -> enter the target -> send a test message. |
| Configure an external client | Set the default address -> [IMAP](./imap.md) -> generate an authorization code. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Compose](./compose.md) | How sender addresses and signatures are used. |
| [IMAP](./imap.md) | Default address and authorization code. |
| [Console: Domains](../console/domains.md) | Domains and DNS. |
| [k.mail](/en/api/mail/) | Business mail API. |
