# k.utils.converter

> Call Kooboo conversion services (HTML/PDF, Office, GIF, etc.)

## Overview

`k.utils.converter` processes documents through the Kooboo cloud conversion service, which relies on the `UrlSetting.Converter` service being available.

## htmlToPdf()

Convert HTML to PDF byte array; optional `appendTexts` header and footer configuration.

```ts
const pdf = k.utils.converter.htmlToPdf("<div>Hello</div>")
k.file.writeBinary("out/report.pdf", pdf)
```

## gifToWebp()

GIF to WebP, parameter is GIF byte array.

## officeToHTML()

Upload Office file bytes and return HTML string; associated resources will be synchronized into the site database.

```ts
const html = k.utils.converter.officeToHTML(file.bytes, file.fileName)
```

## officeToCleanHTML()

Similar to `officeToHTML`, outputs sanitized HTML (specific rules are subject to runtime).

## Related Docs

- [k.utils.office](./office.md) — Local Excel reading and writing
- [k.file](../file/file.md)
