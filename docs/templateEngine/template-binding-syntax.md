# 模板绑定语法

> 服务端 `k-*` 指令：在 Layout / Page / View 中绑定数据与属性

Kooboo 模板绑定在**服务器端**求值，需配合 **`env="server"`**（见下文）。用于 [Page](./page.md)、[View](./view.md) 等 HTML 资源，与浏览器中的 Vue/React 无关。

## env="server"

将元素及其子树切换到服务端渲染模式（适用于普通标签或 `<script>`）。

::: tip 继承
在**父级或更高祖先**声明一次即可，子元素自动继承，无需重复写 `env="server"`。
:::

```html
<div env="server">
    <script>
        var msg = "hello";
        var imageUrl = "/images/logo.png";
        var list = [{ title: "apple" }, { title: "orange" }];
    </script>
    <div k-content="msg"></div>
    <img k-attribute="src imageUrl">
    <div k-for="item in list" repeat-self k-content="item.title"></div>
</div>
```

页面级变量可单独写在脚本标签上：

```html
<script env="server">
    var msg = "hello";
</script>
<div env="server" k-content="msg"></div>
```

## k-if

按条件输出元素。

```html
<div env="server">
    <script>
        var isShow = true;
    </script>
    <div k-if="isShow">hello</div>
</div>
```

## k-for

循环渲染；`repeat-self` 表示复用当前元素本身作为循环项容器。

```html
<div env="server">
    <script>
        var list = [{ label: "apple" }, { label: "orange" }];
    </script>
    <div k-for="item in list" repeat-self k-content="item.label"></div>
</div>
```

## k-content

绑定文本内容。

```html
<div env="server">
    <script>
        var blogTitle = "hello";
    </script>
    <h1 k-content="blogTitle"></h1>
</div>
```

## k-attribute

统一用于属性绑定；多个属性用 `;` 分隔。

```html
<div env="server">
    <script>
        var imageUrl = "/images/logo.png";
        var linkHref = "/about";
        var isActive = true;
        var itemId = 123;
        var classObj = { active: true, 'text-danger': false };
        var attrsObj = { id: 'container', class: 'wrapper' };
    </script>

    <a k-attribute="href linkHref">About Us</a>
    <img k-attribute="src imageUrl">
    <img k-attribute="src imageUrl; alt 'Logo'">
    <a k-attribute="href /detail?id={itemId}">Detail</a>
    <div k-attribute="class {active: isActive}">Content</div>
    <div k-attribute="class classObj">Content</div>
    <div k-attribute="attrsObj"></div>
</div>
```

动态属性名：

```html
<a k-attribute="[dynamicKey] linkUrl">About</a>
```

::: warning 不支持 JS 表达式拼接
`k-attribute` **不执行** `+` 等运算。路径拼接用花括号插值：

```html
<a k-attribute="href /detail?id={itemId}">Detail</a>
```

`{var}` 只接受变量名或字段路径，不支持 `{pageIndex - 1}` 这类运算；请先算好再绑定。
:::

## k-label

按当前语言渲染标签文案。

```html
<h1 k-label="title">默认标题</h1>
```

更多见 [k.label / k.t](/api/label/)。

## type="module" {#type-module}

服务端 module 脚本可 `import` 其他 CodeBlock 并向模板 `export` 符号：

```html
<script type="module" env="server">
    import { getBlogDetail } from "./Services.Blog";
    const blogDetail = getBlogDetail();
    export { blogDetail }
</script>
<div env="server">
    <div k-content="blogDetail.title"></div>
</div>
```

## 相关文档

- [Page](./page.md) · [View](./view.md)
- [k-data](./k-data.md) — 声明式数据（替代 k-query）
