# Console: Domains

> Manage domain assets for the account: add existing domains, purchase new ones, bind sites, maintain DNS records, renew domains, obtain transfer codes, and select data centers.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Console** -> **Domains** |
| Direct URL | `/_Admin/kconsole` |
| Frontend route | `/kconsole` |
| Visibility | All organization members can view domains. Purchases, renewals, DNS, and data-center actions normally require an organization administrator. |

This page manages domains owned by the account. To use a domain as an entry point for a specific site, also configure [CMS: Domain Management](/en/cms/settings/domains.md).

<DocImage src="/product/console/domains-overview.png" alt="Domain list in Console" width="1120" />

## Domain List

| Action | Details |
|--------|---------|
| `New` | Add an existing domain to the current account. |
| `Purchase a Domain` | Opens domain search and purchase; visible to organization administrators. |

| Column | Details |
|--------|---------|
| Domain | Select the domain name to open Domain Binding. |
| Data Center | Shown in the online-service environment. Administrators can change the domain's data center. |
| Expiration | Domain expiration date. |
| Record | Number of DNS records. |
| Site | Number of bound sites. |
| Action | In the online-service environment, includes Renew, Transfer Code, DNS Settings, and related actions. |

## Add an Existing Domain

Select `New` to open **New Local Domain**.

| Area | Details |
|------|---------|
| DNS guidance | In the online-service environment, shows the available DNS servers and the CNAME for wildcard domains. |
| `Domain` | Root domain to add, such as `example.com`. |
| `Create` | Saves the domain and returns to the list. |

After adding the domain, review its `Record`, `Site`, and expiration values before opening DNS or Domain Binding.

## Bind a Site

Select a domain name to open:

```text
/_Admin/kconsole/DomainBinding?id={domainId}
```

<DocImage src="/product/console/domains-binding.png" alt="Domain binding list in Console" width="1120" />

| Column | Details |
|--------|---------|
| Domain | Full bound domain, such as `www.example.com`. |
| Site | Bound site. Select it to open `/_Admin/site?SiteId={siteId}`. |
| Preview | Preview the site through the current domain. |

Select `New` and configure:

| Field | Details |
|-------|---------|
| `Domain` | Subdomain prefix such as `www`; the root domain is appended automatically. |
| `Site` | Site to bind from the current account. |

After saving, review the site's domain, primary-domain, and SSL status under [CMS: Domain Management](/en/cms/settings/domains.md).

## DNS Records

Open DNS Settings from the domain list:

```text
/_Admin/kconsole/domainDNS?domainName=example.com
```

<DocImage src="/product/console/domains-dns.png" alt="DNS record list in Console" width="1120" />

| Column | Details |
|--------|---------|
| Host | Host record. |
| Record Type | DNS record type. |
| Record Value | Target value. |
| TTL | Cache duration. |

Select `Add` and configure:

| Field | Details |
|-------|---------|
| `Host Record` | Host prefix; the current domain is appended automatically. |
| `Record Type` | DNS type returned by the backend. |
| `Record Value` | Target such as an IP address, CNAME, or TXT value. |
| `Priority` | Available only for `MX`. |
| `TTL` | Select from the predefined values. |

The page provides a Back action. Saving or deleting a record reloads the list.

## Purchase a Domain

Organization administrators can select `Purchase a Domain` to open:

```text
/_Admin/kconsole/domainSearch
```

<DocImage src="/product/console/domains-search.png" alt="Domain search and purchase page in Console" width="1120" />

| Control | Details |
|---------|---------|
| Search | Enter a prefix such as `kooboo`, or a full domain with a suffix. |
| Suffixes | `.com`, `.net`, `.site`, and `.dev` are selected by default; more suffixes can be added. |
| `Search` | Loads registration availability and pricing. |

Results show the domain, price, status, and `Immediately Get`. Selecting an available domain opens the order dialog:

| Field | Details |
|-------|---------|
| Domain | Selected domain; read-only. |
| Period | Registration period from 1 to 10 years. |
| Amount | Total calculated from price and period. |
| Contact Information | Use Kooboo information automatically or provide a custom name, phone, email, and address. |

Confirmation creates an order and opens [Orders: Checkout](./orders.md#checkout).

## Renewal, Transfer Code, and Data Center

| Action | Entry point | Result |
|--------|-------------|--------|
| Renew | `Renew` in the Action column. | Select 1-10 years, then continue to [Checkout](./orders.md#checkout). |
| Transfer Code | Transfer action in the Action column. | Displays the transfer code in a dialog. |
| Change Data Center | Select the Data Center column. | Select a target data center and confirm. |

Renewal creates an order; it does not charge the account immediately.

## Common Workflows

| Scenario | Workflow |
|----------|----------|
| Connect an existing domain | New -> configure the DNS servers or CNAME -> Domain Binding -> verify in CMS Domain Management. |
| Purchase a domain and create a site | Purchase a Domain -> create the order -> checkout -> Domain Binding -> configure the primary domain in the CMS. |
| Add a DNS record | Domain list -> DNS Settings -> Add -> verify resolution with an external tool. |
| Renew an expiring domain | Domain list -> Renew -> pay at checkout -> verify under Renewals. |

## Console Domains vs. CMS Domain Management

| Console: Domains | CMS: Domain Management |
|------------------|------------------------|
| Account-level domain assets, DNS, purchases, renewals, transfer codes, and data centers. | Bindings, Base URL, primary domain, and SSL for one site. |
| `/_Admin/kconsole` | `/_Admin/system/domains?SiteId={GUID}` |

## Related Documentation

| Document | Details |
|----------|---------|
| [Console Overview](../console.md) | Console navigation map. |
| [Orders](./orders.md) | Payment after purchasing or renewing a domain. |
| [Renewals](./renewals.md) | Domain renewal items. |
| [CMS: Domain Management](/en/cms/settings/domains.md) | Site-level domain configuration. |
