# CMS 文档截图

将配图放在此目录下，在 Markdown 中用站点根路径引用，例如：

```markdown
<DocImage src="/cms/getting-started/01-login.png" alt="我的站点首页" width="1120" />
```

正文内图片支持点击放大。也可使用 Markdown 图片语法或带 `bordered-image` 的 `<img>`。

- 本地：`pnpm docs:dev` 可直接预览。
- 发布：`pnpm docs:build:kooboo` 会复制到 `kb-remote-site/images/cms/`，再 `kb push images/cms`。
