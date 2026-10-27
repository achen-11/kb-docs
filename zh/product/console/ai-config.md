# 控制台：AI 配置

> 配置组织级 AI Provider API Key。站点要使用 AI 能力时，通常先在这里准备 Provider，再回站点后台启用具体 AI 服务。

## 如何打开

| 项目 | 说明 |
|------|------|
| 菜单路径 | 顶部 **控制台** -> 左侧 **AI 配置** |
| 深链 | `/_Admin/kconsole/consoleAIConfig` |
| 前端路由 | `/kconsole/consoleAIConfig` |
| 可见身份 | 组织管理员 |

AI 配置是组织级入口，不是某个站点自己的配置页。它保存 Provider 的 API Key，供后续站点级 AI 服务使用。

<DocImage src="/product/console/ai-config-overview.png" alt="控制台 AI 配置 Provider 列表（ApiKey 已打码）" width="1120" />

## 页面结构

页面会按 Provider 展示卡片，每张卡片包含：

| 区域 | 说明 |
|------|------|
| Provider 图标 | 后端返回的 Provider icon |
| Display Name | Provider 显示名称 |
| 模型标签 | 有聊天模型时显示 `Chat`；有向量模型时显示 `Embedded` |
| `ApiKey` | 当前 Provider 的自定义 API Key 输入框 |
| 底部保存栏 | 点击保存后统一提交所有 Provider 的 Key |

在线服务环境中，`ApiKey` 输入框旁会显示提示图标，用于说明空 Key 时的行为。

## 配置 API Key

1. 找到要使用的 Provider。
2. 在该 Provider 的 `ApiKey` 输入框中填入密钥。
3. 点击页面底部保存按钮。
4. 保存后页面会重新加载 Provider 列表。

页面保存时会提交每个 Provider 的名称和 `ApiKey`。如果只改了其中一个 Provider，也会按当前页面状态统一提交。

## 与站点 AI 服务的关系

| 控制台 AI 配置 | CMS：AI 服务 |
|----------------|--------------|
| 组织级 Provider Key | 站点级 AI 功能开关、MCP、AI 函数 |
| 入口 `/_Admin/kconsole/consoleAIConfig` | 入口 `/_Admin/system/ai-service?SiteId={GUID}` |
| 先准备可用 Provider | 再给具体站点选择和启用能力 |

如果站点 AI 服务里调用模型失败，排查顺序通常是：余额 -> 控制台 AI 配置 -> 站点 AI 服务。

## 常见工作流

| 场景 | 顺序 |
|------|------|
| 首次启用 AI | [余额](./balance.md) -> AI 配置 -> [CMS：AI 服务](/cms/settings/ai-service.md) |
| 更换 Provider Key | AI 配置 -> 修改 `ApiKey` -> 保存 -> 回站点测试 |
| 只用 Kooboo 内置能力 | 先确认页面提示和环境支持，再决定是否填写自定义 Key |

## 相关

| 文档 | 说明 |
|------|------|
| [控制台概述](../console.md) | 控制台菜单地图 |
| [余额](./balance.md) | AI 使用前的账户余额核对 |
| [CMS：AI 服务](/cms/settings/ai-service.md) | 站点级 AI 服务、MCP、AI 函数 |
| [AI Claw / AI Chat](../ai-chat.md) | 站点后台 AI 入口 |
