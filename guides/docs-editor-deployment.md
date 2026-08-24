# 内网文档编辑平台部署

文档编辑平台是独立的认证服务：

- VitePress Dev 快速预览运行在 `4173`；
- 编辑平台默认运行在 `4174`；
- 不可变生产构建预览运行在 `4175`；
- 浏览器可以读取和保存现有 `docs/**/*.md`，保存必须携带上次读取的 SHA-256；
- 保存立即返回，4175 稳定构建由用户显式触发；
- “改动与发布”支持 Git 提交、审核分支推送，以及可选的一键发布到 Kooboo；
- Kooboo 发布只在工作区干净时启用，并自动执行 artifact、dry-run、部署回执和浏览器验收；
- 公开预览与线上站点只发布英文版；中文 Markdown 仍可在编辑器中打开，但不进入 `4173` / `4175` / Kooboo 产物；
- 访问口令只保存在服务器的 root-owned 文件中。

## 创建访问口令

```bash
sudo install -d -m 0750 -o root -g kb-docs-preview /etc/kb-docs-editor
sudo install -m 0640 -o root -g kb-docs-preview /dev/null /etc/kb-docs-editor/auth-token
openssl rand -base64 32 | sudo tee /etc/kb-docs-editor/auth-token >/dev/null
```

不要把口令写入仓库、`editor.env`、systemd unit 或命令参数。

## Dry run

```bash
bash deploy/editor/install.sh \
  --app-dir /opt/kb-docs-git \
  --bind-host 0.0.0.0 \
  --port 4174 \
  --fast-preview-url http://192.168.10.75:4173 \
  --stable-preview-url http://192.168.10.75:4175
```

## 安装

```bash
sudo bash deploy/editor/install.sh \
  --app-dir /opt/kb-docs-git \
  --bind-host 0.0.0.0 \
  --port 4174 \
  --fast-preview-url http://192.168.10.75:4173 \
  --fast-preview-health-url http://127.0.0.1:4173/ \
  --stable-preview-url http://192.168.10.75:4175 \
  --stable-preview-status-url http://127.0.0.1:4175/__preview/status \
  --stable-build-debounce-ms 8000 \
  --service-user kb-docs-preview \
  --service-group kb-docs-preview \
  --apply
```

## 启用“发布到 Kooboo”按钮

发布按钮默认关闭。启用前需要准备一个由 `kb-docs` 仓库创建的独立 artifact worktree，并在该目录的 `.env` 中配置 Kooboo 站点凭据。`.env` 必须对 `kb-docs-preview` 服务账户可读，但不能提交到 Git。

首次启用时还要提供最后一次已经确认成功的 artifact commit。之后每次发布成功，编辑器会自动把新基线写入 `/srv/kb-docs-preview/kooboo-deploy-baseline.json`。

```bash
sudo bash deploy/editor/install.sh \
  --app-dir /opt/kb-docs-git \
  --bind-host 0.0.0.0 \
  --port 4174 \
  --fast-preview-url http://192.168.10.75:4173 \
  --stable-preview-url http://192.168.10.75:4175 \
  --enable-production-publish \
  --kooboo-target-url https://doc-kooboo-us.kooboo.io \
  --kooboo-artifact-dir /srv/kb-docs-kooboo-artifact \
  --kooboo-initial-baseline <last-successful-artifact-commit> \
  --kooboo-verify-paths /,/cms/index.html,/api/net/ip.html \
  --apply
```

4174 中的操作流程保持简单：

1. 保存文档；
2. 在“改动与发布”填写说明，点击“提交并推送”；
3. 工作区干净后点击“发布到 Kooboo”；
4. 若计划没有删除，系统自动完成发布和线上验收；若包含删除，系统暂停并要求再次确认。

远程凭据、artifact 路径、部署 commit 范围和命令日志不会暴露给普通浏览器用户。

## 让内网预览显示编辑链接

重新渲染预览配置时显式传入编辑平台地址和两个端口：

```bash
sudo bash deploy/preview/install.sh \
  --app-dir /opt/kb-docs-git \
  --data-dir /srv/kb-docs-preview \
  --bind-host 0.0.0.0 \
  --fast-port 4173 \
  --port 4175 \
  --editor-base-url http://192.168.10.75:4174 \
  --git-remote cnb \
  --git-branch codex/docs-editor-fast-preview \
  --sync-interval 30 \
  --with-git-sync \
  --without-nginx \
  --apply
```

未设置 `DOCS_EDITOR_BASE_URL` 的普通构建不会显示内部编辑链接。

## 验证

```bash
systemctl status kb-docs-editor.service --no-pager
systemctl status kb-docs-preview-dev.service --no-pager
systemctl status kb-docs-preview.service --no-pager
curl --fail http://127.0.0.1:4174/api/health
curl --fail --head http://127.0.0.1:4173/
curl --fail http://127.0.0.1:4175/__preview/status
```

编辑链接必须携带经过 URL 编码的真实源文件路径，例如：

```text
http://192.168.10.75:4174/?path=docs%2Fcms%2Findex.md
```

服务器会重新验证路径，拒绝绝对路径、`..`、隐藏目录、非 Markdown 文件和 symlink 逃逸。保存冲突返回 `409 DOCUMENT_CONFLICT`，不会静默覆盖其他人的修改。
