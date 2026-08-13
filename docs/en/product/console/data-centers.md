# Console: Data Centers

> Manage the data centers available to the current organization, choose the default, and open a selected data center.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Console** -> **Data Centers** |
| Direct URL | `/_Admin/kconsole/serviceDataCenter` |
| Frontend route | `/kconsole/serviceDataCenter` |
| Required role | Organization administrator |

This is an organization-level list. It is separate from changing the data center assigned to one specific domain.

<DocImage src="/product/console/data-centers-overview.png" alt="Data center list in Console" width="1120" />

## Page Structure

Select one row, then use an action above the table.

| Area | Details |
|------|---------|
| `Enable` | Enables the selected inactive data center after confirmation. |
| `Disable` | Disables the selected active data center after confirmation. |
| `Set as Default` | Makes the selected active data center the default. |
| Row selection | The current default cannot be selected as an operation target. |

The table contains:

| Column | Details |
|--------|---------|
| Name | Data center name. |
| Description | Data center description. |
| Enable Status | Whether it is enabled. |
| Default | Whether it is the default. |
| Go To | Opens its administration interface. |

## Enable, Disable, or Set the Default

| Action | Use when | Note |
|--------|----------|------|
| Enable | The organization needs to start using a data center. | Kooboo asks for confirmation. |
| Disable | The organization no longer needs a data center. | Kooboo asks for confirmation. |
| Set as Default | New sites or services should prefer this data center. | Available only for enabled data centers. |

The default affects the destination selected by some future organization-level services. To move an existing domain, use [Domains](./domains.md#renewal-transfer-code-and-data-center).

## Open a Data Center

Use `Go To` in the last column.

| Status | Behavior |
|--------|----------|
| Enabled | Opens the target in a new tab using the current login token and `auto_login=true`. |
| Disabled | The action is unavailable. |

If automatic login fails, check the current session, organization permissions, and whether the target data center is enabled.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Enable a new data center | Select it -> Enable -> Set as Default. |
| Open a data center for investigation | Confirm it is enabled -> Go To. |
| Move a domain | Confirm the target is available -> return to [Domains](./domains.md) -> change the domain's data center. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Console Overview](../console.md) | Console navigation map. |
| [Domains](./domains.md) | Data center assignment for an individual domain. |
| [Organization](./organization.md) | Current organization and administrator role. |
