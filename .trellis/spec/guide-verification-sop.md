# 最佳实践文档编写与验证 SOP

> 适用范围：`docs/guide/**` 最佳实践文档，以及其对应的本地 Kooboo 验证站点。
> 核心原则：每篇最佳实践必须能被一个真实 Kooboo 站点证明，且站点本身要达到可展示、可复查、可重放的质量。

## 目标

最佳实践不是 API 参考，也不是临时测试记录。它要回答真实业务功能如何在 Kooboo 中落地。因此每篇文档都必须同时满足四个条件：

1. **真实**：文档中的流程、代码、错误码和边界条件来自可运行站点，而不是凭经验推断。
2. **可复查**：有明确站点名、clone 路径、验证脚本、截图和导出包。
3. **可重放**：其他维护者能按 SOP 重新 `kb clone`、`kb push`、运行验证。
4. **可展示**：前台验证页不是裸按钮调试面板，而是一个能说明场景的业务 demo。

## 固定资产

### 站点来源

当前验证站点以本机 Kooboo 环境为准。Kooboo 后台 **最佳实践** 文件夹中的站点资源，以及后台实际打开的 `*.localkooboo.com` 前台 URL，共同构成当前 live 验证源：

```text
http://localhost:3000/_Admin/?currentFolder=最佳实践
```

站点名通常使用 `guide_<scenario>_<stamp>`，例如：

```text
guide_checkout_0609052302
guide_payment_callbacks_06090534
guide_websocket_06090550
```

开始复核前先在后台确认站点存在、能打开前台 URL、属于最佳实践文件夹。不要凭 `.local-review` 中的旧包或历史环境记录直接假定当前本地站点仍然一致。

当前最佳实践站点通常保留站点名中的下划线，并通过本地域名访问。例如 `guide_checkout_0609052302` 对应：

```text
http://guide_checkout_0609052302.localkooboo.com
```

`redev.cn` 只允许作为迁移前的历史来源或旧证据引用，不能再作为当前功能通过、视觉通过或已收口的依据。若 registry、README、notes 或脚本仍把 redev URL 标成 `Live URL`，开始新一轮复核前必须先改为本地站点，并把旧结论视为历史记录。

CLI 操作使用本机 Kooboo 验证账号。账号和密码只允许通过命令行交互、本地 `.env` 或本机安全凭据渠道提供；不要写入 SOP、registry、公共文档、证据 README 或命令输出摘要。

### 本地工作区

每个场景复核时 clone 到仓库外的持久目录：

```text
/Users/achen/Priv/Yardi/kb-docs-guide-sites/<scenario>/<site-folder>/
```

示例：

```bash
kb clone -t empty http://guide_checkout_0609052302.localkooboo.com \
  /Users/achen/Priv/Yardi/kb-docs-guide-sites/checkout/guidecheckout0609052302
```

`kb clone` 的参数格式为：

```bash
kb clone [options] <siteUrl> [dir]
```

如果站点 URL 不确定，先从本机 Kooboo 后台打开站点确认 URL。不要只按站点名猜域名后直接写入文档。

如果持久目录中已经存在该站点的 clone，不要因为环境迁移重复覆盖工作区。先把项目 `.env` 的 `KOOBOO_SITE_URL` 改为后台确认的 `*.localkooboo.com` URL，再执行聚焦的 `kb pull` / `kb check` 确认本地源与当前站点关系。旧 redev clone 只能作为 Git 历史基线，不能继续作为同步目标。

不要把 clone 项目放在 `/tmp` 下；系统可能清理临时目录，导致后续无法复查。`/tmp` 只允许用于一次性下载、临时截图或可重新生成的中间文件。

### 证据目录

复核证据放在 `.local-review/guide-verification/<scenario>/`，不发布到文档站。

建议结构：

```text
.local-review/guide-verification/<scenario>/
├── README.md                 # 本次复核摘要
├── result.json               # 脚本断言结果
├── network-log.json          # 关键 HTTP / WebSocket 调用摘要
├── screenshots/
│   ├── desktop.png
│   ├── mobile.png
│   └── failure-state.png
├── site-export.zip           # kb export 或后台导出的站点包
└── notes.md                  # 问题、修复、仍需人工判断的点
```

旧的 `.local-review/guide_*.zip` 包可以作为历史证据，但重新复核后应补齐上述目录。

