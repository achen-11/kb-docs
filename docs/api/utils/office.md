# k.utils.office

> Office 文档处理（Excel）

## 概述

`k.utils.office` 当前暴露 **`excel`** 子对象，读写 `.xls` / `.xlsx`（站点文件或字节）。

```ts
const names = k.utils.office.excel.readSheetNames("data/report.xlsx")
const rows = k.utils.office.excel.readAsObjects("data/report.xlsx", "Sheet1")
```

## excel 常用方法

| 方法 | 说明 |
|------|------|
| `getWorkBook(fileName)` | 打开工作簿对象 |
| `getWorkBookFromBytes(buffer, extension)` | 从字节打开 |
| `createNewWorkbook(extension)` | 新建 `.xls` 或 `.xlsx` |
| `readSheetNames` / `readSheetNamesFromBytes` | 工作表名称列表 |
| `readAsObjects` / `readAsObjectsFromBytes` | 读为对象数组（首行作字段名） |
| `readAsArrays` / `readAsArraysFromBytes` | 读为二维数组 |

可选 `KExcelReadRange`：`firstRowIndex`、`lastRowIndex`、`firstColumnIndex`、`lastColumnIndex`。

## KWorkBook / KSheet

工作簿：`sheets`、`createSheet(name)`、`write(fileName)`、`readAsBytes()`。

工作表：`getObjectData(range)`、`fillObjectData(json)`、`fillArrayData(arrays)`、`rows` 等。

## 相关文档

- [k.utils.converter](./converter.md) — Office 转 HTML（云端）
- [k.file](../file/file.md)
