# Mail: Messages

> Process messages in Inbox, Sent, Drafts, Spam, Deleted, and custom folders. The list provides search, filters, read state, move, delete, and access to message details.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Inbox / Sent / Drafts / Spam / Deleted / Folders** |
| Inbox | `/_Admin/kmail/inbox` |
| Sent | `/_Admin/kmail/sent` |
| Search results | `/_Admin/kmail/searchEmail?flag=common&keyword={keyword}` |
| Frontend routes | `/kmail/inbox`, `/kmail/sent`, `/kmail/draft`, `/kmail/spam`, `/kmail/trash`, `/kmail/folder`, `/kmail/searchEmail` |

<DocImage src="/product/mail/messages-overview.png" alt="Message list with toolbar, filters, and message rows" width="1120" />

## Navigation

| Area | Details |
|------|---------|
| Compose | Opens Compose and preserves the current address or return-folder context. |
| Inbox | Shows the total unread count and can expand to filter by mail address. |
| Sent | Groups sent mail by sender address. |
| Folders | Available when custom folders exist; create, expand, rename, or delete them. |
| Drafts / Spam / Deleted | Fixed system folders. |
| Calendar | Fixed entry at the bottom of the navigation. |
| Settings | Opens Mail Settings and defaults to Mail Addresses. |

Selecting the already active menu reloads the list and unread count. Opening Mail clears the unread indicator in the top navigation.

## Toolbar

| Control | Details |
|---------|---------|
| Refresh | Reloads the current folder and its unread count. |
| Search | Enter a term and press Enter to open Search Results. |
| Select dropdown | Select All, Read, or Unread. |
| Delete | Moves messages to Deleted, or deletes permanently when already in Deleted. |
| `Mark as` | Marks selected messages as read or unread. |
| `Move to` | Moves selected messages to Inbox, Sent, Spam, or a custom folder. |
| `Restore to` | Restores messages from Deleted to another folder. |
| `Not spam` | Moves selected messages from Spam back to Inbox. |

The list loads more messages while scrolling. If an operation leaves only a few rows, Kooboo attempts to load the next batch.

## Message Rows

| Area | Details |
|------|---------|
| Checkbox | Selects messages for bulk actions. |
| Read icon | Toggles read or unread. |
| Sender / Recipient | Inbox shows the sender; Sent and Drafts show recipients. |
| Subject | An empty subject appears as "No Subject." Attachments show an icon and up to three file names. |
| Time | Message time. |
| Delivery status | Sent messages may show a status icon; select it to inspect the delivery log. |

Select the main row area to open the message. Opening an unread message marks it as read.

## Message Details

```text
/_Admin/kmail/content?folder={folder}&messageId={messageId}
```

| Action | Availability | Details |
|--------|--------------|---------|
| Back | Always | Returns to the originating folder or Search Results. |
| Edit Again | Sent or Drafts | Copies the message into Compose. |
| Reply / Reply All / Forward | Not Drafts | Opens Compose with the original message as context. |
| Delete | Always | Moves to Deleted or deletes permanently according to the current folder. |
| Move | Not Drafts | Moves to a system or custom folder. |

Message details can expand recipients and show attachments, meeting invitations, the original source, and export actions. **Show Original Message** opens:

```text
/_Admin/original-message?messageId={messageId}
```

Calendar invitations include Accept, Decline, Maybe, and Re-select actions.

## Folders

Folders appear after at least one custom folder exists. Select **+** beside Folders to create one; use the actions on a folder to rename or delete it.

| Action | Details |
|--------|---------|
| New | Enter a name up to 50 characters. |
| Rename | Changes the current name; child paths change with the parent. |
| Delete | A folder with children cannot be deleted until its children are removed. |
| Move messages | Custom folder trees are included under `Move to`. |

Folders support hierarchical paths, stored as complete strings such as `Projects/Kooboo`.

## Search Mail

Enter a term in the search field and press Enter. Search result rows also show the containing folder; select it to return there.

The frontend contains an advanced-search model for keyword location, sender, recipient, date range, folder, and read state, but its entry point is currently hidden. Use the standard search field in normal operation.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Process new mail | Inbox -> open an unread message -> reply or move -> return to the list. |
| Archive project mail | Create a folder -> select messages -> `Move to` -> choose the folder. |
| Clean Spam | Spam -> select incorrectly classified messages -> `Not spam`; delete the rest. |
| Track a sent message | Sent -> review delivery status -> open the delivery log. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Compose](./compose.md) | Write, reply, forward, and manage drafts. |
| [Calendar](./calendar.md) | Events and meeting invitations. |
| [Mail Addresses](./addresses.md) | Sender and default address configuration. |
| [k.mail](/en/api/mail/) | Server-side mail API. |
