# Mail

> Kooboo Mail is an account-level workspace for sending and receiving email, managing addresses and contacts, configuring IMAP and SMTP, reviewing DMARC reports, and maintaining mail extension modules.

## How to Open It

| Item | Details |
|------|---------|
| Top navigation | Select **Mail** in the top navigation. |
| Mail direct URL | `/_Admin/kmail/inbox` |
| Settings direct URL | `/_Admin/kmail-settings/addresses` |
| Frontend routes | `/kmail`, `/kmail-settings`, and `/mail-module-editor` |
| Scope | Account or organization; the URL normally does not include `SiteId`. |

Mail is not a menu inside an individual site. Use it to decide which addresses can send and receive mail, select the default sender, generate authorization codes for external clients, and manage mail modules. If no domain is available when creating an address, first confirm under [Console: Domains](./console/domains.md) that the domain uses Kooboo DNS.

<DocImage src="/product/mail/mail-overview.png" alt="Kooboo Mail overview with folders, addresses, and the message list" width="1120" />

::: tip Menu visibility

| Role or environment | Visible entries |
|---------------------|-----------------|
| Organization members | Inbox, Sent, Drafts, Spam, Deleted, Mail Addresses, Contacts, Security Reports, and IMAP |
| Organization administrators | All of the above, plus Mail Extension Modules and Inbox Logo |
| Organization administrators in a non-online-service environment | All of the above, plus SMTP Settings |

The frontend also defines `/_Admin/kmail-settings/migration`, but the default navigation currently hides the Mail Migration page. Availability depends on the current environment.

:::

## Mail Workspace

| Entry | Direct URL | Documentation | Main use |
|-------|------------|---------------|----------|
| Inbox | `/_Admin/kmail/inbox` | [Messages](./mail/messages.md) | Review incoming mail, filter by address, mark as read, move, or delete. |
| Sent | `/_Admin/kmail/sent` | [Messages](./mail/messages.md) | Review sent mail and delivery status. |
| Drafts | `/_Admin/kmail/draft` | [Messages](./mail/messages.md) | Continue editing automatically or manually saved drafts. |
| Spam | `/_Admin/kmail/spam` | [Messages](./mail/messages.md) | Review spam and mark a message as not spam. |
| Deleted | `/_Admin/kmail/trash` | [Messages](./mail/messages.md) | Restore messages or delete them permanently. |
| Folders | `/_Admin/kmail/folder` | [Messages](./mail/messages.md#folders) | Organize messages in custom folders. |
| Search Results | `/_Admin/kmail/searchEmail` | [Messages](./mail/messages.md#search-mail) | Search messages by keyword from the search field in the header. |
| Calendar | `/_Admin/kmail/calendar` | [Calendar](./mail/calendar.md) | Create events, invite attendees, and process meeting invitations. |
| Compose | `/_Admin/kmail/compose` | [Compose](./mail/compose.md) | Write, reply, reply all, forward, or edit and resend a message. |

Opening Mail clears the unread indicator in the top navigation and checks for new messages every five minutes. The Inbox attempts to refresh its list; other Mail pages show only the new-message notification.

## Mail Settings

| Settings page | Direct URL | Documentation | Main use |
|---------------|------------|---------------|----------|
| Mail Addresses | `/_Admin/kmail-settings/addresses` | [Mail Addresses](./mail/addresses.md) | Create standard, catch-all, group, or forwarding addresses; choose the default address and signature. |
| Contacts | `/_Admin/kmail-settings/contacts` | [Contacts](./mail/contacts.md) | Maintain frequently used contacts. |
| Security Reports | `/_Admin/kmail-settings/security-report` | [Security Reports](./mail/security-report.md) | Review DMARC reports. |
| IMAP | `/_Admin/kmail-settings/imap-setting` | [IMAP](./mail/imap.md) | Review IMAP and SMTP client settings and generate authorization codes. |
| Mail Extension Modules | `/_Admin/kmail-settings/mail-module` | [Mail Extension Modules](./mail/modules.md) | Create, import, install, enable, disable, and edit mail modules. |
| Inbox Logo | `/_Admin/kmail-settings/inbox-logo` | [Inbox Logo](./mail/inbox-logo.md) | Configure BIMI logo and VMC URLs. |
| SMTP | `/_Admin/kmail-settings/smtp-setting` | [SMTP](./mail/smtp.md) | Configure a custom SMTP server in supported environments. |

## Recommended Configuration Order

| Scenario | Recommended order |
|----------|-------------------|
| Enable Mail for the first time | [Console: Domains](./console/domains.md) -> [Mail Addresses](./mail/addresses.md) -> set the default address -> [IMAP](./mail/imap.md) |
| Send business notifications from a site | [Mail Addresses](./mail/addresses.md) -> set the default sender -> [k.mail](/en/api/mail/) -> implement the business API or scheduled job |
| Process daily mail | [Messages](./mail/messages.md) -> Search or Folders -> [Compose](./mail/compose.md) |
| Connect an external mail client | [Mail Addresses](./mail/addresses.md) -> set the default address -> [IMAP](./mail/imap.md) -> generate an authorization code |
| Extend the mail workflow | [Mail Extension Modules](./mail/modules.md) -> module editor -> enable the module -> test sending and receiving |
| Schedule a meeting | [Mail Addresses](./mail/addresses.md) -> set the default address -> [Calendar](./mail/calendar.md) -> create an event |

## Mail Administration vs. Site Code

| Mail administration | Site administration or KScript |
|---------------------|--------------------------------|
| Configure addresses, the default sender, signatures, and IMAP authorization codes. | Use [k.mail](/en/api/mail/) from site APIs, Jobs, or Hooks to send and receive messages. |
| Manage messages, folders, contacts, and DMARC reports. | Decide when a business workflow sends mail, who receives it, and what should be logged. |
| Manage mail extension modules and their files. | Use [k.mail](/en/api/mail/) and the [Module API](/en/api/module/) inside module scripts. |
| Configure account-level SMTP and Inbox Logo settings. | Continue configuring site content, pages, integrations, and AI services in the site CMS. |

These product pages document the administration interface and save behavior. See [API](/en/api/) for KScript signatures and examples.

## Related Documentation

| Document | Details |
|----------|---------|
| [k.mail](/en/api/mail/) | KScript Mail API. |
| [Console](./console.md) | Domains, balance, and organizations. |
| [CMS: Service Integrations](/en/cms/settings/integrations/) | Third-party service settings for a site. |
