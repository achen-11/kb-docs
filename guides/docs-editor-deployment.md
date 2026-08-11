# 内网文档编辑平台部署

Phase 2 编辑平台是独立的只读服务：

- VitePress 预览继续运行在 `4173`；
- 编辑平台默认运行在 `4174`；
- 浏览器只能读取 `docs/**/*.md`；
- 不提供保存、Git 或 Kooboo API；
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
  --preview-url http://192.168.10.75:4173
```

## 安装

```bash
sudo bash deploy/editor/install.sh \
  --app-dir /opt/kb-docs-git \
  --bind-host 0.0.0.0 \
  --port 4174 \
  --preview-url http://192.168.10.75:4173 \
  --preview-status-url http://127.0.0.1:4173/__preview/status \
  --service-user kb-docs-preview \
  --service-group kb-docs-preview \
  --apply
```

## 让内网预览显示编辑链接

重新渲染 4173 配置时显式传入编辑平台地址：

```bash
sudo bash deploy/preview/install.sh \
  --app-dir /opt/kb-docs-git \
  --data-dir /srv/kb-docs-preview \
  --bind-host 0.0.0.0 \
  --port 4173 \
  --editor-base-url http://192.168.10.75:4174 \
  --git-remote cnb \
  --git-branch codex/docs-editor-phase2 \
  --sync-interval 30 \
  --with-git-sync \
  --without-nginx \
  --apply
```

未设置 `DOCS_EDITOR_BASE_URL` 的普通构建不会显示内部编辑链接。

## 验证

```bash
systemctl status kb-docs-editor.service --no-pager
curl --fail http://127.0.0.1:4174/api/health
```

编辑链接必须携带经过 URL 编码的真实源文件路径，例如：

```text
http://192.168.10.75:4174/?path=docs%2Fcms%2Findex.md
```

服务器会重新验证路径，拒绝绝对路径、`..`、隐藏目录、非 Markdown 文件和 symlink 逃逸。
