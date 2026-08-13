# Console: Organization

> Manage the organizations associated with the current account, their members and departments, and the active organization. Domains, balance, membership, and AI configuration all belong to an organization.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Console** -> **Organization** |
| Direct URL | `/_Admin/kconsole/organization` |
| Frontend route | `/kconsole/organization` |
| Visibility | All organization members can open the page; member and department maintenance requires an organization administrator. |

Use this page first to confirm which organization is active. Switching organizations also changes the domains, balance, orders, membership, and AI configuration shown elsewhere in Console.

<DocImage src="/product/console/organization-overview.png" alt="Organization member list with names and email addresses redacted" width="1120" />

## Summary

| Item | Details |
|------|---------|
| Current Organization | Organization currently in use. |
| Members | Number of members in the current organization. |
| Role | Whether you are an administrator or member. |

| Action | Details |
|--------|---------|
| `Departments` | Opens department management. |
| `Manage Organization` | Opens the organization list to switch, leave, or create an organization. |

## Members

| Column | Details |
|--------|---------|
| User Name | Username; administrators have an `Admin` badge. |
| Email | Member email address. |
| Join Date | Date the member joined. |

Organization administrators also have these actions:

| Action | Details |
|--------|---------|
| `Add Member` | Add an existing user by `User Name`. |
| `Create Member` | Create an organization user with `User Name`, `Password`, `Email`, and `Phone`. |
| `Export` | Export the current member list. |

Deleting a member requires confirmation. Administrator members cannot be selected for direct deletion from the list.

## Add or Create a Member

| Entry point | Use when | Fields |
|-------------|----------|--------|
| Add Member | The user already exists and needs to join this organization. | `User Name` |
| Create Member | The organization needs a new account. | `User Name`, `Password`, `Email`, `Phone` |

The create form validates the username, password, email, and phone formats, then reloads the member list.

## Manage Organizations

Select `Manage Organization` to open the organization list.

| Area or action | Details |
|----------------|---------|
| Organization list | Shows the name and member count and identifies the current organization. |
| `Depart` | Leaves the selected organization. Disabled when you are its administrator. |
| `Create Own Org` | Available when you do not administer any organization. |
| `Switch` | Makes the selected organization active. |

Switching or leaving an organization ends the current login session and returns to the login page. Sign in again to continue.

## Departments

Open `Departments` from the Organization page:

```text
/_Admin/kconsole/departments
```

<DocImage src="/product/console/organization-departments.png" alt="Department list in Console" width="1120" />

| Column | Details |
|--------|---------|
| Name | Department name. |
| Members | Number of department members; select the number to view them. |

Administrators can select `Add Department` and enter a `Name`. In the department member dialog they can:

| Action | Details |
|--------|---------|
| `Add User` | Add a user from the organization member list. |
| Function | Describe the user's function in the department. |
| Is Manager | Mark the user as a department manager. |
| Delete | Remove selected users from the department. |

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Prepare a new organization | Manage Organization -> confirm the current organization -> add or create members -> Departments. |
| Prepare an implementation account | Create Member -> add the user to a department -> configure [Role Permissions](/en/cms/settings/roles.md) in the site CMS. |
| Switch to a customer organization | Manage Organization -> select the organization -> Switch -> sign in again. |
| Leave an organization | Manage Organization -> select it -> Depart. |

## Organization Members vs. Site Users

| Organization member | CMS site user |
|---------------------|---------------|
| Controls access to organization-level domains, balance, membership, AI configuration, and other Console features. | Controls access to a specific site's CMS and the features available there. |
| `/_Admin/kconsole/organization` | `/_Admin/system/siteuser?SiteId={GUID}` |

## Related Documentation

| Document | Details |
|----------|---------|
| [Console Overview](../console.md) | Console navigation map. |
| [Balance](./balance.md) | Organization-level balance. |
| [AI Configuration](./ai-config.md) | Organization-level AI provider keys. |
| [CMS: Site Users](/en/cms/settings/site-users.md) | Users of a specific site's CMS. |
| [CMS: Role Permissions](/en/cms/settings/roles.md) | Site-level permissions. |
