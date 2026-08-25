# Kooboo 文档站（kb-docs）

本仓库是 [Kooboo](https://www.kooboo.com) 官方文档的 VitePress 源码，构建后通过 Kooboo CLI 发布到线上站点。

## 同事入门

| 文档 | 说明 |
|------|------|
| [环境安装与本地开发](guides/setup.md) | Node、pnpm、Kooboo CLI、首次 clone、跑起 `docs:dev` |
| [文档站维护指南](guides/maintenance.md) | 写文档、配图、构建、增量部署、多人协作 manifest |

## 常用命令

```bash
pnpm install
pnpm docs:dev              # 本地预览（http://localhost:5173）
pnpm docs:build            # 仅构建，检查是否能通过
pnpm docs:artifact:prepare # 构建并同步到部署产物 worktree
pnpm docs:deploy:kooboo:dry-run   # 预览 artifact commit range 的部署计划
pnpm docs:deploy:kooboo:exact     # 执行已审核的固定计划并验证
pnpm docs:deploy:kooboo:exact -- --resume # 从原回执继续失败或未完成项
pnpm check:dead-links      # 死链检查
```

## 仓库结构（简）

```text
docs/                 # VitePress 文档源码（Markdown）
docs/public/          # 静态资源（配图等），映射到站点根路径
docs/.vitepress/      # VitePress 配置与主题
kb-remote-site/       # Kooboo CLI 项目（构建产物导出目录，src/ 由脚本生成）
.kooboo-deploy/       # 旧 manifest 发布方案的兼容状态
scripts/              # 构建、导出、部署、截图脚本
guides/               # 维护者文档（不发布到线上文档站）
```

内部规范与 backlog 见 `.trellis/spec/`。
