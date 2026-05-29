# View（视图）

> 可复用的 HTML 片段，通过 `<view id="...">` 嵌入 Page / Layout / 其他 View

## 是什么

**View**（后台有时称为组件 / Component）是站点内的一段 HTML 模板，**没有独立 URL**。在任意模板中写：

```html
<view id="hero"></view>
```

渲染时替换为名为 `hero` 的 View 资源内容，并继续解析其中的 `env="server"`、嵌套 `<view>` 等。

## 适用场景

| 适合放进 View | 留在 Page |
|---------------|-----------|
| 全站 Header / Footer | 路由级 `<layout>` 与 `<placeholder>` |
| 商品卡片、文章列表项 | 本页唯一、不复用的大段文案 |
| 带独立数据准备的区块 | 仅组合多个 View 的薄 Page |

## 结构建议

每个 View 最外层使用带 `class` 的语义容器，避免污染全局：

```html
<section class="hero">
    <script env="server">
        var title = 'Welcome';
    </script>
    <h1 k-content="title"></h1>
    <view id="hero_cta"></view>
</section>
```

推荐顺序：

1. `<script env="server">` — 准备本区块数据  
2. HTML 结构 + `k-content` / `k-for` 等  
3. 前端交互 — 底部 `<script>` 或引用 [Script](./js.md)

## 命名

View 的 `id` 与资源 **name** 一致。建议 **snake_case**，例如 `product_list`、`site_header`。

## 嵌套

View 内可再引用其他 View：

```html
<view id="other_view"></view>
```

注意避免循环引用（A 引 B、B 又引 A）。

## 与 Layout / Page 的区别

| 资源 | 引用方式 | 路由 |
|------|----------|------|
| Layout | Page 用 `<layout id>` | 无 |
| Page | 站点 URL | 有 |
| View | `<view id>` | 无 |

## 用脚本管理 View

`k.site.views` 的增删改查见 [k.site.views](/api/site/view.md)。

## 相关文档

- [Page](./page.md)
- [模板绑定语法](./template-binding-syntax.md)
- [Script](./js.md)
