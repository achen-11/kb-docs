# 常见问题

本页按终端中可以观察到的现象整理 Kooboo CLI 的常见问题和恢复方式。

## 提示缺少站点或账号配置

现象：命令提示缺少 `KOOBOO_SITE_URL`、`KOOBOO_USERNAME` 或 `KOOBOO_PASSWORD`。

处理：确认当前目录是 CLI 项目，并检查项目根目录的 `.env`：

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
```

重新打开终端或重新执行命令，让 CLI 再次读取项目环境。

## 登录失败

确认：

- 站点地址使用正确的协议和域名；
- 账号可以登录该站点；
- 密码中没有意外的引号或空格；
- 当前账号具有操作目标资源的权限。

`kb new` 和 `kb clone` 的认证重试次数可以通过环境变量调整：

```ini
KOOBOO_AUTH_MAX_RETRIES=3
```

不要通过无限增加重试次数掩盖错误的账号或站点地址。

## 没有匹配目标路径

现象：`pull` 或 `push` 提示没有资源匹配指定目标。

处理：

```bash
find src content-file images mcp-tools -maxdepth 3 -type f 2>/dev/null
```

目标路径通常省略开头的 `src/`：

```bash
kb push code/server
kb pull images/gallery
```

确认资源目录、文件名和大小写与[项目资源与目录](./project/resources.md)一致。

## Page 或 API 提示缺少 URL

Page 文件顶部需要：

```html
<!-- @k-url /products -->
```

API 文件顶部需要：

```ts
// @k-url /api/products
```

补充 URL 后重新推送具体文件，避免重复执行全量推送。

## 文件扩展名不受支持

检查资源目录和扩展名是否匹配：

- Page、Layout、View 使用 `.html`；
- Script 使用 `.js`；
- Style 使用 `.css`；
- Job 和 MCP 工具使用 `.ts`；
- API、CodeBlock、PageScript 使用 `.ts` 或 `.js`。

不要仅修改扩展名。文件内容也必须符合对应资源的用途。

## 文件被 `.pushignore` 跳过

查看项目根目录的 `.pushignore`：

```bash
sed -n '1,200p' .pushignore
```

规则按顺序应用，后面的 `!` 规则可以重新包含文件。修改后使用窄范围命令重试：

```bash
kb push path/to/resource
```

注意：`.pushignore` 不影响 `kb sync`。

## Pull 覆盖了本地修改

先停止继续编辑，不要立即再次拉取。使用 Git 检查和恢复：

```bash
git status --short
git diff
git reflog
```

如果修改没有提交、暂存或备份，Git 可能无法完整恢复。后续执行 `kb pull` 前，先创建提交或保护性 stash。

## Sync 意外修改了远端

立即按 `Ctrl+C` 停止同步，然后：

1. 检查 `.env` 中的站点地址；
2. 使用 `git status` 确认最近的本地新增、修改和删除；
3. 使用 `kb check` 查看本地与远端差异；
4. 通过站点版本、Git 中的正确文件或已保存导出包恢复资源；
5. 恢复完成前不要重新启动同步。

## Push 或 Sync 没有处理任何变化

确认没有正在执行的 `kb pull`。项目根目录中如果残留 `kooboo-cli.lock`，并且已经确认没有拉取进程运行，可以删除该文件后重试：

```bash
rm kooboo-cli.lock
```

然后使用具体资源路径测试：

```bash
kb push code/server/order.ts
```

## Prune 显示的站点与当前站点不一致

不要使用 `--yes`。检查：

- 当前 `.env` 中的 `KOOBOO_SITE_URL`；
- 对账报告生成时连接的站点；
- 是否复制了另一个环境的报告文件。

重新对当前站点运行 `kb check --output <path>`，再根据新报告生成清理预览。

## Deploy 提示计划 digest 不一致

计划文件在生成后被修改，或文件内容损坏。不要继续执行该文件；使用原来的 commit 范围重新生成：

```bash
kb deploy --from <from> --to <to> --dry-run \
  --write-plan .kooboo/deploy-plan.json
```

如果重新生成的计划与预期不一致，先检查 `from`、`to` 和候选 commit 中的 `.pushignore`。

## Deploy 提示站点 ID 不一致

CLI 已登录到与计划或 `KOOBOO_SITE_ID` 不同的站点，因此在写入前停止。检查：

- 当前项目的 `KOOBOO_SITE_URL`；
- `KOOBOO_SITE_ID` 是否来自同一个站点；
- 计划是否从另一个环境复制而来。

不要为了绕过检查而删除站点 ID。确认目标环境后，使用正确的 artifact 项目和 commit 范围重新生成计划。

## Deploy 要求 `--apply-deletes`

计划包含 Git 删除或重命名产生的旧路径删除。先执行 dry run 并审查删除项；确认后再运行：

```bash
kb deploy --plan .kooboo/deploy-plan.json --apply-deletes
```

如果不接受这些删除，应修正候选 artifact commit，而不是让 CLI 忽略计划中的删除后继续上传。

## Deploy 回执失败或退出码非零

不要推进成功部署基线。打开 `--output` 指定的 JSON 文件，检查：

- `operations` 中的 `failed` 和 `skipped` 项；
- `verification.items` 中的缺失资源或 hash 不一致；
- 目标站点、commit 范围和 `planDigest`。

修复认证、资源内容或远端故障后，可以重跑同一个 `from → to`。已经成功写入的资源会再次对齐，已经删除的资源会记为 `already_absent`。

## 相关文档

- [使用前准备](./getting-started/preparation.md)
- [拉取远端资源](./workflows/pull.md)
- [推送本地资源](./workflows/push.md)
- [部署 Git 产物](./workflows/deploy.md)
- [持续同步](./workflows/sync.md)
