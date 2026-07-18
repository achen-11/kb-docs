# 文件上传

> 用 Page 的 `FormData` 上传图片，API 读取 `k.request.files`，校验后写入 Kooboo 站点图片库并返回可预览 URL。

## 适用场景

这套做法适合头像、活动图片、商品图、报名附件缩略图、资料封面等普通图片上传场景。它强调上传入口的服务端校验、站点图片库存储和前台预览。

不适合直接处理大视频、超大附件、断点续传或私密文件下载。大文件应单独使用断点上传方案；需要权限保护的文件不要只依赖不可猜 URL，应在业务 API 中做访问控制。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 用 file input 和 FormData 提交文件 | [Page](/templateEngine/page/) |
| Request | 读取 multipart 中的 `k.request.files` 和表单字段 | [k.request](/api/request/) |
| Site Images | 写入站点图片库、列出文件、返回预览 URL | [媒体库选择与前台展示](../media/media-gallery.md) |
| API | 校验文件、限制目录、上传、删除和重置 | [k.api](/api/api/) |
| CMS | 后台查看媒体库图片资源 | [媒体库](/cms/site/media) |

::: tip `k.site.images`、`k.file` 和 CMS 文件库不是一回事
图片上传并要前台展示时，优先使用 `k.site.images` 写入站点图片库。`k.file` 操作的是站点磁盘目录，适合普通文件读写；后台 **内容 → 文件** 是 CMS 文件库，目前不等同于 `k.file`。
:::

## 推荐架构

上传流程应由服务端控制目标目录、文件名和可写范围：

```text
Page file input
   ↓ FormData
/api/upload/image
   ↓
读取 k.request.files[0]
   ↓
校验 MIME、扩展名、大小
   ↓
k.site.images.addImage("/guide-uploads/xxx.png", file.bytes, "xxx.png")
   ↓
k.site.images.getByUrl(path) 返回可预览图片
```

不要让前端直接提交完整目标路径，也不要把用户上传文件名原样当作最终路径。服务端应清理文件名、限制目录，并用时间戳或业务 ID 防止覆盖。

## API：上传到站点图片库

下面示例只允许图片，并限制到 `/guide-uploads/` 目录：

```ts
// Example route: /api/upload/{action}

const uploadFolder = "/guide-uploads";
const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const maxBytes = 1024 * 1024;

function safeName(fileName: string) {
  return String(fileName || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || `upload-${Date.now()}.png`;
}

function uploadPath(fileName: string) {
  return `${uploadFolder}/${Date.now()}-${safeName(fileName)}`;
}

function imageView(file: any, path: string) {
  return {
    id: file?.id || file?.Id || "",
    name: file?.name || file?.Name || path.split("/").pop(),
    path,
    url: file?.url || file?.Url || path,
  };
}
```

上传接口读取 `k.request.files[0]`，校验后调用 `k.site.images.addImage()`：

```ts
k.api.post("image", () => {
  const file = k.request.files[0];
  if (!file) {
    return { success: false, code: "MISSING_FILE", message: "请选择要上传的图片。" };
  }

  if (!allowedTypes.includes(file.contentType)) {
    return { success: false, code: "INVALID_TYPE", message: "只允许上传 PNG、JPEG、WebP 或 GIF 图片。" };
  }

  if (file.bytes.length > maxBytes) {
    return { success: false, code: "FILE_TOO_LARGE", message: "图片不能超过 1MB。" };
  }

  const name = safeName(file.fileName);
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return { success: false, code: "INVALID_EXTENSION", message: "文件扩展名必须是 png、jpg、jpeg、webp 或 gif。" };
  }

  const path = uploadPath(name);
  k.site.images.addImage(path, file.bytes, name);
  const saved = k.site.images.getByUrl(path);

  return {
    success: true,
    file: imageView(saved, path),
  };
});
```

真实项目里，图片尺寸、扩展名、MIME、文件头和用户权限都应按业务要求补齐。MIME 和扩展名校验只是第一层防线。

## API：列表、删除和清理

上传后通常需要返回列表或预览。列表可以用 `getByFolder()`：

```ts
k.api.get("list", () => {
  const files = (k.site.images.getByFolder(uploadFolder) || [])
    .map((file) => imageView(file, file.filePath || file.FilePath || file.url || file.Url))
    .filter((file) => file.path.startsWith(`${uploadFolder}/`));

  return {
    success: true,
    data: {
      folder: uploadFolder,
      files,
    },
  };
});
```

删除接口必须限制可删除目录，防止前端传入任意媒体路径：

```ts
k.api.post("delete", () => {
  const path = String(k.request.form.get("path") || "").trim();

  if (!path.startsWith(`${uploadFolder}/`)) {
    return { success: false, code: "INVALID_PATH", message: "只能删除上传目录下的文件。" };
  }

  const image = k.site.images.getByUrl(path);
  if (!image) {
    return { success: false, code: "NOT_FOUND", message: "文件不存在。" };
  }

  k.site.images.delete(image.id || path);
  return { success: true };
});
```

删除真实业务文件前，应检查当前用户是否拥有该文件或业务记录。不要只凭前端隐藏按钮保护删除操作。

## Page：用 FormData 上传

前台页面使用普通 file input，把文件放进 `FormData`：

```html
<!-- Example route: /file-upload -->
<input id="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
<button id="upload" type="button">上传图片</button>
<pre id="result">等待操作。</pre>

<script>
  async function uploadSelected() {
    const file = document.querySelector("#file").files[0];
    const form = new FormData();

    if (file) {
      form.append("file", file);
    }

    const response = await fetch("/api/upload/image", {
      method: "POST",
      body: form,
    });

    return response.json();
  }

  document.querySelector("#upload").addEventListener("click", async () => {
    const data = await uploadSelected();
    document.querySelector("#result").textContent = JSON.stringify(data, null, 2);
  });
</script>
```

上传成功后使用返回的 `url` 展示图片。若上传后还要写报名记录、商品图关系或用户头像，应在同一个服务端流程里记录业务关联，避免只上传了文件却没有业务归属。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 没有文件 | 返回 `MISSING_FILE` |
| MIME 不允许 | 返回 `INVALID_TYPE` |
| 扩展名不允许 | 返回 `INVALID_EXTENSION` |
| 文件过大 | 返回 `FILE_TOO_LARGE` |
| 写入站点图片库失败 | 返回 `WRITE_FAILED`，保留前端重试入口 |
| 删除路径越界 | 返回 `INVALID_PATH`，只允许删除业务目录 |
| 删除不存在文件 | 返回 `NOT_FOUND` |
| 需要权限 | 在 API 中校验用户、角色和业务归属 |

## 相关

- [k.request](/api/request/)
- [媒体库选择与前台展示](../media/media-gallery.md)
- [k.file](/api/file/file)
- [k.file/resumable](/api/file/file-resumable)
- [媒体库](/cms/site/media)
