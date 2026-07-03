# k.storage

> Site configured cloud object storage (OSS/S3/Azure Blob)

## Overview

`k.storage` Access the object storage provider enabled and configured in Kooboo **Console → Settings**. Each enabled provider corresponds to a client for enumerating, uploading, copying, deleting objects, and reading and writing metadata.

::: tip Difference from k.media and k.file
| API | storage location | Typical uses |
|-----|----------|----------|
| **`k.storage`** | Alibaba Cloud OSS, Amazon S3, Azure Blob, etc. | Large files, CDN origin, bucket consistent with cloud console |
| **`k.media`** | Site Media Library | Backend picture material, site preview URL |
| **`k.file`** | site directory file | Scripts, configurations, ordinary disk files |
:::

Provider name (must be consistent with console, case sensitive):

| name | Serve |
|------|------|
| `AliyunOSS` | Alibaba Cloud Object Storage |
| `AmazonS3` | Amazon S3 |
| `AzureBlob` | Azure Blob Storage |

```ts
const oss = k.storage.AliyunOSS
// Or
const oss = k.storage.get("AliyunOSS")
```

Unconfigured or unenabled names will fail when called. Please confirm that the storage settings are turned on on the target site before use.

## listObjects()

List the files and folders under the specified prefix (pagination).

```ts
k.api.get("list", () => {
    const client = k.storage.get("AliyunOSS")
    const page = client.listObjects("/media/")
    return {
        files: page.files.length,
        folders: page.folders.length,
        hasMore: page.hasMore
    }
})
```

| parameter | type | Required | illustrate |
|------|------|------|------|
| `path` | `string` | yes | Prefix path, such as `/media/` |
| `options` | `QueryOptions` | no | Pagination options |

**Return:** `ListObjectsResponse`

| Field | illustrate |
|------|------|
| `files` | `RawStorageObjectModel[]` |
| `folders` | `RawStorageFolderModel[]` |
| `hasMore` | Is there a next page? |
| `lastModified` | This page was last modified |

### QueryOptions

| Field | illustrate |
|------|------|
| `takeCount` | Number of items per page, default `10` |
| `startAfter` | `key` of the last file on the previous page, used for page turning |

```ts
let page = client.listObjects("/media/", { takeCount: 20 })
if (page.hasMore) {
    const lastKey = page.files[page.files.length - 1].key
    page = client.listObjects("/media/", { takeCount: 20, startAfter: lastKey })
}
```

## searchObjects()

Search for objects under a specified prefix by keyword.

```ts
const page = client.searchObjects("/media/", "banner", { takeCount: 10 })
```

| parameter | type | Required | illustrate |
|------|------|------|------|
| `path` | `string` | yes | Search prefix |
| `keyword` | `string` | yes | Keywords |
| `options` | `QueryOptions` | no | Pagination |

**Return:** `SearchObjectsResponse` (including `files`, `hasMore`, `lastModified`, no `folders`)

## putObject()

Upload object.

```ts
k.api.post("upload", () => {
    const file = k.request.files[0]
    const key = "/media/uploads/" + file.fileName
    const client = k.storage.AliyunOSS
    const result = client.putObject(key, file.bytes, { alt: file.fileName })
    return { key: result.key, url: result.url }
})
```

| parameter | type | Required | illustrate |
|------|------|------|------|
| `key` | `string` | yes | Object key (path) |
| `bytes` | `number[]` | yes | File content |
| `metas` | `object` | no | Metadata (such as `alt`), specific fields depend on the provider |

**Return:** `RawStorageObjectModel`

## copyObject()

Copies the object to the new key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sourceKey` | `string` | Yes | Source object key. |
| `destinationKey` | `string` | Yes | Destination object key. |

**Returns**: `void`.

```ts
client.copyObject("/media/a.png", "/media/backup/a.png")
```

## createFolder()

Create folder (logical prefix).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | `string` | Yes | Folder path, usually ending with `/`. |

**Returns**: `void`.

```ts
client.createFolder("/media/my-folder/")
```

## isUniqueKey()

Check if the key has not been used yet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | Yes | Object key to check. |

**Returns**: `boolean`. Returns `true` when the key is not used.

```ts
if (!client.isUniqueKey(key)) {
    throw new Error("Duplicated key: " + key)
}
```

## deleteObjects() / deleteFolders()

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `deleteObjects(keys)` | `keys: string[]` | `void` | Delete objects in batches. |
| `deleteFolders(paths)` | `paths: string[]` | `void` | Delete folder prefixes in batches. |

```ts
client.deleteObjects(["/media/a.png", "/media/b.png"])
client.deleteFolders(["/media/old-folder/"])
```

## generateDownloadUrl()

Generates a temporary download URL for the object.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | Yes | Object key to download. |

**Returns**: `string`. Temporary download URL.

```ts
const url = client.generateDownloadUrl("/media/report.pdf")
```

## getMetadata() / putMetadata()

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `getMetadata(key)` | `key: string` | `object` | Read object metadata. |
| `putMetadata(key, metas)` | `key: string`, `metas: object` | `void` | Write or replace object metadata. |

```ts
const meta = client.getMetadata("/media/photo.jpg")
client.putMetadata("/media/photo.jpg", { alt: "cover" })
```

## RawStorageObjectModel Fields

| Field | illustrate |
|------|------|
| `id` | ObjectId (some providers) |
| `key` | object key |
| `url` | Access address |
| `name` | file name |
| `size` | Byte size |
| `downloadUrl` | Download link |
| `lastModified` | last modified time |

## Related Docs

- [k.media](../media/) — site media library
- [k.file](../file/file.md) — site directory file
- [k.net.url](../net/url.md) — Pull remote URL binary