历史汇总文件（例如下载目录或 `.local-review` 中的 `guide-verification-evidence.md`）只能作为检查清单和风险提示使用。文件里的 `√`、旧截图、旧 `/tmp` 路径或旧验证结论不能直接转写为本轮 `功能通过` / `已收口`。每次新结论必须来自当前站点源码、当前验证脚本、当前截图、当前导出包和 registry 更新。

## Registry

所有最佳实践文档的复核状态记录在：

```text
.trellis/spec/guide-verification-registry.md
```

每次复核必须更新 registry。状态只允许使用以下值：

| 状态 | 含义 |
|------|------|
| `索引页` | 汇总页，不对应独立验证站点 |
| `待复核` | 有旧文档或旧站点，但未按本 SOP 重跑 |
| `已 clone` | 已从当前本机 Kooboo 站点 clone 到 `/Users/achen/Priv/Yardi/kb-docs-guide-sites/`，且 `.env` 指向 `*.localkooboo.com` |
| `功能通过` | 验证脚本和页面交互通过 |
| `样式待修` | 功能通过，但前台 demo 未达到视觉门槛 |
| `文档待改` | 站点行为与文档不一致，需改文档或站点 |
| `已收口` | 功能、样式、文档、证据全部通过 |
| `阻塞` | 缺站点、缺凭据、平台行为异常或外部服务不可用 |

## 验证等级

沿用 L0-L3，但最佳实践正文页不得低于 L2；涉及安全、支付、鉴权、文件、Webhook、WebSocket、通知的场景默认 L3。

| 等级 | 要求 | 适用场景 |
|------|------|----------|
| L0 | 只核对现有 CMS / API / 模板文档是否存在 | 索引页、概览页 |
| L1 | 通过 CLI 推送 API / CodeBlock，并用 HTTP 调用验证 | 纯 API 组合型说明 |
| L2 | 通过真实前台页面完成完整用户流程 | 表单、内容页、缓存、搜索、数据 CRUD |
| L3 | 覆盖失败路径、权限、幂等、重放、过期、回调、重连等异常 | 鉴权、支付、Webhook、WebSocket、通知、上传、安全 |

新增视觉等级：

| 等级 | 要求 |
|------|------|
| V0 | 仅能操作，不要求展示质量；只能用于临时调试，不能收口 |
| V1 | 可教学 demo：布局清晰，状态完整，桌面和移动无明显错位 |
| V2 | 可产品化 demo：信息层次、表单、反馈、空状态、错误状态都接近真实业务页面 |

默认收口门槛为 `L2 + V1`；高风险场景为 `L3 + V1`。

## 编写流程

### 1. 选定文档和站点

1. 从 registry 选择一篇 `待复核` 文档。
2. 在 Kooboo 后台 **最佳实践** 文件夹中找到对应站点。
3. 确认文档路径、站点名、站点 URL、旧 `.local-review/guide_*.zip` 是否一致。
4. 如找不到站点，将 registry 标为 `阻塞`，不要新写结论。

### 2. Clone 和检查项目形态

```bash
kb clone -t empty <siteUrl> /Users/achen/Priv/Yardi/kb-docs-guide-sites/<scenario>/<site-folder>
cd /Users/achen/Priv/Yardi/kb-docs-guide-sites/<scenario>/<site-folder>
```

clone 成功后先建立本地 Git 基线，再开始任何复核、修 UI 或改代码：

```bash
git init
git add .
git commit -m "chore: import localkooboo baseline"
```

这个 Git 仓库只用于单个验证站点的本地复核，不和 `kb-docs` 主仓库混用。后续所有站点修复都应能通过该站点仓库的 `git diff` 看出“当前本地站点基线 → 复核修正”的最小改动。若仓库最初从 redev 导入，应保留该历史事实，但新验证必须基于当前 localkooboo 站点重新 pull、push 和取证。

进入 clone 后先做项目检查：

```bash
pwd
find src -maxdepth 3 -type d | sort
rg --files src | sed -n '1,220p'
rg -n "@k-url|k\\.api|fetch|<button|<form|<style|class=" src
```

检查 `.env` 时只确认必要 key 是否存在，不要记录账号、密码、token。

### 3. 文档真实性审计

逐段核对 `docs/guide/**/*.md`：

