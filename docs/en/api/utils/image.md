# k.utils.image

> Image format, size and watermark

## Overview

`k.utils.image` handles image bytes or site `FileInfo` in a script.

## changeFormat()

Convert the image bytes to the format corresponding to the new extension.

## resize()

| Overload | Description |
|------|------|
| `resize(file, height, width, saveAs?)` | Adjust site files |
| `resize(bytes, height, width)` | Adjust byte array |

## changeDpi()

Modify the DPI and save as site file.

## addWatermark()

Add watermark to image bytes; `WatermarkOptions` includes `align`, `justify`, `opacity`, `offsetX/Y`, `repeat`.

## getSize() / getFrameCount() / getGifFrameCount() / convertToTwoFramesGif()

Read dimensions, frame number or convert GIF.

## Related Docs

- [k.media](../media/) — Media library
- [k.file](../file/file.md)
