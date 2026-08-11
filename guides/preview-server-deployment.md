# 内网文档预览服务器部署

本指南用于把已经在本地验证过的 VitePress 预览服务迁移到可 SSH 连接的内网电脑。

当前提供 Linux + systemd + Nginx 模板。核心 Node.js 发布器、HTTP 服务和健康检查不依赖 systemd；如果目标机器是 Windows 或 macOS，只需替换服务管理和反向代理部分。

如果目标机器的 80/443 已由 Kooboo.Web 等服务占用，可以使用 `--without-nginx --bind-host 0.0.0.0`，通过独立端口直接在内网访问。

## 架构

服务器进程分成三个职责：

```text
发布器：pnpm docs:preview:publish
  -> 完整构建
  -> 写入新 release
  -> 原子切换 current
  -> 更新持久化状态

快速预览：pnpm docs:dev -- --host 0.0.0.0 --port 4173
  -> 监听 Markdown 和配置变化
  -> HMR 更新编辑页面
  -> 不承担生产构建验证

稳定常驻服务：pnpm docs:preview:serve
  -> 不构建、不监控源码
  -> 始终读取 current
  -> 在 4175 提供页面和 /__preview/status
```

文档更新不需要重启服务。只有预览服务代码、依赖或 systemd 配置发生变化时才需要重启。

## 目标服务器准备

建议路径和账户：

| 项目 | 建议值 |
|------|--------|
| 服务账户 | `kb-docs-preview` |
| 仓库目录 | `/opt/kb-docs` |
| 预览数据 | `/srv/kb-docs-preview` |
| 环境配置 | `/etc/kb-docs-preview/preview.env` |
| 内部域名 | `docs-preview.kbdev.com` |
| 快速预览 | `127.0.0.1:4173` |
| 稳定预览 | `127.0.0.1:4175` |

服务账户必须是非 root 账户，并且需要对仓库目录和预览数据目录有读写权限，因为 VitePress 构建会写入 `docs/.vitepress/dist` 和缓存。

服务器需要安装：

- Git；
- 系统级安装的 Node.js 20 或更高；
- Corepack，并能按仓库 `packageManager` 字段运行 pnpm 10.x（不能只依赖管理员账户的 nvm 环境）；
- systemd；
- Nginx；
- `runuser`。

## 本地生成并检查配置

安装脚本默认只生成配置，不修改系统：

```bash
bash deploy/preview/install.sh \
  --app-dir /opt/kb-docs \
  --data-dir /srv/kb-docs-preview \
  --hostname docs-preview.kbdev.com
```

生成文件位于：

```text
.local-preview/server-config/
```

包括：

- `kb-docs-preview.service`；
- `kb-docs-preview-dev.service`；
- `kb-docs-preview-sync.service`；
- `kb-docs-preview-sync.timer`；
- `kb-docs-preview.nginx.conf`；
- `preview.env`；
- `manifest.json`。

必须先检查这些文件，再在目标服务器使用 `--apply`。

## 通过 SSH 传递仓库

优先选择让目标服务器使用只读 Deploy Key clone 私有仓库。无法直接 clone 时，可以从本机传输当前工作目录：

```bash
rsync -az \
  --exclude .git \
  --exclude node_modules \
  --exclude .env \
  --exclude .local-preview \
  ./ deploy-user@internal-host:/opt/kb-docs/
```

首次传输不要添加 `--delete`。先在服务器检查目标目录，避免删除同目录中的非文档文件。

## 目标服务器安装

先创建并准备专用账户及目录，然后执行：

```bash
cd /opt/kb-docs
sudo bash deploy/preview/install.sh \
  --app-dir /opt/kb-docs \
  --data-dir /srv/kb-docs-preview \
  --hostname docs-preview.kbdev.com \
  --service-user kb-docs-preview \
  --service-group kb-docs-preview \
  --apply
```

目标机器已有服务占用 80/443 时：

```bash
sudo bash deploy/preview/install.sh \
  --app-dir /opt/kb-docs \
  --data-dir /srv/kb-docs-preview \
  --bind-host 0.0.0.0 \
  --fast-port 4173 \
  --port 4175 \
  --service-user kb-docs-preview \
  --service-group kb-docs-preview \
  --without-nginx \
  --apply
```

`--apply` 才会：

1. 安装环境、systemd 和 Nginx 配置；
2. 以非 root 服务账户安装依赖；
3. 发布第一个静态 release；
4. 启用 4173 快速预览和 4175 稳定预览服务；
5. 校验 Nginx；
6. 执行健康检查。

安装脚本不会创建 Linux 用户，也不会写入 Kooboo 或生产凭据。

## 后续更新

把新代码同步到 `/opt/kb-docs` 后，以服务账户执行：

```bash
bash deploy/preview/update.sh \
  --app-dir /opt/kb-docs \
  --env-file /etc/kb-docs-preview/preview.env
```

锁文件或依赖发生变化时增加：

```bash
--install-deps
```

更新流程构建失败时返回非零退出码，旧 `current` release 继续提供服务。

`update.sh` 和 Git 自动同步共用 `DOCS_PREVIEW_UPDATE_LOCK_FILE`。多个手工更新、timer 或未来编辑平台同时触发时会串行等待，不允许并发构建和交叉切换 release。

## Git 自动同步

自动同步是显式启用的可选能力。启用前必须满足：

