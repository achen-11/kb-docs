# Mail: Compose

> Compose new messages, reply, reply all, forward, edit and resend, or continue a draft. Kooboo saves drafts automatically and warns before leaving with unsaved changes.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Compose** |
| Direct URL | `/_Admin/kmail/compose` |
| Frontend route | `/kmail/compose` |
| Entry modes | New message, draft, reply, reply all, forward, or edit again. |

If no sender address is available, Kooboo asks you to add one. Configure [Mail Addresses](./addresses.md) and select a default first.

<DocImage src="/product/mail/compose-editor.png" alt="Compose page with sender, recipients, attachments, and rich-text editor" width="1120" />

## Fields

| Field | Details |
|-------|---------|
| From | Select an available address. The default address, or otherwise the first address, is selected initially. |
| To | Enter one or more recipient addresses. |
| Cc / Bcc | Select `Add Cc` or `Add Bcc` to show these fields; they can be removed again. |
| Subject | Required. A message with an empty subject cannot be sent. |
| Attachments | Select `Select` to upload a file. |
| Body | Compose the message in the rich-text editor. |

To, Cc, and Bcc use the same email validation. Recipient tags can be dragged between the three fields.

## Attachments

| Rule | Details |
|------|---------|
| Selection | Select one file at a time. |
| Total size | All attachments combined must not exceed 20 MB. |
| Remove | Select the close icon on an attachment tag. |
| Upload before send | Files upload first; the message references the uploaded attachment data. |

## Actions

| Action | Details |
|--------|---------|
| `Send` | Validates and sends the message. |
| `Save Draft` | Saves the draft immediately. |
| `Cancel` | Leaves the editor; Kooboo asks for confirmation when changes exist. |

The page checks for changes every 20 seconds and saves the draft automatically. While an automatic save is running, the send action displays a draft-saving state and is temporarily disabled.

## Signatures

Changing the sender loads that address's signature and inserts it into the body. Maintain signatures under [Mail Addresses](./addresses.md#signatures).

| Scenario | Position |
|----------|----------|
| New message | At the end of the body. |
| Reply, Reply All, or Forward | Before the quoted original message. |
| Change sender | Replaces the signature with the selected address's signature. |

## Reply, Forward, and Edit Again

Opening Compose from a message includes `sourceId` and `type` in the route.

| Type | Details |
|------|---------|
| `Reply` | Reply to the sender. |
| `ReplyAll` | Reply to all relevant recipients. |
| `Forward` | Forward the message. |
| `Drafts` | Continue editing a draft. |
| `EditAgain` | Start from a sent message. |

These entry points prefill the sender, recipients, subject, body, and attachment context. Saving updates the current draft ID.

## Extension Drawer

An enabled mail extension module may add a drawer on the right side of Compose. It can provide additional actions or context while writing. Manage modules under [Mail Extension Modules](./modules.md); see [k.mail](/en/api/mail/) for the script API.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Send a new message | Compose -> select From -> enter recipients and subject -> write the body -> Send. |
| Send an attachment | Compose -> select a file -> wait for its attachment tag -> Send. |
| Continue a draft | Drafts -> open the message -> edit -> Send or Save Draft. |
| Reuse a sent message | Sent -> open the message -> Edit Again -> update recipients and body -> Send. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Messages](./messages.md) | Open replies, forwards, and drafts from the message list. |
| [Mail Addresses](./addresses.md) | Sender addresses, default address, and signatures. |
| [k.mail](/en/api/mail/) | Server-side sending API. |
