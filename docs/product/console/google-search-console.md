# 控制台：Google SC

> 接入 Google Search Console，完成身份验证后查看站点权限、验证站点、查看 Analytics，并提交 Sitemap。

## 如何打开

| 项目 | 说明 |
|------|------|
| 菜单路径 | 顶部 **控制台** -> 左侧 **Google SC** |
| 深链 | `/_Admin/kconsole/searchConsole` |
| 前端路由 | `/kconsole/searchConsole` |
| 可见身份 | 组织管理员 |

Google SC 是组织级入口。页面会先判断当前账号是否已经完成 Google 授权，再决定显示登录提示或站点列表。

<DocImage src="/product/console/google-search-console-overview.png" alt="控制台 Google Search Console 站点列表" width="1120" />

## 身份验证

如果还没有完成 Google 授权，页面会显示提示：

```text
要访问Google Search Console 数据请先完成身份验证
```

点击 `Login` 后会跳转到后端返回的授权地址，授权回调地址使用当前页面地址。完成授权后再回到 Google SC 页面查看站点列表。

## 站点列表

授权完成后，页面显示站点表格：

| 列 | 说明 |
|----|------|
| Site | Search Console 站点 URL |
| Permission | 权限级别，例如 `siteOwner`、`siteUnverifiedUser` |
| 操作 | 未验证站点显示 `Validation`；已验证站点显示 `Analytics` 和 `Sitemap` |

当前前端代码中“添加站点”按钮处于注释状态，因此常规界面主要用于查看和管理已返回的站点列表。若你的环境额外开放添加入口，以实际界面为准。

## 验证站点

当站点权限为 `siteUnverifiedUser` 时，右侧会显示 `Validation`。

点击后前端会调用验证接口，并尝试刷新站点列表。验证通过后，该站点会切换到已验证状态，右侧显示 `Analytics` 和 `Sitemap`。

## Analytics

已验证站点点击 `Analytics` 会打开分析弹窗。

顶部筛选：

| 控件 | 说明 |
|------|------|
| 聚合方式 | `Auto`、`By Page`、`By Property` |
| 日期范围 | 默认最近 30 天 |
| `Search` | 按当前条件重新加载数据 |

结果表格：

| 列 | 说明 |
|----|------|
| Clicks | 点击数 |
| CTR | 点击率 |
| Impressions | 展示次数 |
| Keys | Search Console 返回的 key 列表 |

## Sitemap

已验证站点点击 `Sitemap` 会打开 Sitemap 弹窗。

顶部 `Submit` 下拉按钮会列出当前站点可提交、且尚未提交的 Feed。选择后会提交 Sitemap 并刷新列表。

Sitemap 表格：

| 列 | 说明 |
|----|------|
| Path | Sitemap 路径 |
| Last Submitted | 最近提交时间 |
| Last Downloaded | Google 最近下载时间 |
| Error | 错误数量 |
| Warning | 警告数量 |

勾选已有 Sitemap 后可删除，删除前会弹确认。

## 常见工作流

| 场景 | 顺序 |
|------|------|
| 首次接入 Search Console | Google SC -> Login -> 授权完成 -> 回到站点列表 |
| 验证站点 | 站点列表 -> Validation -> 刷新后确认权限状态 |
| 提交站点地图 | Sitemap -> Submit -> 选择 Feed -> 检查 Error / Warning |
| 查看搜索表现 | Analytics -> 选择聚合方式与日期范围 -> Search |

## 相关

| 文档 | 说明 |
|------|------|
| [控制台概述](../console.md) | 控制台菜单地图 |
| [域名](./domains.md) | Search Console 常依赖已接入域名 |
| [CMS：SEO 设置](/cms/settings/basic/seo.md) | 站点级 SEO 设置 |