1. `--app-dir` 是真实 Git worktree，不是排除 `.git` 后的 rsync 副本；
2. 服务账户可以读取仓库，并能通过配置的 remote 拉取目标 branch；
3. 没有编辑草稿时服务器工作区保持干净；编辑平台保存草稿后必须存在 draft marker，使 Git timer 在 fetch 前返回 deferred；
4. 当前代码已经进入远端 Git 基线，不能让服务器切换到缺少预览脚本的旧分支；
5. 私有仓库使用只读 Deploy Key 或仓库级部署令牌，不复制个人 Git 凭据。

### SSH Deploy Key

仓库平台支持 SSH Deploy Key 时，把私钥和已核验的 known-hosts 放在：

```text
/etc/kb-docs-preview/git-deploy-key
/etc/kb-docs-preview/git-known-hosts
```

权限建议：配置目录为 `root:kb-docs-preview` 的 `0750`，私钥为 `root:kb-docs-preview` 的 `0640`。生成的 `preview.env` 会通过 `GIT_SSH_COMMAND` 使用这两个文件，并设置 `GIT_TERMINAL_PROMPT=0`，避免 systemd 后台任务等待交互式用户名或密码。

### HTTPS 部署令牌（CNB）

CNB 仓库设置提供的是“部署令牌”，而不是仓库级 SSH Deploy Key。创建令牌时只授予 `repo-code` 只读权限，`repo-release` 和 `registry-package` 保持默认无权限。不要使用个人访问令牌。

把 Git 用户名和令牌分别写入：

```text
/etc/kb-docs-preview/git-username
/etc/kb-docs-preview/git-token
```

CNB 的 Git 用户名固定为 `cnb`。建议权限：

```bash
printf '%s\n' cnb | sudo tee /etc/kb-docs-preview/git-username >/dev/null
sudo install -m 0640 -o root -g kb-docs-preview /dev/null /etc/kb-docs-preview/git-token
sudoedit /etc/kb-docs-preview/git-token
sudo chown root:kb-docs-preview \
  /etc/kb-docs-preview/git-username \
  /etc/kb-docs-preview/git-token
sudo chmod 0640 \
  /etc/kb-docs-preview/git-username \
  /etc/kb-docs-preview/git-token
```

安装器会把无密钥内容的 `git-askpass.sh` 安装到配置目录；`preview.env` 通过 `GIT_ASKPASS` 引用它。令牌不会进入仓库、渲染输出、systemd unit 或进程参数。CNB HTTPS remote 示例：

```text
https://cnb.cool/kooboo.com/kooboo/team/kooboo-doc.git
```

启用 timer 前先以服务账户验证只读访问：

```bash
sudo -u kb-docs-preview env \
  GIT_TERMINAL_PROMPT=0 \
  GIT_ASKPASS=/etc/kb-docs-preview/git-askpass.sh \
  git ls-remote --exit-code \
  https://cnb.cool/kooboo.com/kooboo/team/kooboo-doc.git \
  refs/heads/main
```

启用示例：

```bash
sudo bash deploy/preview/install.sh \
  --app-dir /opt/kb-docs \
  --data-dir /srv/kb-docs-preview \
  --bind-host 0.0.0.0 \
  --fast-port 4173 \
  --port 4175 \
  --service-user kb-docs-preview \
  --service-group kb-docs-preview \
  --git-remote cnb \
  --git-branch main \
  --sync-interval 30 \
  --with-git-sync \
  --without-nginx \
  --apply
```

同步器每轮执行：

```text
获取跨进程更新锁
  -> git fetch 指定 remote/branch
  -> 拒绝脏工作区
  -> 验证当前 HEAD 是远端目标的祖先
  -> git merge --ff-only
  -> 安装锁文件对应依赖
  -> 构建并原子发布
  -> 健康检查成功
  -> 原子写入已发布 commit 状态
```

如果构建或健康检查失败，Git checkout 可能已经 fast-forward，但“已发布 commit”不会前移，因此下一轮 timer 会继续重试；4173 会快速显示 checkout 中的新内容，4175 继续提供上一个成功 release。

以下情况会拒绝自动更新并返回非零：

- 工作区存在未提交或未跟踪文件；
- 服务器存在远端没有的本地 commit；
- 本地和远端已经分叉或远端发生非 fast-forward 重写；
- remote、branch、凭据或 host key 无效；
- 构建或健康检查失败。

查看 timer 和最近一次执行：

```bash
systemctl status kb-docs-preview-sync.timer --no-pager
systemctl status kb-docs-preview-sync.service --no-pager
journalctl -u kb-docs-preview-sync.service -n 100 --no-pager
```

## 健康检查

```bash
pnpm docs:preview:health
pnpm docs:preview:fast-health
```

健康检查同时要求：

- `/__preview/status` 返回 `ready`；
- 状态包含 `releaseId`；
- `/` 的 HEAD 请求返回成功。

快速预览健康检查只要求 4173 根页面的 HEAD 请求成功。它不替代 4175 的 release、构建状态和原子发布检查。

如果只是确认旧版本仍能服务，并允许最近一次构建失败：

```bash
node scripts/check-local-preview.mjs --allow-degraded
```

## 回滚

release 目录不会在切换时覆盖旧版本。回滚时应：

1. 在 `/srv/kb-docs-preview/releases/` 中确认目标 release；
2. 把 `current` 原子切换到已确认的旧 release；
3. 同步更新 `.preview-status.json`；
4. 运行健康检查。

当前阶段没有提供自动回滚命令，避免在没有目标服务器目录、权限和运维约定时执行错误切换。服务器跑稳后再增加受校验的回滚工具。

## 尚未接入

- CNB 自托管 Runner；
- 每个合并请求的独立 worktree 和域名；
- `kbdev.com` Kooboo 候选部署；
- 生产部署；
- Git 提交与审核入口。
