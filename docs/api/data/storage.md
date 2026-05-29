# k.storage

> 站点配置的云对象存储（OSS / S3 / Azure Blob）

## 概述

`k.storage` 访问在 Kooboo **控制台 → 设置** 中启用并配置的对象存储提供商。每个已启用的提供商对应一个客户端，用于列举、上传、复制、删除对象及读写元数据。

::: tip 与 k.media、k.file 的区别
| API | 存储位置 | 典型用途 |
|-----|----------|----------|
| **`k.storage`** | 阿里云 OSS、Amazon S3、Azure Blob 等 | 大文件、CDN 源、与云控制台一致的桶 |
| **`k.media`** | 站点媒体库 | 后台图片素材、站内预览 URL |
| **`k.file`** | 站点目录文件 | 脚本、配置、普通磁盘文件 |
:::

提供商名称（须与控制台一致，大小写敏感）：

| 名称 | 服务 |
|------|------|
| `AliyunOSS` | 阿里云对象存储 |
| `AmazonS3` | Amazon S3 |
| `AzureBlob` | Azure Blob Storage |

```ts
const oss = k.storage.AliyunOSS
// 或
const oss = k.storage.get("AliyunOSS")
```

未配置或未启用的名称在调用时会失败，使用前请在目标站点确认存储设置已开启。

## listObjects()

列举指定前缀下的文件与文件夹（分页）。

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

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | `string` | 是 | 前缀路径，如 `/media/` |
| `options` | `QueryOptions` | 否 | 分页选项 |

**返回：** `ListObjectsResponse`

| 字段 | 说明 |
|------|------|
| `files` | `RawStorageObjectModel[]` |
| `folders` | `RawStorageFolderModel[]` |
| `hasMore` | 是否还有下一页 |
| `lastModified` | 本页最近修改时间 |

### QueryOptions

| 字段 | 说明 |
|------|------|
| `takeCount` | 每页条数，默认 `10` |
| `startAfter` | 上一页最后一个文件的 `key`，用于翻页 |

```ts
let page = client.listObjects("/media/", { takeCount: 20 })
if (page.hasMore) {
    const lastKey = page.files[page.files.length - 1].key
    page = client.listObjects("/media/", { takeCount: 20, startAfter: lastKey })
}
```

## searchObjects()

按关键字搜索指定前缀下的对象。

```ts
const page = client.searchObjects("/media/", "banner", { takeCount: 10 })
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `path` | `string` | 是 | 搜索前缀 |
| `keyword` | `string` | 是 | 关键字 |
| `options` | `QueryOptions` | 否 | 分页 |

**返回：** `SearchObjectsResponse`（含 `files`、`hasMore`、`lastModified`，无 `folders`）

## putObject()

上传对象。

```ts
k.api.post("upload", () => {
    const file = k.request.files[0]
    const key = "/media/uploads/" + file.fileName
    const client = k.storage.AliyunOSS
    const result = client.putObject(key, file.bytes, { alt: file.fileName })
    return { key: result.key, url: result.url }
})
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `key` | `string` | 是 | 对象键（路径） |
| `bytes` | `number[]` | 是 | 文件内容 |
| `metas` | `object` | 否 | 元数据（如 `alt`），具体字段取决于提供商 |

**返回：** `RawStorageObjectModel`

## copyObject()

复制对象到新键。

```ts
client.copyObject("/media/a.png", "/media/backup/a.png")
```

## createFolder()

创建文件夹（逻辑前缀）。

```ts
client.createFolder("/media/my-folder/")
```

## isUniqueKey()

检查键是否尚未使用。

```ts
if (!client.isUniqueKey(key)) {
    throw new Error("Duplicated key: " + key)
}
```

## deleteObjects() / deleteFolders()

```ts
client.deleteObjects(["/media/a.png", "/media/b.png"])
client.deleteFolders(["/media/old-folder/"])
```

## generateDownloadUrl()

生成对象的临时下载 URL。

```ts
const url = client.generateDownloadUrl("/media/report.pdf")
```

## getMetadata() / putMetadata()

```ts
const meta = client.getMetadata("/media/photo.jpg")
client.putMetadata("/media/photo.jpg", { alt: "cover" })
```

## RawStorageObjectModel（常用字段）

| 字段 | 说明 |
|------|------|
| `id` | 对象 Id（部分提供商） |
| `key` | 对象键 |
| `url` | 访问地址 |
| `name` | 文件名 |
| `size` | 字节大小 |
| `downloadUrl` | 下载链接 |
| `lastModified` | 最后修改时间 |

## 相关文档

- [k.media](../site/media.md) — 站点媒体库
- [k.file](../file/file.md) — 站点目录文件
- [k.net.url](../net/url.md) — 拉取远程 URL 二进制
