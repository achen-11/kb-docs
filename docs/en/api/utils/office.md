# k.utils.office

> Office document processing (Excel)

## Overview

`k.utils.office` currently exposes **`excel`** child objects, read and write `.xls` / `.xlsx` (site files or bytes).

```ts
const names = k.utils.office.excel.readSheetNames("data/report.xlsx")
const rows = k.utils.office.excel.readAsObjects("data/report.xlsx", "Sheet1")
```

## Excel common methods

| method | illustrate |
|------|------|
| `getWorkBook(fileName)` | Open workbook object |
| `getWorkBookFromBytes(buffer, extension)` | open from bytes |
| `createNewWorkbook(extension)` | Create new `.xls` or `.xlsx` |
| `readSheetNames` / `readSheetNamesFromBytes` | List of worksheet names |
| `readAsObjects` / `readAsObjectsFromBytes` | Read as an object array (the first line is used as the field name) |
| `readAsArrays` / `readAsArraysFromBytes` | Read as a two-dimensional array |

Optional `KExcelReadRange`: `firstRowIndex`, `lastRowIndex`, `firstColumnIndex`, `lastColumnIndex`.

## KWorkBook/KSheet

Workbooks: `sheets`, `createSheet(name)`, `write(fileName)`, `readAsBytes()`.

Worksheets: `getObjectData(range)`, `fillObjectData(json)`, `fillArrayData(arrays)`, `rows`, etc.

## Related Docs

- [k.utils.converter](./converter.md) — Office to HTML (cloud)
- [k.file](../file/file.md)
