# Kooboo CLI

Kooboo CLI 是 Kooboo 的本地开发工具。它把站点资源保存为本地文件，并提供创建或克隆项目、拉取资源、推送改动、Git 产物部署、持续同步、资源对账和站点导出等工作流。

完整命令名是 `kooboo-cli`，日常可以使用缩写 `kb`：

```bash
kooboo-cli --help
kb --help
```

## 主要能力

| 能力 | 命令 | 适用场景 |
|------|------|----------|
| 创建站点项目 | `kb new` | 新建远程站点并生成本地项目 |
| 克隆已有站点 | `kb clone` | 将已有 Kooboo 站点资源拉到本地维护 |
| 拉取资源 | `kb pull` | 获取远端最新资源或只刷新指定范围 |
| 推送资源 | `kb push` | 将本地资源写入远端站点 |
| 部署 Git 产物 | `kb deploy` | 按 commit 范围计划、执行并校验正式发布 |
| 持续同步 | `kb sync` | 监听本地文件变化并实时写入远端 |
| 资源对账 | `kb check` | 比较本地与远端的资源差异 |
| 清理远端资源 | `kb prune` | 预览或删除只存在于远端的资源 |
| 导出站点 | `kb export` | 选择资源并下载站点压缩包 |

## 推荐学习路径

1. 阅读[使用前准备](./getting-started/preparation.md)，配置目标站点和登录信息。
2. 根据情况[新建或克隆项目](./getting-started/create-or-clone.md)。
3. 了解[项目资源与目录](./project/resources.md)。
4. 使用 [`kb pull`](./workflows/pull.md) 获取远端改动。
5. 使用 [`kb push`](./workflows/push.md) 发布本地改动。
6. 正式发布不可变产物时，使用 [`kb deploy`](./workflows/deploy.md)。
7. 确实需要远端实时联调时，再使用 [`kb sync`](./workflows/sync.md)。

## 先理解远端影响

`kb pull` 会把远端内容写入本地项目。`kb push`、`kb deploy`、`kb sync` 和带 `--yes` 的 `kb prune` 会修改远端站点。

执行这些命令前，先确认当前目录、`.env` 中的站点地址以及准备操作的资源范围。团队项目中建议先提交或保存本地改动，再执行可能覆盖文件的拉取操作。

## 相关文档

- [使用前准备](./getting-started/preparation.md)
- [新建或克隆项目](./getting-started/create-or-clone.md)
- [常见问题](./troubleshooting.md)
