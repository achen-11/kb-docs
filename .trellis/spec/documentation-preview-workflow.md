# 文档站共享预览工作流

> 本规范记录已确认的内网预览与编辑架构。静态预览 MVP 已部署到 `http://192.168.10.75:4173/`，后续按本文路线继续建设自动同步、编辑入口、草稿预览和 Git 审核。

## 目标

内容人员修改文档后，应当通过网页直接获得共享预览，不需要：

- clone 仓库或安装本地开发环境；
- 手动定位构建输出；
- 运行 `pnpm docs:dev`；
- 学习或持有 Kooboo CLI 部署凭据。

Git 中的 Markdown 继续作为唯一内容源。Kooboo Page 是构建产物，不允许作为第二套人工编辑源。

## 两级预览

### 第一级：VitePress 静态预览

每个草稿或合并请求生成独立的生产构建预览，用于检查：

- Markdown 内容与排版；
- 图片和静态资源；
- 导航、语言切换和本地搜索；
- 普通站内链接；
- 构建及死链等自动检查。

正式运行时优先使用独立 Host，例如：

```text
change-128.docs-preview.kbdev.com
```

不要默认使用 `/previews/128/` 子路径。当前站点以根路径部署并大量使用 `/assets/`、`/cms/` 等绝对路径，子路径预览容易发生资源串用和链接错误。

### 第二级：Kooboo 候选预览

审核候选版本部署到共享的内网 Kooboo 测试站，用于检查：

- `@k-url` Page 路由；
- JS、CSS、图片和 `content-file` 资源；
- RouteFinding Request Hook；
- Kooboo artifact 部署计划、删除和回执；
- 与生产环境相关的真实 URL 行为。

同一个 Kooboo 测试站的部署必须串行。静态草稿预览可以并行，Kooboo 候选预览默认只保留一个当前候选版本。

## 本地 MVP

本地 MVP 使用生产构建而不是长期暴露 VitePress Dev Server：

```text
docs/** 发生修改
  -> pnpm docs:build
  -> 复制完整 dist 到新的 release 目录
  -> 写入 release 元数据
  -> 原子切换 current 软链接
  -> HTTP 服务读取 current
```

目录结构：

```text
.local-preview/
├── current -> releases/<release-id>
└── releases/
    ├── <old-release-id>/
    └── <current-release-id>/
```

规则：

1. 新构建未成功前，继续提供上一个成功版本。
2. 构建失败只更新状态，不修改 `current`。
3. 构建期间再次发生修改时，不并行构建；当前构建结束后补跑一次。
4. 自动忽略 `docs/.vitepress/dist` 和 `docs/.vitepress/cache`，避免构建输出触发无限循环。
5. HTML 默认不缓存；预览页面返回 `X-Robots-Tag: noindex, nofollow`。
6. 默认只监听 `127.0.0.1`；需要局域网访问时显式监听 `0.0.0.0`。

## 本地命令

仅本机访问：

```bash
pnpm docs:preview:server
```

局域网访问：

```bash
pnpm docs:preview:lan
```

可配置环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DOCS_PREVIEW_HOST` | `127.0.0.1` | HTTP 监听地址 |
| `DOCS_PREVIEW_PORT` | `4173` | HTTP 端口 |
| `DOCS_PREVIEW_ROOT` | `.local-preview` | release 与运行状态目录 |
| `DOCS_PREVIEW_KEEP_RELEASES` | `5` | 保留成功 release 数量 |
| `DOCS_PREVIEW_DEBOUNCE_MS` | `800` | 文件修改后的合并等待时间 |

状态接口：

```text
GET /__preview/status
```

状态值：

- `starting`：服务已启动，尚未完成首次构建；
- `building`：正在构建；
- `ready`：最近一次构建成功；
- `degraded`：已有成功预览，但最近一次构建失败；
- `error`：首次构建失败，没有可用预览。

## 内网迁移原则

内网服务器应优先使用自托管 Runner 或主动拉取任务的 Preview Agent。不要假定公网 CI 可以直接连接公司内网 IP。

迁移时增加：

- 独立的非管理员服务账户；
- systemd 等进程守护；
- 内部 DNS 与 Nginx/Caddy；
- 每个草稿独立 Git worktree 和 Host；
- 关闭或合并后的自动清理；
- 磁盘配额、release 保留和健康检查；
- 与生产凭据隔离的 Kooboo 测试站凭据。

内容人员不直接使用 SSH。SSH、自托管 Runner、构建命令和 Kooboo CLI 都属于后台基础设施能力。

### 已实现的服务器化边界

当前仓库已将发布和常驻服务拆开：

```bash
pnpm docs:preview:publish # 一次构建并原子发布，失败返回非零
pnpm docs:preview:serve   # 只服务 current，不构建、不监控源码
pnpm docs:preview:health  # 检查状态接口和首页
```

Linux + systemd + Nginx 的配置模板、dry-run 安装器和更新脚本位于 `deploy/preview/`。完整 SSH 迁移与运维步骤见 `guides/preview-server-deployment.md`。

## 完整目标流程

```text
保存草稿
  -> 独立静态预览
  -> 提交审核
  -> 共享 Kooboo 候选预览
  -> 审核通过
  -> 生产部署
