# 媒体库选择与前台展示

> 用 `k.media` 读取媒体库图片，给前台页面提供可选择、可预览的图片列表。

## 适用场景

这套做法适合需要从媒体库选择并展示图片的业务场景：

- 首页 Banner、活动封面、商品图、团队头像等前台展示；
- 运营先在后台媒体库维护素材，前台页面只读取和选择；
- 表单或配置中保存媒体路径，再由页面渲染预览；
- 需要把媒体路径和业务记录关联，而不是每次重新上传。

如果需求是接收用户上传文件，请先看 [文件上传](../content/file-upload.md)。如果图片需要裁剪、缩略图或压缩，应在上传或发布流程里单独处理，不要把媒体库选择页面变成图片处理器。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS 媒体库 | 后台上传、管理和预览图片素材 | [媒体库](/cms/site/media) |
| Media API | 列文件夹、读取文件信息、按路径或 ID 获取媒体 | [k.media](/api/media/) |
| API | 统一返回前台需要的媒体字段和选择结果 | [k.api](/api/api/) |
| Page | 渲染图库、点击选择、展示 previewUrl | [Page](/templateEngine/page/) |

## 推荐架构

前台页面不直接依赖后台媒体库 UI，而是通过 API 读取受控目录：

```text
CMS 媒体库 / 脚本 seed
   ↓
/guide-gallery/*.png
   ↓
/api/media-gallery/list
   ↓
Page 渲染图库
   ↓
/api/media-gallery/select?path=...
   ↓
返回选中图片 id、filePath、previewUrl
```

业务数据中建议保存 `filePath` 或媒体 ID。页面展示时再通过 API 读取媒体详情，避免把过期 URL、外部域名或临时预览地址硬编码进业务表。

## API：列出媒体库图片

先限制一个业务目录，例如 `/guide-gallery`：

```ts
// @k-url /api/media-gallery/{action}

const folderPath = "/guide-gallery";

function ensureFolder() {
  const exists = k.media.subFolders("/")
    .some((folder) => folder.fullPath === folderPath || folder.name === "guide-gallery");

  if (!exists) {
    k.media.createFolder("guide-gallery", "/");
  }
}
```

`folderFiles()` 返回的字段在不同运行路径里可能存在大小写差异。API 可以做一层响应归一化，只把前台需要的字段暴露出去：

```ts
function normalizeItem(file) {
  return {
    id: String(file.id || file.Id || ""),
    name: String(file.name || file.Name || ""),
    filePath: String(file.filePath || file.FilePath || ""),
    size: String(file.size || file.Size || ""),
    previewUrl: String(file.previewUrl || file.PreviewUrl || ""),
    lastModified: String(file.lastModified || file.LastModified || ""),
  };
}

k.api.get("list", () => {
  ensureFolder();

  const items = k.media.folderFiles(folderPath).map(normalizeItem);
  return {
    success: true,
    folder: folderPath,
    count: items.length,
    items,
  };
});
```

前台一般不需要完整媒体对象。只返回 `id`、`name`、`filePath`、`previewUrl`、`size` 等必要字段，接口会更稳定。

## API：选择媒体并限制目录

选择接口可以按路径或 ID 获取单个媒体，但要限制业务目录：

```ts
k.api.get("select", () => {
  ensureFolder();

  const path = String(k.request.queryString.get("path") || "").trim();
  if (!path) {
    return { success: false, code: "MISSING_MEDIA", message: "缺少媒体路径。" };
  }

  if (!path.startsWith(`${folderPath}/`)) {
    return { success: false, code: "INVALID_PATH", message: "只能选择业务图库目录下的媒体。" };
  }

  const file = k.media.get(path);
  if (!file) {
    return { success: false, code: "NOT_FOUND", message: "媒体文件不存在。" };
  }

  return {
    success: true,
    selected: normalizeItem(file),
  };
});
```

这个目录限制很重要。否则前端可以传入任意媒体路径，让一个业务页面读取到不该出现的素材。

## Page：渲染图库和当前选择

页面只关心 API 返回的稳定字段：

```html
<!-- @k-url /media-gallery -->
<button id="list" type="button">刷新图库</button>
<div id="gallery"></div>
<aside id="selected">尚未选择图片</aside>

<script>
  async function list() {
    const response = await fetch("/api/media-gallery/list");
    return response.json();
  }

  async function select(path) {
    const response = await fetch(`/api/media-gallery/select?path=${encodeURIComponent(path)}`);
    return response.json();
  }

  function renderGallery(items) {
    const gallery = document.querySelector("#gallery");
    gallery.innerHTML = "";

    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = `<img src="${item.previewUrl}" alt="${item.name}"><span>${item.name}</span>`;
      button.addEventListener("click", async () => {
        const data = await select(item.filePath);
        renderSelected(data.selected);
      });
      gallery.appendChild(button);
    });
  }
</script>
```

如果选择结果要保存到业务表，只保存 `filePath` 或 ID。保存前仍要在服务端重新校验媒体存在，并确认路径属于允许目录。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 业务目录不存在 | `ensureFolder()` 幂等创建，或返回空列表 |
| 目录为空 | 返回 `count: 0` 和空数组，页面展示空状态 |
| 缺少媒体路径 | 返回 `MISSING_MEDIA` |
| 路径越界 | 返回 `INVALID_PATH` |
| 媒体不存在 | 返回 `NOT_FOUND` |
| 字段大小写不一致 | API 统一归一化响应字段 |
| 需要权限 | 选择和保存时校验用户角色、业务归属或栏目权限 |

## 相关

- [媒体库](/cms/site/media)
- [k.media](/api/media/)
- [文件上传](../content/file-upload.md)
- [Page](/templateEngine/page/)
