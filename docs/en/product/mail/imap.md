# Mail: IMAP

> View the IMAP and SMTP connection settings required by external mail clients, and generate an authorization code for the default address.

## How to Open It

| Item | Details |
|------|---------|
| Menu | **Mail** -> **Settings** -> **IMAP** |
| Direct URL | `/_Admin/kmail-settings/imap-setting` |
| Frontend route | `/kmail-settings/imap-setting` |
| Prerequisite | Set a default address under [Mail Addresses](./addresses.md). |

<DocImage src="/product/mail/imap-settings.png" alt="IMAP and SMTP client settings in Kooboo Mail" width="1120" />

## Page Structure

| Card | Fields |
|------|--------|
| IMAP Setting | Server, Username, Port, SSL |
| SMTP Setting | Server, Username, Port, SSL |

`Username` is the current default mail address. If none is set, the page provides a link back to Mail Addresses.

## Generate an Authorization Code

When a default address exists, the page shows `Generate Authorization Code`.

1. Select `Generate Authorization Code`.
2. Copy the new IMAP/SMTP authorization code from the dialog.
3. Use it as the password in the external client.
4. Store it securely. Only the latest authorization code remains valid.

Do not place an authorization code in documentation, screenshots, or support-ticket text. Generate a new code if it is exposed.

## External Client Fields

| Client field | Kooboo field |
|--------------|--------------|
| IMAP Server | IMAP Setting -> Server |
| IMAP Username | IMAP Setting -> Username |
| IMAP Port | IMAP Setting -> Port |
| IMAP SSL | IMAP Setting -> SSL |
| SMTP Server | SMTP Setting -> Server |
| SMTP Username | SMTP Setting -> Username |
| SMTP Port | SMTP Setting -> Port |
| SMTP SSL | SMTP Setting -> SSL |
| Password | Generated authorization code |

## Troubleshooting

| Problem | Check |
|---------|-------|
| Generate button is missing | Set a default mail address first. |
| Client reports an incorrect password | Generate a new code and confirm the client uses the latest one. |
| Client receives but cannot send | Verify SMTP Server, Port, SSL, and the authorization code. |
| Wrong default mailbox | Change the default under [Mail Addresses](./addresses.md). |

## Relationship to KScript

| IMAP page | KScript API |
|-----------|-------------|
| Provides connection settings and credentials for a manually configured external client. | Use [k.mail](/en/api/mail/) in site code to receive, parse, or send messages. |
| The user configures the client. | The API handles business automation and notifications. |

## Related Documentation

| Document | Details |
|----------|---------|
| [Mail Addresses](./addresses.md) | Default address configuration. |
| [SMTP](./smtp.md) | Custom SMTP server settings. |
| [k.mail](/en/api/mail/) | Mail API. |
