# 模板引擎文档 Backlog

> 路径：`docs/templateEngine/**` · 与 `docs/api/site/*`（KScript CRUD）分工

## 已完成

| 主题 | 文件 | 说明 |
|------|------|------|
| 概述 | `index.md` | 资源关系、与 API 分工 |
| Layout | `layout/index.md` | `k-placeholder`、双栏 |
| Page | `page/index.md` | 完整页 / `<layout>` + `<placeholder>` |
| View | `view/index.md` | `<view id>`、拆分原则 |
| Script | `js/index.md` | 路由 JS、importmap |
| Style | `css/index.md` | 路由 CSS、Tailwind |
| 模板绑定 | `binding/index.md` | `env="server"`、`k-*` 指令 |
| k-data 占位 | `k-data/index.md` | 待写，替代 k-query |

## 待办

| 优先级 | 主题 | 参考 |
|--------|------|------|
| P0 | **k-data** 全文 | `Kooboo/.../references/Frontend/k-data/` |
| P1 | k-label 模板侧 | `references/Frontend/k-label.md` + `/api/label/` |
| P2 | 前端 code-style | `references/Frontend/code-style.md` |
| P3 | CDN-Vue 专题 | `references/Frontend/cdn-vue/` |

## 已移除

- `k-query.md`（rewrite → `k-data.md`）
