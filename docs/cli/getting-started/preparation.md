# 使用前准备

开始操作站点前，先确认 CLI 可以运行，并在项目根目录配置目标站点和登录信息。

## 确认命令可用

```bash
kb --help
kb --version
```

如果终端找不到 `kb`，先完成团队约定的 CLI 安装流程，再继续配置项目。

## 配置项目环境

在项目根目录创建 `.env`：

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
```

| 变量 | 说明 |
|------|------|
| `KOOBOO_SITE_URL` | 要连接的 Kooboo 站点地址 |
| `KOOBOO_USERNAME` | 登录账号 |
| `KOOBOO_PASSWORD` | 登录密码 |

`pull` 和 `push` 直接使用这些项目环境变量。`sync`、`check`、`prune` 和 `export` 还可以通过各自的命令参数临时指定连接信息，具体以对应页面为准。

## 保护登录信息

`.env` 包含账号和密码，不应提交到 Git。项目可以保留不含真实凭据的 `.env.example`：

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=YOUR_USERNAME
KOOBOO_PASSWORD=YOUR_PASSWORD
```

提交前检查：

```bash
git status --short
git check-ignore .env
```

## 操作前检查

每次准备执行远端操作时，确认：

- 终端当前目录是目标 CLI 项目；
- `KOOBOO_SITE_URL` 指向正确站点；
- 本地未提交改动已经保存；
- 推送或拉取范围符合预期；
- 没有在另一个终端中运行同一项目的 `kb sync`。

## 下一步

- [新建或克隆项目](./create-or-clone.md)
- [项目资源与目录](../project/resources.md)
