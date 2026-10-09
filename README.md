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

## 原始 Markdown 发布

构建会将实际发布的 Markdown 源文件按页面路由复制到 dist，随后导出到
`kb-remote-site/content-file/`，由现有部署流程一起上传。例如
`/cms/getting-started/login-and-site-list.html` 对应的源文件可通过
`/cms/getting-started/login-and-site-list.md` 访问。英文源文件虽保存在
`docs/en/`，发布路径仍遵循 VitePress 的根路径映射。

Markdown 保留原始内容（包括 frontmatter 和 Vue 组件标签）。未发布的文档不导出；
`docs/public/` 中的 Markdown 是内部资源说明，不生成页面、不进入搜索，也不作为静态文件发布。
发布前可运行 `node --test scripts/export-published-markdown.test.mjs` 验证导出规则。

## SEO 发布设置

构建生成 `sitemap.xml`、`robots.txt` 和页面 canonical，使用正式域名
`https://docs.kooboo.com`。Sitemap 仅包含实际发布的文档 HTML；首页为 `/`，
目录页保留 `/cms/index.html` 这样的 Kooboo 页面路由，404 与旧 `/en/` 跳转页不收录。
这两个静态文件随 `content-file` 一起部署。

部署此版本时，在 Kooboo 站点后台关闭自动 Sitemap（尤其是 `/sitemap.xml` 路径），
否则中间件会优先返回远端路由扫描结果，覆盖构建生成的文件。
同时关闭 Kooboo 的自动 Canonical URL，统一使用页面 HTML 的 canonical；
它原有的响应头功能按请求路径生成 URL，可能与目录页的固定 HTML 路由不同。
部署后将 `https://docs.kooboo.com/sitemap.xml` 提交到 Google Search Console，
并检查线上响应头、HTML canonical 与 sitemap 路径一致。

每页标题加入文档栏目和父级路径，描述优先采用页面简介或首段正文（跳过菜单位置说明）。
作者可通过 frontmatter 的 `title`、`description` 覆盖自动生成值。
描述自动提取是基础覆盖；重要落地页仍可编辑成更贴合搜索意图的摘要。

Kooboo 导出将 HTML canonical 转成 `@k-canonical` 设置，部署器写入 Page 的
`customHeader`，兼容旧 Kooboo 页头渲染器。部署需使用支持该设置的新版 CLI exact 模式。
描述中的变量占位符使用方括号，防止服务器把花括号当作动态模板参数替换。

## 已有站点的分阶段发布

导出默认按资源内容生成 `/assets/releases/<digest>/` 目录。先部署并验证新支撑资源，
再更新引用它们的 Page；保留旧资源，便于恢复原页面。CLI 禁止用不同内容覆盖已经存在的
同名版本 JS/CSS。可通过 `KOOBOO_ASSET_RELEASE` 指定唯一发布标识，但不可复用标识覆盖旧内容。

发布前核对域名当前对应的站点 ID，把 ID 和 URL 一起写入固定计划；不要沿用旧 artifact 的
站点配置。备份资源、设置和被修改对象，分别保存支撑资源及页面阶段的计划、回执和 HTTP
校验结果。不要通过新建站点、换绑域名或全站 prune 进行发布。真实交互按项目约定由人工
验收，或在得到用户允许后运行浏览器验收脚本；该脚本会自动识别当前资源版本目录。
