# VitePress 文档 Markdown 约定

> 适用于 `docs/cms/**`、`docs/api/**`、`docs/templateEngine/**` 等 VitePress 正文

## 标题与分割线（`---`）

本站主题在 **`.vp-doc` 内标题（`h2`、`h3` 等）上方会渲染一条与分割线同款的 border**。

因此：

| 做法 | 说明 |
|------|------|
| **不要**在 `##` / `###` 标题**紧上方**写 `---` | 会与标题自带 border **叠成两条线** |
| **不要**在标题**正下方**用 `---` 做「收尾」 | 通常多余；下一节若仍是标题，同样重复 |
| **可以**在**纯段落之间**使用 `---` | 上下都不是标题，且需要明显分段时（少用） |

**推荐**：章节之间直接用标题层级（`##`、`###`）分隔，不用 `---` 垫在标题前。

```markdown
<!-- 不推荐 -->
---

## 注意事项

<!-- 推荐 -->

## 注意事项
```

编写或 Review 文档时，若见标题上下有孤立的 `---`，应删掉靠标题一侧的那条。

## 与其它规范的关系

- CMS 呈现方式：[cms-documentation-workflow.md](./cms-documentation-workflow.md)
- API 正文表述：[api-documentation-workflow.md](./api-documentation-workflow.md)
- 配图路径：[documentation-images.md](./documentation-images.md)
