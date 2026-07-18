# 资源对账与远端清理

`kb check` 比较本地项目和远端站点。`kb prune` 根据对账结果查找只存在于远端的资源，并在明确确认后删除。

建议始终先运行 `check`，确认目标站点和差异清单，再考虑 `prune`。

## 运行资源对账

```bash
kb check
```

限定范围：

```bash
kb check js
kb check page/admin
kb check images/banner.png
kb check module/shop
```

报告会区分已同步、仅本地、仅远端、内容不一致、已忽略和检查失败的资源，并给出适合推送或清理的提示。

## 对比级别

```bash
kb check --level 1
kb check --level 2
kb check --level 3
```

| 级别 | 对比内容 | 适用场景 |
|------|----------|----------|
| `1` | 资源清单 | 快速发现仅本地或仅远端资源 |
| `2` | 清单和元数据 | 检查名称、路径、URL 等资源信息 |
| `3` | 清单、元数据和内容 | 发布前确认同名资源内容是否一致 |

级别越高，需要读取和比较的内容越多。日常快速检查使用 level 1，重要发布再使用 level 3。

## 输出格式与报告文件

```bash
kb check --format table
kb check --format json
kb check --format silent
kb check --level 3 --output .kooboo/check-report.json
```

| 参数 | 说明 |
|------|------|
| `--format table` | 在终端显示易读汇总，默认值 |
| `--format json` | 在终端输出完整 JSON |
| `--format silent` | 不在终端打印对账表 |
| `--output <path>` | 将完整报告写入文件 |

`.pushignore` 匹配的本地文件会在报告中标记为已忽略。

## 预览远端清理

```bash
kb prune
```

不加 `--yes` 时，`kb prune` 只生成清理计划，不删除远端资源。限定范围：

```bash
kb prune js
kb prune module/shop
```

使用已保存的对账报告：

```bash
kb check --level 3 --output .kooboo/check-report.json
kb prune --report .kooboo/check-report.json
```

使用报告时，确认报告中的站点与当前连接的站点一致。

## 执行删除

确认预览清单无误后：

```bash
kb prune --report .kooboo/check-report.json --yes
```

或者直接对指定范围重新对账并删除：

```bash
kb prune js --yes
```

首页等受保护资源默认会被跳过。只有明确需要删除受保护资源时才添加：

```bash
kb prune --report .kooboo/check-report.json --yes --force
```

`--force` 会扩大可删除范围。执行前保存站点版本或导出备份，并逐项检查清理计划。

## 临时指定连接信息

`check` 和 `prune` 支持：

```bash
kb check \
  --site-url https://example.com \
  --username your-username \
  --password your-password
```

日常使用仍建议通过项目 `.env` 固定目标站点，减少报告和实际站点不一致的风险。

## 推荐流程

```bash
git status --short
kb check --level 3 --output .kooboo/check-report.json
kb prune --report .kooboo/check-report.json
# 人工检查清理计划
kb prune --report .kooboo/check-report.json --yes
kb check --level 3
```

## 相关文档

- [推送本地资源](./push.md)
- [导出站点](./export.md)
- [常见问题](../troubleshooting.md)
