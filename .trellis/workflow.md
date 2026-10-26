# kb-docs 工作流程

本仓库维护 Kooboo 文档、VitePress 主题与发布工具。用户在当前会话中的要求优先于本文件和历史规范。

## 开始工作

- 检查 `git status --short`，保留用户和其他会话的改动。
- 根据任务读取相关规范，不要求初始化开发者身份、建立 Trellis 任务或记录每次会话。
- 文档位置与常用命令见 [README](../README.md) 和 [维护指南](../guides/maintenance.md)。

## 文档约定

- 中英内容成对维护。当前只发布英文，源文件在 `docs/en/**`，公开页面位于站点根路径。
- 中文源文件留在 `docs/**`；发布开关以 `scripts/docs-publish-locale.mjs` 为准。
- CMS 图文手册见 [CMS 编写规范](spec/cms-documentation-workflow.md)；图片见 [配图规范](spec/documentation-images.md)。
- API 文档另见 [API 工作流](spec/api-documentation-workflow.md)，不把 CLI 本地资源语法写成后台示例。
- 内部计划、验收记录与写作策略放在维护文档中，不进入公开正文。

## 检查

按实际改动选择检查：

- Markdown、导航或图片：文档构建、死链检查和图片引用检查。
- 主题、编辑器或发布脚本：运行相关的聚焦测试。
- 不默认执行全量 vue-tsc 或 lint。
- 浏览器验收优先请用户手动处理；Agent 控制浏览器需要用户授权。授权截图只覆盖已指定的演示环境与操作范围。
- 构建成功不等于浏览器验收或线上发布成功，报告时明确区分。

## 提交与发布

- 默认保留工作区改动，不自动暂存、提交或推送。
- 用户说“可以提交”通常指暂存相关改动并提供 commit message；明确要求直接 commit 时才创建提交。
- 部署遵循 [发布 SOP](spec/kooboo-docs-deployment-sop.md)：锁定既有 Site ID，冻结计划与快照，先验证支撑资源，再切换页面。
- 失败从同一计划和回执恢复。不能通过删除重建站点、换绑域名或全站清理来发布。
- 同一站点只允许一个发布者；本地构建也要避开其他会话正在使用的产物。

## 历史记录

`tasks/archive/` 和 `workspace/` 保存历史记录，不代表当前部署状态或当前待办。已完成任务按完成月份归档；未完成任务需要核对实际状态后再处理。
