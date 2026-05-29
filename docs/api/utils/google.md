# k.utils.google

> Lighthouse 报告与 JSON 存取

## 概述

`k.utils.google` 封装 Lighthouse 相关远程调用与报告解析（非 Google OAuth API）。

## LHRJson() / LHRUrl()

对绝对 URL 生成 Lighthouse JSON 或在线报告链接；`mobileDevice` 控制移动/桌面模拟。

## parseJson() / saveJson() / getJson()

解析 Lighthouse JSON、保存到系统并凭 Id 取回。

## shortLhrReportUrl()

由 JSON 生成短报告 URL。

## 相关文档

- [k.utils.ninjible](./ninjible.md) — 站点迁移与 Lighthouse 对比
