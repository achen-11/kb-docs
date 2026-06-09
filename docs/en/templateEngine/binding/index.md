# Template Binding Syntax

> Server-side `k-*` directives for binding data and attributes inside Layout, Page, and View templates.

Kooboo template bindings are evaluated on the **server** and must be used with **`env="server"`**. They are meant for HTML resources such as [Page](../page/) and [View](../view/), not for Vue or React running in the browser.

## `env="server"`

Switches an element and its subtree into server-rendering mode. You can use it on normal elements or on `<script>`.

::: tip Inheritance
Declare `env="server"` once on a parent or higher ancestor. Child elements inherit it automatically, so you do not need to repeat it.
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

Page-level variables can also live directly on a script tag:

```html
<script env="server">
    var msg = "hello";
</script>
<div env="server" k-content="msg"></div>
```

## `k-if`

Renders an element only when the condition is true.

```html
<div env="server">
    <script>
        var isShow = true;
    </script>
    <div k-if="isShow">hello</div>
</div>
```

## `k-for`

Renders a loop. `repeat-self` means the current element itself is reused as the container for each repeated item.

```html
<div env="server">
    <script>
        var list = [{ label: "apple" }, { label: "orange" }];
    </script>
    <div k-for="item in list" repeat-self k-content="item.label"></div>
</div>
```

## `k-content`

Binds text content.

```html
<div env="server">
    <script>
        var blogTitle = "hello";
    </script>
    <h1 k-content="blogTitle"></h1>
</div>
```

## `k-attribute`

The unified syntax for attribute binding. Separate multiple attributes with `;`.

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

Dynamic attribute names:

```html
<a k-attribute="[dynamicKey] linkUrl">About</a>
```

::: warning JavaScript expression concatenation is not supported
`k-attribute` does **not** execute operators such as `+`. For path building, use brace interpolation:

```html
<a k-attribute="href /detail?id={itemId}">Detail</a>
```

`{var}` only accepts a variable name or field path. Expressions such as `{pageIndex - 1}` are not supported. Calculate the value first, then bind it.
:::

## `k-label`

Renders a label in the current language.

```html
<h1 k-label="title">Default title</h1>
```

See also [k.label / k.t](/en/api/label/).

## `type="module"` {#type-module}

Server-side module scripts can `import` other CodeBlocks and `export` symbols back to the template:

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

## Related

- [Page](../page/) and [View](../view/)
- [k-data](../k-data/) - declarative data flow that replaces `k-query`
