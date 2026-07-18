# 媒体库选择与前台展示

> 使用 `k.site.images` 管理站点媒体库图片，再通过业务 API 给前台页面提供可选择、可预览的图片列表。

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
| 站点图片仓库 | 按文件夹列出图片、按 URL 或 ID 读取、写入和删除图片 | [k.site](/api/site/) |
| API | 统一返回前台需要的媒体字段和选择结果 | [k.api](/api/api/) |
| Page | 渲染图库、点击选择、展示 `previewUrl` | [Page](/templateEngine/page/) |

## 推荐架构

前台页面不直接依赖后台媒体库 UI，而是通过 API 读取受控目录：

```text
CMS 媒体库 / 脚本 seed
   ↓
/guide-gallery/*.svg
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

## API：受控目录和字段归一化

先限制一个业务目录，例如 `/guide-gallery`。示例使用 `k.site.images.getByFolder()` 读取目录下的站点图片，并把运行时字段归一化为前台稳定字段：

```ts
// Example route: /api/media-gallery/{action}

const folderPath = "/guide-gallery";

function normalize(value: unknown) {
  return String(value || "").trim();
}

function isSafeGalleryPath(path: string) {
  const value = normalize(path);
  if (!value.startsWith(`${folderPath}/`)) return false;
  if (value.includes("..") || value.includes("\\") || value.includes("//")) return false;
  return value.length > folderPath.length + 1;
}

function normalizeItem(file: Record<string, any>) {
  const filePath = normalize(file.filePath || file.FilePath || file.url || file.Url);

  return {
    id: normalize(file.id || file.Id),
    name: normalize(file.name || file.Name),
    filePath: filePath.startsWith("/") ? filePath : `/${filePath}`,
    size: normalize(file.size || file.Size),
    previewUrl: normalize(file.previewUrl || file.PreviewUrl || file.url || file.Url),
    lastModified: normalize(file.lastModified || file.LastModified),
    alt: normalize(file.alt || file.Alt),
  };
}

k.api.get("list", () => {
  const items = (k.site.images.getByFolder(folderPath) || [])
    .map((file) => normalizeItem(file))
    .filter((item) => isSafeGalleryPath(item.filePath));

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

选择接口可以按路径或 ID 获取单个媒体，但要在服务端重新确认它属于业务目录：

```ts
k.api.get("select", () => {
  const id = normalize(k.request.queryString.get("id"));
  const path = normalize(k.request.queryString.get("path"));
  const value = id || path;

  if (!value) {
    return { success: false, code: "MISSING_MEDIA", message: "缺少媒体 ID 或路径。" };
  }

  if (path && !isSafeGalleryPath(path)) {
    return { success: false, code: "INVALID_PATH", message: "只能选择业务图库目录下的媒体。" };
  }

  const file = value.startsWith("/")
    ? k.site.images.getByUrl(value)
    : k.site.images.get(value);

  if (!file) {
    return { success: false, code: "NOT_FOUND", message: "媒体文件不存在。" };
  }

  const selected = normalizeItem(file);
  if (!isSafeGalleryPath(selected.filePath)) {
    return { success: false, code: "INVALID_PATH", message: "只能选择业务图库目录下的媒体。" };
  }

  return {
    success: true,
    selected,
  };
});
```

目录限制不能只放在前端。否则调用方可以传入任意媒体路径，让一个业务页面读取到不该出现的素材。除了检查前缀，也要拒绝 `../`、反斜杠和双斜杠这类路径穿越写法。

## API：准备演示素材

演示站点可以提供一个幂等的 `seed` 接口，用 `k.site.images.addImage()` 写入固定样例，方便验证脚本和页面重放：

```ts
function svgBytes(svg: string) {
  const bytes = [];
  for (let i = 0; i < svg.length; i++) {
    bytes.push(svg.charCodeAt(i));
  }
  return bytes;
}

k.api.post("seed", () => {
  k.site.images.addImage(
    `${folderPath}/hero-cover.svg`,
    svgBytes('<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"></svg>'),
    "Hero cover",
  );

  const items = (k.site.images.getByFolder(folderPath) || []).map(normalizeItem);
  return { success: true, folder: folderPath, count: items.length, items };
});
```

生产项目通常由运营在后台媒体库上传素材；`seed` 更适合验证站点、初始化脚本或自动化测试。

## Page：渲染图库和当前选择

页面只关心 API 返回的稳定字段：

```html
<!-- Example route: /media-gallery -->
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
      button.innerHTML = `<img src="${item.previewUrl}" alt="${item.alt || item.name}"><span>${item.name}</span>`;
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
| 业务目录不存在 | 返回空列表，或由初始化脚本创建素材 |
| 目录为空 | 返回 `count: 0` 和空数组，页面展示空状态 |
| 缺少媒体路径或 ID | 返回 `MISSING_MEDIA` |
| 路径越界或疑似穿越 | 返回 `INVALID_PATH` |
| 媒体不存在 | 返回 `NOT_FOUND` |
| 字段大小写不一致 | API 统一归一化响应字段 |
| 图片仓库 API 不可用 | 返回统一错误码，例如 `MEDIA_API_UNAVAILABLE` |
| 需要权限 | 选择和保存时校验用户角色、业务归属或栏目权限 |

## 上线前检查

- `list` 只返回受控目录下的图片。
- `select` 同时支持路径和 ID，并在服务端复验目录边界。
- 对 `/outside/image.svg`、`/guide-gallery/../private.svg` 等路径返回 `INVALID_PATH`。
- 前台只渲染 API 返回的 `previewUrl`，不要拼接未校验的外部 URL。
- 页面包含空状态、失败状态、当前选择和响应详情，移动端不横向溢出。
- 验证脚本覆盖 `seed`、`list`、`select`、缺参数、越界路径、缺失文件和清理步骤。

## 相关

- [媒体库](/cms/site/media)
- [k.site](/api/site/)
- [文件上传](../content/file-upload.md)
- [Page](/templateEngine/page/)
