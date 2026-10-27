# 资源对账与远端清理

`kb check` 比较本地项目和远端站点。`kb prune` 根据对账结果审计只存在于远端的漂移资源，并在通过安全检查和明确确认后删除。

`prune` 是高风险维护工具，不是正式发布步骤。Git 中明确删除的资源应通过 [`kb deploy`](./deploy.md) 发布；只有清理旧部署残留、后台手工遗留或其他远端漂移时才使用 `prune`。

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

`.pushignore` 匹配的本地或远端资源会在报告中标记为已忽略，不会进入清理计划。

## 预览远端清理

```bash
kb prune
kb prune --output .kooboo/prune-plan.json
```

不加 `--yes` 时，`kb prune` 只生成清理计划，不删除远端资源。限定范围：

```bash
kb prune js
kb prune module/shop --allow-modules
```

使用已保存的限定范围对账报告：

```bash
kb check js --level 3 --output .kooboo/check-report.json
kb prune --report .kooboo/check-report.json
```

使用报告预览时，仍应确认报告中的站点、项目目录和目标范围。真正执行删除前，CLI 会重新进行实时 level 1 对账；报告与当前目标不一致时拒绝执行。

## 执行删除

全站 `kb prune` 只允许预览。执行删除必须指定 target，或使用由带 target 的 `kb check` 生成的报告。确认预览清单无误后：

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

`--force` 只解除首页等受保护页面的限制，不会解除模块保护或删除数量上限。

单次默认最多删除 20 项。计划超过该数量时，必须审查完整计划并显式提高上限：

```bash
kb prune js \
  --output .kooboo/prune-result.json \
  --max-delete 50 \
  --yes
```

模块文件默认受保护，并且不能通过全站或整个 `module` 范围批量解锁。必须限定到具体模块：

```bash
kb prune module/shop --allow-modules
kb prune module/shop --allow-modules --yes
```

如果该范围没有任何本地模块资源，CLI 会拒绝删除整个仅远程模块。模块在 Git 中被明确删除时应使用 `kb deploy --apply-deletes`；需要删除整个远端模块时应在后台单独审查。

以下情况会失败关闭，不执行任何删除：

- 本地资源无法识别或扫描失败；
- 执行删除时没有限定 target；
- 远端模块清单不完整；
- check 报告来自其他项目或已与实时对账不一致；
- 模块没有本地基线；
- 删除项超过 `--max-delete`；
- 报告与当前站点不一致。

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
kb check js --level 3 --output .kooboo/check-report.json
kb prune --report .kooboo/check-report.json
# 人工检查清理计划
kb prune --report .kooboo/check-report.json \
  --output .kooboo/prune-result.json \
  --yes
kb check js --level 3
```

## 相关文档

- [推送本地资源](./push.md)
- [部署 Git 产物](./deploy.md)
- [导出站点](./export.md)
- [常见问题](../troubleshooting.md)
