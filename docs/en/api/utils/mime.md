# k.utils.mime

> Check file name and MIME type

## Overview

Query mappings based on extension or MIME type.

## getMimeMapping()

Returns a MIME type string based on the filename (including extension).

```ts
const mime = k.utils.mime.getMimeMapping("photo.jpg")
```

## getExtensions()

Returns a list of possible file extensions based on MIME type.

```ts
const exts = k.utils.mime.getExtensions("image/jpeg")
```

## Related Docs

- [k.utils Overview](./index.md)
