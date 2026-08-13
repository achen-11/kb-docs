# Mail: Security Reports

> Review DMARC reports to see which sources send mail for your domains and whether those messages pass authentication.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Settings** -> **Security Reports** |
| Direct URL | `/_Admin/kmail-settings/security-report` |
| Frontend route | `/kmail-settings/security-report` |

<DocImage src="/product/mail/security-report-overview.png" alt="DMARC security report list in Kooboo Mail" width="1120" />

## Report List

| Column | Details |
|--------|---------|
| Report Domain | Domain that sent the DMARC report. |
| Our Domain | Your domain covered by the report. |
| Date | Start date of the report. |
| Mail Count | Number of messages covered. |
| Status | Pass or Reject. |
| From IP | Sending source IP. |
| Mail From | Envelope From address. |

The list is loaded from `mailreport/DmarcList`. An empty list normally means that no displayable aggregate report has arrived yet, or the domain's DMARC configuration has not produced one.

## How to Interpret It

| Observation | Check |
|-------------|-------|
| Unknown source IP | Determine whether a third-party service sends mail for the domain. |
| Status is Reject | Check SPF, DKIM, and DMARC alignment. |
| Mail count increases unexpectedly | Investigate abnormal sending or a recent marketing campaign. |
| No reports | Confirm that DNS contains a DMARC reporting address. |

Security Reports display results only. Maintain DNS under [Console: Domains](../console/domains.md#dns-records), and investigate business sending with [k.mail](/en/api/mail/).

## Related Documentation

| Document | Details |
|----------|---------|
| [Console: Domain DNS](../console/domains.md#dns-records) | View and add DNS records. |
| [SMTP](./smtp.md) | Custom SMTP sending channel. |
| [k.mail](/en/api/mail/) | Server-side mail capability. |
