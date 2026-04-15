# brainstorm: Security 文档重构

## Goal

将 Security 相关 API 文档进行重构，包括 session、user、permission、organization 等模块，确保所有示例经过真实测试验证。

## What I already know

- Security 包含多个子模块：session、user、permission、organization 等
- 文档结构应遵循：概述 → TypeScript 定义 → 方法 → 参数表 → 示例
- 需要与 request、response、cookie 一样进行全量验证
- 测试站点：https://kb-doc.redev.cn
- Kooboo 语法规范已知（body vs form、KDictionary.get() 等）

## Assumptions (temporary)

- Security 模块可能涉及敏感操作，部分 API 可能有权限限制
- 测试可能需要模拟登录状态
- 不同子模块的复杂度可能不同

## Open Questions

- Security 下具体有哪些子模块需要文档化？
- 哪些是核心常用 API，哪些可以后面再补？
- 是否有依赖关系（如 session 需要先了解才能理解 user）？
- 测试时是否需要特殊权限或模拟状态？

## Requirements (evolving)

- [ ] 确定 Security 模块范围和优先级
- [ ] 建立统一的文档模板
- [ ] 制定验证策略（全量 vs 重点）
- [ ] 完成各子模块文档编写和验证

## Acceptance Criteria (evolving)

- [ ] Security 各子模块文档结构一致
- [ ] 所有示例代码经过真实测试
- [ ] API 验证流程遵循 api-verification.md 规范

## Out of Scope (explicit)

- 后端实现代码修改
- 非 Kooboo 相关的安全机制

## Technical Notes

- 测试站点：https://kb-doc.redev.cn
- 本地项目：`old-source/kb-doc/`
- kooboo-cli：`kb push api` 命令推送测试代码
