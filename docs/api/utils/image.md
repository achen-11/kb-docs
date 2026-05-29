# k.utils.image

> 图片格式、尺寸与水印

## 概述

`k.utils.image` 在脚本中处理图片字节或站点 `FileInfo`。

## changeFormat()

将图片字节转为新扩展名对应格式。

## resize()

| 重载 | 说明 |
|------|------|
| `resize(file, height, width, saveAs?)` | 调整站点文件 |
| `resize(bytes, height, width)` | 调整字节数组 |

## changeDpi()

修改 DPI 并保存为站点文件。

## addWatermark()

为图片字节添加水印；`WatermarkOptions` 含 `align`、`justify`、`opacity`、`offsetX/Y`、`repeat`。

## getSize() / getFrameCount() / getGifFrameCount() / convertToTwoFramesGif()

读取尺寸、帧数或转换 GIF。

## 相关文档

- [k.media](../media/) — 媒体库
- [k.file](../file/file.md)
