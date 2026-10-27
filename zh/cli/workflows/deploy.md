# 部署 Git 产物

`kb deploy` 用于发布已经提交到 Git 的 Kooboo 资源产物。它对比“上一次成功部署的 commit”和“本次候选 commit”，生成完整计划，在一个 CLI 进程中执行上传、删除和远端校验，并输出部署回执。

与 `kb push --git --commit` 相比，`kb deploy` 面向正式发布：它处理一个明确的 commit 范围，删除需要单独批准，任一写入或校验失败都会返回非零退出码。

正式发布中的删除也应由 `deploy` 完成。`deploy` 只删除 Git 范围明确记录的资源，不会顺带清理远端额外资源；[`kb prune`](./check-and-prune.md) 仅用于发布流程之外的远端漂移审计，不能替代确定性的 Git 发布。

## 使用前提

当前目录必须是保存 Kooboo 最终资源的 Git 项目，并且候选产物已经提交。部署不会读取未提交的工作区内容。

项目根目录需要配置：

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
KOOBOO_SITE_ID=your-site-id
```

`KOOBOO_SITE_ID` 是可选项，但正式发布建议设置。CLI 登录后会核对实际站点 ID；不一致时不会写入远端。

## 选择部署范围

准备两个 Git commit：

- `from`：最后一次收到成功部署回执的产物 commit；
- `to`：本次准备发布的候选产物 commit。

两者不要求是父子关系。CLI 会解析为完整、不可变的 commit ID，并计算整个 `from → to` 范围中的新增、修改、删除和重命名。

## 先生成并审查计划

```bash
kb deploy \
  --from <last-successful-commit> \
  --to <candidate-commit> \
  --dry-run \
  --write-plan .kooboo/deploy-plan.json
```

Dry run 不登录站点，也不写远端。输出会列出：

- 需要新增或更新的资源数；
- 需要删除的资源数；
- 因不是 Kooboo 资源或匹配 `.pushignore` 而跳过的文件；
- 用于确认计划内容未被改动的 digest。

计划中的资源内容取自候选 commit，而不是当前工作区。候选 commit 中的 `.pushignore` 决定哪些 Git 变化被跳过。

## 执行部署

计划不包含删除时：

```bash
kb deploy \
  --from <last-successful-commit> \
  --to <candidate-commit> \
  --output .kooboo/deploy-receipt.json
```

计划包含删除时，必须在审查后显式批准：

```bash
kb deploy \
  --from <last-successful-commit> \
  --to <candidate-commit> \
  --apply-deletes \
  --output .kooboo/deploy-receipt.json
```

没有 `--apply-deletes` 时，只要计划中存在删除，整个部署会在登录和写入前停止；CLI 不会只上传其余资源。

## 执行已保存的计划

```bash
kb deploy \
  --plan .kooboo/deploy-plan.json \
  --apply-deletes \
  --output .kooboo/deploy-receipt.json
```

`--plan` 不能与 `--from` 或 `--to` 同时使用。执行前，CLI 会检查计划 digest、Git commit、变更覆盖范围和候选快照内容；计划过期、缺少变化或内容不匹配时不会写入远端。

## 执行顺序与失败规则

CLI 按以下阶段执行：

1. 上传 Script、Style、Content File、Images、API、View 等支撑资源；
2. 上传 Page；
3. 执行已批准的删除。

前一阶段存在失败时，后续阶段会跳过。这样可以避免 Page 先引用尚未成功上传的资源，也可以避免在上传失败后继续删除旧资源。

重复执行同一个 `from → to` 范围是允许的。计划中的远端资源已经不存在时，删除会记为 `already_absent`，不会把补偿重试判定为失败。

## 发布后校验

默认情况下，写入结束后 CLI 会重新读取远端资源：

- 对新增和修改资源比较持久化后的内容 hash；
- 对删除资源确认远端已经不存在。

校验失败会写入回执并使命令返回非零退出码。可以用 `--no-verify` 跳过该步骤，但回执会明确标记校验未启用；此时 CLI 只能证明写入请求没有报告失败，不能证明远端内容已经对账。

## 输出计划和回执

```bash
# 终端输出 JSON
kb deploy --from <from> --to <to> --dry-run --format json

# 不打印终端正文，只写回执文件
kb deploy --from <from> --to <to> --format silent \
  --output .kooboo/deploy-receipt.json
```

`--format` 支持 `table`、`json` 和 `silent`。`--write-plan` 写部署计划；`--output` 写执行回执或失败信息。两者用途不同。

成功回执包含目标站点、commit 范围、计划 digest、每个资源的执行结果和校验结果。只有 `success` 为 `true` 且进程退出码为 `0`，才能把 `to` 记录为新的成功部署基线。

## 常用参数

| 参数 | 作用 |
|------|------|
| `--from <commit>` | 最后一次成功部署的产物 commit |
| `--to <commit>` | 本次候选产物 commit |
| `--plan <path>` | 执行已保存的计划 |
| `--write-plan <path>` | 将校验后的计划写入 JSON 文件 |
| `--dry-run` | 只生成计划，不登录或写远端 |
| `--apply-deletes` | 批准计划中的删除操作 |
| `--no-verify` | 跳过写入后的远端校验 |
| `--format <format>` | 终端输出格式：`table`、`json` 或 `silent` |
| `--output <path>` | 将回执或失败信息写入 JSON 文件 |
| `--site-id <siteId>` | 指定部署时必须匹配的站点 ID |
| `--site-url <url>` | 临时指定站点 URL |
| `--username <username>` | 临时指定用户名 |
| `--password <password>` | 临时指定密码 |

## 相关文档

- [使用前准备](../getting-started/preparation.md)
- [推送本地资源](./push.md)
- [资源对账与远端清理](./check-and-prune.md)
- [常见问题](../troubleshooting.md)
