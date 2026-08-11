# 本地共享预览

本工具用于在本机先跑通将来要迁移到内网服务器的 VitePress 生产预览链路。

## 启动

仅本机访问：

```bash
pnpm docs:preview:server
```

允许同一局域网访问：

```bash
pnpm docs:preview:lan
```

默认地址为 `http://127.0.0.1:4173/`。局域网模式应使用运行电脑的内网 IP，例如：

```text
http://192.168.1.20:4173/
```

## 行为

- 启动时先执行一次完整的 `pnpm docs:build`。
- `docs/` 中的源文件发生修改后自动重新构建。
- 新构建成功前继续提供上一个成功版本。
- 新构建成功后原子切换到新的 release。
- 构建失败时保留旧预览，并把状态标记为 `degraded`。
- 默认保留最近五个成功 release。

生成内容位于 `.local-preview/`，已从 Git 排除。

## 状态检查

浏览器或监控程序可以读取：

```text
http://127.0.0.1:4173/__preview/status
```

示例：

```json
{
  "status": "ready",
  "releaseId": "20260810T123000-94a04fa-1",
  "lastSuccessAt": "2026-08-10T12:30:08.000Z",
  "error": null
}
```

## 可选配置

```bash
DOCS_PREVIEW_PORT=5000 pnpm docs:preview:server
DOCS_PREVIEW_KEEP_RELEASES=10 pnpm docs:preview:server
DOCS_PREVIEW_ROOT=/srv/kb-docs-preview pnpm docs:preview:lan
```

如果端口已被占用，服务会直接退出，不会终止或覆盖原有进程。

## 与 Kooboo 预览的边界

这个工具只提供 VitePress 静态预览。它不会验证 Kooboo Page、`@k-url`、RouteFinding Request Hook 或 `kb deploy` 回执。

这些能力应在下一阶段接入独立的 `kbdev.com` Kooboo 测试站。

迁移到内网 Linux 电脑的 systemd、Nginx、SSH 传输和更新方式见 [内网文档预览服务器部署](preview-server-deployment.md)。
