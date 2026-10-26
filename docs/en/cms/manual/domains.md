# Domains

Every Kooboo account includes a free domain for testing before launch. For a live site, buy a proper domain and bind it to the site.

## Where to buy (China vs overseas)

- **Sites in mainland China** need ICP filing. Kooboo does not support filing, so buy the domain on **Alibaba Cloud (Aliyun)**, set DNS, then add it in Kooboo.
- **Overseas sites** need no filing; you can buy the domain in Kooboo.

## Buy a domain in Kooboo

Open **Domains** in the console, then **Buy domain** (or the other purchase entry on that page).

1. Search for the domain. If it is available, click **Register**.
2. Choose the term. Contact details are optional; leave them on automatic if empty.
3. Click **OK** to open the payment page.

This guide stops at the payment page; complete payment in the admin yourself. Purchased domains appear in the domain list and can then be bound to a site.

## Add a domain bought elsewhere

1. In your registrar’s DNS panel (for example Aliyun), add two **CNAME** records:
   - Host `@` for the apex (for example `example.com`)
   - Host `*` for subdomains (for example `www.example.com`)
2. Set the record value to your Kooboo server domain. You can see it in the console **Domains → New** dialog.
3. If the registrar (for example GoDaddy) cannot CNAME the apex, use their domain forwarding to send the apex to something like `www.example.com`.
4. In Kooboo: **Console → Domains → New domain**, enter the domain that already has those CNAMEs. You can then bind it to a site.

## Bind or change the site domain

Open **Site settings → Domains**.

- Remove an old domain: check it, then delete. Right after a CNAME change, wait for the TTL before testing.
- Bind a new domain: click **New binding** and choose the production domain. Switching to that domain is effectively going live.
- Visitors then use the new domain; the site list also shows the current domain.

## Site unreachable after DNS changes

### 404 (Not Found)

Likely cause: the domain does not resolve to the Kooboo server.

Check: open DevTools (F12). For any request, see whether **Remote Address** is a Kooboo server IP, or whether the **Server** response header shows a Kooboo version (either is enough; Server is easier). If neither matches, point the domain at Kooboo as in the previous section, then retry.

### ERR_CONNECTION_RESET

Likely cause: a network issue; or, right after a DNS change, the TTL has not expired yet.

Check: try another network. If you just changed DNS, wait for the TTL, then retry.

### ERR_TOO_MANY_REDIRECTS

Likely cause: a bad CNAME creating a redirect loop.

Check: confirm the CNAME points at the Kooboo server.

## Renew a domain

When a domain is near expiry, open the renew page, choose the term, and complete renewal.