```

静态预览通过不等于 Kooboo 部署通过；Kooboo 候选预览通过也不自动授权生产发布。

## 已确认的实施路线

### 总体数据流

```text
本地开发者修改 -> Git push 或开发者草稿同步 ┐
                                                ├-> 统一串行构建队列
内容人员点击编辑链接 -> 编辑平台 -> 保存草稿 ┘
  -> VitePress 完整构建
  -> 成功后原子切换 release
  -> 4173 自动刷新或重新加载当前页面

编辑平台提交审核
  -> 生成干净的 Git commit / 分支
  -> 审核与合并
  -> Kooboo 候选验证
  -> 明确授权后生产部署
```

### 保存与提交的边界

1. “保存草稿”写入草稿工作区并触发静态预览，不要求立即 push Git。
2. “提交审核”展示 diff 和修改说明，然后生成可审查的 Git commit。
3. 生产发布只接受审核后的明确 Git commit，不接受编辑平台未提交的工作区状态。
4. 第一版使用一个共享草稿预览；多人独立 worktree 和独立 Host 在后续阶段增加。
5. 不把共享服务器改成长期开启的 VitePress Dev Server。保存后运行生产构建，成功前继续服务旧 release。

### Phase 1：Git 自动同步与构建串行化

- 服务器使用真实 Git checkout 和只读拉取凭据。
- 内网服务器主动轮询远端分支，不依赖公网 webhook 访问内网 IP。
- 只允许干净工作区和 fast-forward 更新；本地提交、分叉或未提交修改必须拒绝自动覆盖。
- Git fetch、fast-forward、依赖安装、构建、release 切换和发布标记写入必须共享同一把跨进程锁。
- 只有构建和健康检查成功后才推进“已发布 commit”标记；失败时下一轮继续重试，旧 release 保持可用。
- 开发者的第一条可用链路为 `commit/push -> 主动拉取 -> 自动构建 -> 4173 更新`。

当前实施状态（2026-08-11）：Phase 1 已完成。同步器、跨进程锁、systemd timer 和 CNB 仓库级 HTTPS 只读部署令牌均已启用；服务器使用 `/opt/kb-docs-git` 的干净 checkout，轮询 `codex/docs-preview-phase1`，间隔 30 秒。端到端提交 `18c23fe` 已自动完成 fetch、fast-forward、VitePress 构建、健康检查和 release 原子切换，且构建期间旧 release 持续可用。原 `/opt/kb-docs` 非 Git 副本保留为回滚材料。后续进入 Phase 2：VitePress 编辑链接和编辑平台骨架。

### Phase 2：VitePress 编辑链接与编辑平台骨架

- 编辑链接通过环境变量配置编辑平台地址，内网预览显示，公开构建默认关闭。
- 使用 VitePress 提供的真实 `filePath` 生成链接；编辑平台必须再次进行路径白名单和路径穿越校验。
- 创建独立的编辑服务，第一版提供登录、打开文档、只读展示和构建状态入口。

### Phase 3：草稿保存与自动预览

- 使用 Markdown 编辑器，不在第一版引入可能破坏 Frontmatter、Mermaid、代码块或 Vue 扩展的通用富文本编辑器。
- 保存使用原子写入和文件哈希冲突检查。
- 保存后进入统一构建队列，编辑界面显示排队、构建、成功或失败，并在成功后刷新预览 iframe。
- 浏览器端不接触 Git、SSH、Kooboo 或服务器部署凭据。

### Phase 4：Git 提交与审核

- 提交前展示完整 diff 并要求修改说明。
- 为草稿生成分支和清晰 commit，推送到远端并进入审核。
- 审核通过后才允许合并和进入 Kooboo 候选部署。

### Phase 5：多人和高级能力

- 每人或每个审核请求独立 worktree 与预览 Host。
- 图片管理、自动回滚、内部域名与 HTTPS。
- Kooboo 候选站自动部署与验证，但不自动授权生产发布。

## 编辑平台 MVP 约束

- 预览服务继续使用 `4173`；编辑服务初期使用独立端口。
- 仅允许编辑 `docs/**/*.md` 和明确开放的静态资源目录。
- 同一文件被其他人修改后，旧版本保存必须返回冲突，不允许静默覆盖。
- 所有构建必须串行；独立进程不能各自启动并发 VitePress 构建。
- 保存失败、构建失败或 Git 提交失败都必须向用户显示明确状态和日志摘要。
- 内网地址不是写权限控制；编辑服务必须要求认证并记录操作者、时间、文件和结果。
