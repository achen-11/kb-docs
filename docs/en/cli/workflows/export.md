# Export a site

`kb export` connects to the target site, lets you select resource groups, and downloads the result as a ZIP file.

## Start an export

Use connection details from the project `.env`:

```bash
kb export
```

During the command, the CLI asks for:

- the export filename;
- the resource groups to include;
- whether to save the current choices as defaults.

If the filename has no extension, the export uses `.zip`.

## Temporarily specify connection details

```bash
kb export \
  --site-url https://example.com \
  --username your-username \
  --password your-password
```

Command options affect only this export. After successful authentication, the CLI may update the login token in the project `.env`, so make sure `.env` is ignored by Git.

## Save default selections

If you choose to save settings during the prompts, the CLI writes the default resource groups and filename to the project `.env`:

```ini
KOOBOO_DEFAULT_EXPORTS=Code,Script,Style
KOOBOO_DEFAULT_FILE=site.zip
```

The selection prompt still appears on the next export, so you can adjust the resource scope.

## Check before and after export

Before export:

- confirm the site URL and account;
- include a date or version in the filename to avoid overwriting an older backup;
- confirm that enough disk space is available.

After export:

```bash
ls -lh *.zip
```

Do not keep an important recovery archive only in a temporary directory. A successful export means the archive was downloaded; it does not mean every type of business data was included. The exported scope depends on your interactive selections.

## Related documentation

- [Compare and clean remote resources](./check-and-prune.md)
- [Push local resources](./push.md)
