# Mail: Contacts

> Maintain frequently used contacts for composing messages and keeping recipient addresses organized.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Settings** -> **Contacts** |
| Direct URL | `/_Admin/kmail-settings/contacts` |
| Frontend route | `/kmail-settings/contacts` |

<DocImage src="/product/mail/contacts-overview.png" alt="Contact list in Kooboo Mail" width="1120" />

## Contact List

| Area | Details |
|------|---------|
| `Add Contact` | Creates a contact. |
| Name | Contact name. |
| Address | Contact email address. |
| Edit | Changes the name or address. |
| Delete | Deletes selected contacts. |

The list is sorted by name in ascending order. Deletion requires confirmation.

## Add or Edit a Contact

Select `Add Contact` or the edit icon.

| Field | Rule |
|-------|------|
| Name | Required; 1-64 characters. |
| Address | Required; must be a valid email address. |

When adding a contact, Kooboo checks whether the address already exists. An existing contact may keep its current address while being edited.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Add a frequent recipient | Contacts -> Add Contact -> enter the name and address -> save. |
| Correct an address | Contacts -> Edit -> update Address -> save. |
| Remove invalid contacts | Select contacts -> Delete -> confirm. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Compose](./compose.md) | Enter recipients while composing mail. |
| [Mail Addresses](./addresses.md) | Manage sender addresses and groups. |