1. 文档中的 API 路由是否存在于站点资源。
2. 示例代码是否与站点实现同构，不能出现文档写 A、站点跑 B。
3. 错误码、状态码、返回字段是否能由脚本或页面触发。
4. 文档中的安全边界是否真的实现，例如幂等、验签、权限、过期、重试。
5. “生产项目应替换为...” 必须区分模拟实现和稳定架构结论。
6. 若某个结论无法验证，改文档为保守表述，或补站点验证。

### 4. 功能验证

每篇正文页必须有可重放验证脚本，推荐放在本地 clone 的 `tools/verify.mjs`，或记录等价命令到证据目录。

脚本至少输出：

```json
{
  "scenario": "checkout",
  "site": "guide_checkout_0609052302",
  "level": "L3",
  "passed": true,
  "checks": [
    { "name": "normal checkout preview", "passed": true },
    { "name": "invalid discount rejected", "passed": true }
  ]
}
```

功能验证必须包含：

- reset / seed 步骤，保证复核可重复。
- happy path。
- 关键失败路径。
- 页面交互路径，不能只测 API；浏览器操作优先使用 `@chrome` / 本机 Chrome。
- `kb pull` 回读证明 CLI 能管理当前本机 Kooboo 站点资源。

### 5. 前台样式修复

前台 demo 必须从“测试按钮面板”升级为“可教学业务界面”。

最低要求：

- 页面有明确标题、场景说明、操作区、结果区、状态区。
- 表单字段有 label、帮助文字、校验反馈。
- 成功、失败、loading、disabled、空状态都有可见表现。
- 桌面和移动宽度下文字不溢出、不遮挡、不挤压。
- 不使用只有裸 `<button>` 和 `<pre>` 的调试布局。
- 不把所有内容塞进一个大卡片；按业务流程分区。
- 按项目约定优先用 UnoCSS / utility class；复杂状态和动画再写独立 CSS。
- 不引入与场景无关的装饰图形、渐变堆叠或营销式 hero。

必须使用 `@chrome` / 本机 Chrome 完成桌面和移动视觉检查，并保存截图：

```text
screenshots/desktop.png  # 约 1440px 宽
screenshots/mobile.png   # 约 390px 宽
```

如果 `@chrome` 插件按故障恢复流程仍无法通信，且用户明确同意使用临时脚本方式作为 fallback，可以只完成视觉取证。

fallback 不能写成推荐路径；证据 README/notes 需要记录原因、使用时间、截图路径和触发的失败态。

如存在关键失败状态，额外保存：

```text
screenshots/failure-state.png
```

### 6. 文档回写

公共文档只保留稳定结论，不写验证站点名、测试账号、一次性 URL、本地 clone 路径和完整验证日志。

正文推荐结构：

1. 适用场景
2. 能力拆解
3. 推荐架构
4. 后台准备
5. 服务端流程
6. 前端流程
7. 安全与失败处理
8. 上线前检查
9. 相关文档

验证证据写入 `.local-review/guide-verification/<scenario>/README.md`，registry 只写摘要状态。

### 7. 导出和归档

复核完成后：

```bash
kb pull
kb export
```

将站点包保存到证据目录，同时可继续保留旧格式：

```text
.local-review/guide-verification/<scenario>/site-export.zip
.local-review/guide_<scenario>_<stamp>.zip
```

如果站点无法导出，registry 标为 `阻塞`，并在 notes 中说明原因。

### 8. 最终门禁

单篇最佳实践收口前必须满足：

- registry 状态为 `已收口`。
- 功能验证脚本通过。
- 桌面和移动截图已人工检查。
- 文档与站点行为一致。
- 证据目录存在 `README.md`、`result.json`、截图和站点包。
- `pnpm docs:build` 或 `./node_modules/.bin/vitepress build docs` 通过。
- `node scripts/check-dead-links.mjs` 通过。
- `git diff --check` 通过。

## 批量复核顺序

第一轮优先修复读者最容易复制、风险最高、样式最能暴露问题的场景：

1. `docs/guide/auth/password-login.md`
2. `docs/guide/content/forms.md`
3. `docs/guide/commerce/checkout.md`
4. `docs/guide/realtime/websocket.md`
5. `docs/guide/integrations/webhook-signature.md`

跑通一篇样板后，再按 registry 从 P0 / L3 场景向 L2 场景推进。
