#!/usr/bin/env python3
"""Compare docs/en/ with corresponding Chinese docs for 1:1 translation alignment."""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS = REPO_ROOT / "docs"


def parse_md(content: str) -> dict:
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            content = content[end + 3 :]

    headings = []
    for line in content.split("\n"):
        m = re.match(r"^(#{1,6})\s+(.+)$", line.strip())
        if m:
            headings.append((len(m.group(1)), m.group(2).strip()))

    code_blocks = re.findall(r"```[\w]*\n(.*?)```", content, re.DOTALL)
    doc_images = re.findall(r'<DocImage[^>]*src="([^"]*)"[^>]*/?>', content)
    table_rows = len(re.findall(r"^\|", content, re.MULTILINE))
    blockquotes = len(re.findall(r"^>\s", content, re.MULTILINE))
    list_items = len(re.findall(r"^[\-\*\+]\s", content, re.MULTILINE)) + len(
        re.findall(r"^\d+\.\s", content, re.MULTILINE)
    )
    char_count = len(re.sub(r"\s+", "", content))
    line_count = len([l for l in content.split("\n") if l.strip()])

    return {
        "headings": headings,
        "heading_count": len(headings),
        "code_blocks": len(code_blocks),
        "doc_images": doc_images,
        "doc_image_count": len(doc_images),
        "table_rows": table_rows,
        "blockquotes": blockquotes,
        "list_items": list_items,
        "char_count": char_count,
        "line_count": line_count,
    }


def compare_pair(zh_path: Path, en_path: Path) -> dict:
    zh = parse_md(zh_path.read_text(encoding="utf-8"))
    en = parse_md(en_path.read_text(encoding="utf-8"))
    issues: list[tuple[str, str]] = []
    ratio = en["char_count"] / zh["char_count"] if zh["char_count"] > 0 else 0

    if ratio < 0.5:
        issues.append(
            (
                "内容严重缩水",
                f"英文 {en['char_count']} 字符 vs 中文 {zh['char_count']} 字符 ({ratio:.0%})",
            )
        )
    elif ratio < 0.7:
        issues.append(
            (
                "内容明显偏短",
                f"英文 {en['char_count']} 字符 vs 中文 {zh['char_count']} 字符 ({ratio:.0%})",
            )
        )

    if en["heading_count"] < zh["heading_count"] * 0.6:
        zh_titles = [h[1] for h in zh["headings"]]
        issues.append(
            (
                "标题结构缺失",
                f"英文 {en['heading_count']} 个 vs 中文 {zh['heading_count']} 个。"
                f"中文标题: {', '.join(zh_titles[:8])}{'...' if len(zh_titles) > 8 else ''}",
            )
        )

    if en["table_rows"] < zh["table_rows"] * 0.5 and zh["table_rows"] > 3:
        issues.append(
            ("表格缺失", f"英文 {en['table_rows']} 行 vs 中文 {zh['table_rows']} 行")
        )

    if en["code_blocks"] < zh["code_blocks"] and zh["code_blocks"] > 0:
        issues.append(
            ("代码块缺失", f"英文 {en['code_blocks']} 个 vs 中文 {zh['code_blocks']} 个")
        )

    if en["doc_image_count"] < zh["doc_image_count"] and zh["doc_image_count"] > 0:
        missing = set(zh["doc_images"]) - set(en["doc_images"])
        issues.append(
            (
                "图片缺失",
                f"英文 {en['doc_image_count']} vs 中文 {zh['doc_image_count']}。"
                f"缺失: {', '.join(sorted(missing))}",
            )
        )

    if en["list_items"] < zh["list_items"] * 0.5 and zh["list_items"] > 5:
        issues.append(
            ("列表项缺失", f"英文 {en['list_items']} vs 中文 {zh['list_items']}")
        )

    if en["blockquotes"] < zh["blockquotes"] and zh["blockquotes"] > 2:
        issues.append(
            ("引用块/元信息缺失", f"英文 {en['blockquotes']} vs 中文 {zh['blockquotes']}")
        )

    return {
        "rel": str(en_path.relative_to(DOCS)),
        "ratio": ratio,
        "issues": issues,
        "zh_lines": zh["line_count"],
        "en_lines": en["line_count"],
        "zh_headings": zh["heading_count"],
        "en_headings": en["heading_count"],
        "aligned": len(issues) == 0 and ratio >= 0.7,
    }


