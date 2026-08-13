# 推送本地资源

`kb push` 将当前项目中的本地资源写入 `.env` 指向的远端站点。可以推送全部资源、限定目录或文件，也可以只处理 Git 变更。

需要按“上次成功版本 → 本次候选版本”执行可审计发布、显式批准删除并生成回执时，使用 [`kb deploy`](./deploy.md)。

## 使用前准备

确认：

- 当前目录是目标 CLI 项目；
- `.env` 指向正确站点；
- 已检查即将推送的文件；
- 重要站点已具备可恢复的版本或备份。

## 推送全部资源

```bash
kb push
```

全量推送会处理项目中现有的受支持资源，但不会仅因为某个本地文件已经不存在，就自动删除对应远端资源。需要同步 Git 中的删除和重命名时，使用 Git 变更模式。

## 按路径推送

```bash
kb push code
kb push code/server
kb push code/server/order.ts
kb push images/gallery
kb push images/gallery/hero.png
kb push mcp-tools/weather.ts
kb push module/shop
```

路径可以省略开头的 `src/`。限定到具体文件或目录，可以减少无关资源被更新的风险。

没有本地文件匹配目标路径时，CLI 会给出提示，不会自动改为全量推送。

## 推送 Git 变更

推送当前工作区中的资源变更，包括已暂存、未暂存、未跟踪文件以及删除：

```bash
kb push --git
```

只推送暂存区：

```bash
kb push --git --staged
```

只推送未暂存的已跟踪改动：

```bash
kb push --git --unstaged
```

推送某个提交包含的资源变更：

```bash
kb push --git --commit abc123
```

Git 变更模式会处理资源删除和重命名。删除操作会修改远端站点，执行前先检查：

```bash
git status --short
git diff --name-status
git diff --cached --name-status
```

目标路径不能与 `--git` 同时使用。`--staged`、`--unstaged` 和 `--commit` 也不能互相组合。

## 使用 `.pushignore`

在项目根目录创建 `.pushignore`，可以排除不应被 `kb push` 处理的文件：

```text
src/temp/
*.log
!important/*.log
```

规则按顺序应用，后面的规则可以覆盖前面的规则。`.pushignore` 同时作用于普通推送和 Git 变更推送。

`.pushignore` 不控制 `kb sync`。不希望被实时同步的文件，不要放入受监听的资源目录，或在修改前停止同步进程。

## 控制推送速度

大量资源推送时，可以在 `.env` 中调整并发数和批次间隔：

```ini
KOOBOO_PUSH_CONCURRENCY=5
KOOBOO_PUSH_INTERVAL_MS=1000
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `KOOBOO_PUSH_CONCURRENCY` | `5` | 每批并行处理的资源数 |
| `KOOBOO_PUSH_INTERVAL_MS` | `100` | 上一批完成后等待的毫秒数 |

远端出现限流或连续失败时，降低并发并增加间隔。

## 推送后检查

- 确认终端没有资源保存失败提示；
- Page 和 API 文件应包含有效的 `@k-url`；
- 打开真实站点验证修改结果；
- 重要发布可使用 [`kb check`](./check-and-prune.md) 对比本地与远端。

## 相关文档

- [拉取远端资源](./pull.md)
- [持续同步](./sync.md)
- [部署 Git 产物](./deploy.md)
- [资源对账与远端清理](./check-and-prune.md)
