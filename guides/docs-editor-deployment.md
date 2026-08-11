# 内网文档编辑平台部署

Phase 3 编辑平台是独立的认证服务：

- VitePress Dev 快速预览运行在 `4173`；
- 编辑平台默认运行在 `4174`；
- 不可变生产构建预览运行在 `4175`；
- 浏览器可以读取和保存现有 `docs/**/*.md`，保存必须携带上次读取的 SHA-256；
- 保存立即返回，4175 稳定构建在后台 debounce；
- 不提供 Git 提交、推送或 Kooboo API；
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