def section_results(results: list[dict], section: str) -> list[dict]:
    if section == "index":
        return [r for r in results if r["rel"] == "en/index.md"]
    prefix = f"en/{section}/"
    return [r for r in results if r["rel"].startswith(prefix)]


def main() -> None:
    en_files = sorted(DOCS.glob("en/**/*.md"))
    results = [
        compare_pair(DOCS / f.relative_to(DOCS / "en"), f) for f in en_files
    ]

    aligned = [r for r in results if r["aligned"]]
    misaligned = [r for r in results if not r["aligned"]]
    severe = [r for r in misaligned if r["ratio"] < 0.3]
    moderate = [r for r in misaligned if 0.3 <= r["ratio"] < 0.5]
    mild = [r for r in misaligned if 0.5 <= r["ratio"] < 0.7]
    minor = [r for r in misaligned if r["ratio"] >= 0.7]

    lines: list[str] = []
    lines.append("# 英文文档与中文文档对齐审核报告\n")
    lines.append(
        f"> 生成时间: 2026-06-09  \n"
        f"> 审核范围: `docs/en/` 下全部 {len(en_files)} 篇英文文档，"
        f"与对应中文文档（`docs/` 同路径）进行结构对比\n"
    )

    lines.append("## 摘要\n")
    lines.append("| 指标 | 数量 |")
    lines.append("|------|------|")
    lines.append(f"| 英文文档总数 | {len(en_files)} |")
    lines.append(f"| 有对应中文文档 | {len(results)} |")
    lines.append(f"| **基本对齐** (内容 ≥70% 且结构完整) | **{len(aligned)}** |")
    lines.append(f"| **未对齐** | **{len(misaligned)}** |")
    lines.append(f"| 严重缺失 (<30% 内容) | {len(severe)} |")
    lines.append(f"| 中度缺失 (30-50%) | {len(moderate)} |")
    lines.append(f"| 轻度缺失 (50-70%) | {len(mild)} |")
    lines.append(f"| 结构问题 (≥70% 但缺标题/表格等) | {len(minor)} |")
    lines.append("")

    lines.append("### 按模块分布\n")
    lines.append("| 模块 | 总数 | 未对齐 | 对齐率 |")
    lines.append("|------|------|--------|--------|")
    for section in ["api", "cms", "templateEngine", "cli", "quick-start", "product", "index"]:
        sec = section_results(results, section)
        if not sec:
            continue
        sec_mis = [r for r in sec if not r["aligned"]]
        rate = (len(sec) - len(sec_mis)) / len(sec) * 100
        lines.append(f"| {section} | {len(sec)} | {len(sec_mis)} | {rate:.0f}% |")

    lines.append("")
    lines.append("## 结论\n")
    if not misaligned:
        exact_lines = sum(1 for r in results if r["zh_lines"] == r["en_lines"])
        lines.append(
            f"**全部 {len(en_files)} 篇英文文档已与中文版结构对齐**，可作为 1:1 翻译使用。"
        )
        lines.append("")
        lines.append(
            f"- 行数完全一致: {exact_lines} / {len(en_files)}"
        )
        lines.append(
            "- 英文字符量通常高于中文（约 115%–190%），属正常翻译差异"
        )
        lines.append("")
        lines.append("### 翻译规范\n")
        lines.append("| 项目 | 规则 |")
        lines.append("|------|------|")
        lines.append("| 结构 | 与中文相同的标题、表格、列表、admonition、代码块 |")
        lines.append("| 深链 URL | 保持不变 |")
        lines.append("| DocImage | `src=\"/cms/...\"`（运行时自动映射到 `/en/cms/...`） |")
        lines.append("| CMS 内链 | 相对路径 |")
        lines.append("| 跨区链接 | `/en/api/...`、`/en/templateEngine/...` |")
        lines.append("")
    else:
        lines.append("**英文文档并非中文版本的 1:1 翻译。** 主要问题集中在 CMS 模块：\n")
        lines.append(
            "- **API 文档** (`docs/en/api/`): 101 篇中仅 2 篇存在轻微不对齐，"
            "整体翻译质量较高，接近 1:1。"
        )
        lines.append(
            "- **CMS 文档** (`docs/en/cms/`): 89 篇中 **80 篇** 未对齐。"
            "英文版多为简短概述 + 部分截图 + Related 链接，"
            "缺少中文版的详细操作步骤、字段说明、表格和深链路径。"
        )
        lines.append(
            "- **模板引擎文档** (`docs/en/templateEngine/`): 12 篇中 1 篇未对齐。"
        )
        lines.append("- **首页** (`docs/en/index.md`): 与中文版结构不一致。")
        lines.append("")

        lines.append("### CMS 英文版典型模式（非 1:1 翻译）\n")
        lines.append("英文 CMS 文档普遍采用 **摘要式 stub** 写法，例如：\n")
        lines.append("```markdown")
        lines.append("# Carts")
        lines.append("> Menu: **Commerce -> Carts**")
        lines.append("Carts shows active shopping carts...")
        lines.append("<DocImage ... /> (仅保留部分截图)")
        lines.append("## Related")
        lines.append("- [Commerce API -> Cart](/en/api/commerce/cart.md)")
        lines.append("```\n")
        lines.append(
            "而对应中文版包含完整的菜单路径、深链 URL、列表字段说明、"
            "操作步骤、表格、多个章节等。"
        )
        lines.append("")

    def table_section(title: str, items: list[dict], detail: bool = False) -> None:
        lines.append("---\n")
        lines.append(f"## {title} — 共 {len(items)} 篇\n")
        if not items:
            lines.append("_无_\n")
            return
        if detail:
            lines.append(
                "| 文档 | 内容比 | 中文行数 | 英文行数 | 中文标题数 | 英文标题数 | 主要问题 |"
            )
            lines.append(
                "|------|--------|----------|----------|------------|------------|----------|"
            )
            for r in sorted(items, key=lambda x: x["ratio"]):
                issue_summary = "; ".join(i[0] for i in r["issues"][:3])
                lines.append(
                    f"| `{r['rel']}` | {r['ratio']:.0%} | {r['zh_lines']} | "
                    f"{r['en_lines']} | {r['zh_headings']} | {r['en_headings']} | "
                    f"{issue_summary} |"
                )
        else:
            lines.append("| 文档 | 内容比 | 主要问题 |")
            lines.append("|------|--------|----------|")
            for r in sorted(items, key=lambda x: x["ratio"]):
                issue_summary = "; ".join(f"{i[0]}: {i[1]}" for i in r["issues"][:2])
                lines.append(f"| `{r['rel']}` | {r['ratio']:.0%} | {issue_summary} |")
        lines.append("")

    table_section("严重缺失 (<30% 内容)", severe, detail=True)
    lines.append("这些文档的英文版仅为 stub，缺失绝大部分中文内容。\n")
    table_section("中度缺失 (30-50%)", moderate)
    table_section("轻度缺失 (50-70%)", mild)
    table_section("结构问题 (内容 ≥70% 但缺章节/表格等)", minor)

    lines.append("---\n")
    lines.append(f"## 基本对齐的文档 — 共 {len(aligned)} 篇\n")
    lines.append("<details>")
    lines.append("<summary>点击展开完整列表</summary>\n")
    for r in sorted(aligned, key=lambda x: x["rel"]):
        lines.append(f"- `{r['rel']}` ({r['ratio']:.0%})")
    lines.append("</details>\n")

    lines.append("---\n")
    lines.append("## 详细问题清单（未对齐文档）\n")

    for section in ["cms", "api", "templateEngine", "cli", "quick-start", "product", "index"]:
        sec_mis = [r for r in misaligned if r in section_results(results, section)]
        if not sec_mis:
            continue
        lines.append(f"### {section.upper()}\n")
        for r in sorted(sec_mis, key=lambda x: x["ratio"]):
            lines.append(f"#### `{r['rel']}`\n")
            lines.append(
                f"- **内容比**: {r['ratio']:.0%} "
                f"(中文 {r['zh_lines']} 行 → 英文 {r['en_lines']} 行)"
            )
            lines.append(
                f"- **标题数**: 中文 {r['zh_headings']} → 英文 {r['en_headings']}"
            )
            for issue_type, issue_detail in r["issues"]:
                lines.append(f"- **{issue_type}**: {issue_detail}")
            lines.append("")

    out_dir = DOCS.parent / ".local-review"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / "en-translation-audit.md"
    report = "\n".join(lines)
    out_path.write_text(report, encoding="utf-8")
    print(f"Report: {out_path} ({len(report)} chars, {len(lines)} lines)")
    print(f"Aligned: {len(aligned)}, Misaligned: {len(misaligned)}")


if __name__ == "__main__":
    main()
