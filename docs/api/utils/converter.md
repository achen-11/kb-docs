# k.utils.converter

> 调用 Kooboo 转换服务（HTML/PDF、Office、GIF 等）

## 概述

`k.utils.converter` 通过 Kooboo 云端转换服务处理文档，依赖 `UrlSetting.Converter` 服务可用。

## htmlToPdf()

将 HTML 转为 PDF 字节数组；可选 `appendTexts` 页眉页脚配置。

```ts
const pdf = k.utils.converter.htmlToPdf("<div>Hello</div>")
k.file.writeBinary("out/report.pdf", pdf)
```

## gifToWebp()

GIF 转 WebP，参数为 GIF 字节数组。

## officeToHTML()

上传 Office 文件字节，返回 HTML 字符串；关联资源会同步进站点数据库。

```ts
const html = k.utils.converter.officeToHTML(file.bytes, file.fileName)
```

## officeToCleanHTML()

与 `officeToHTML` 类似，输出经清理的 HTML（具体规则以运行时为准）。

## 相关文档

- [k.utils.office](./office.md) — 本地 Excel 读写
- [k.file](../file/file.md)
