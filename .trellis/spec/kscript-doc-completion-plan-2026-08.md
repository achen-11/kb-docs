# KScript 文档补全分区计划（2026-08）

> 本计划承接 KScript 智能提示与文档双向核对结果。
> 执行规范见 [kscript-intellisense-doc-alignment-sop.md](./kscript-intellisense-doc-alignment-sop.md) 与 [api-documentation-workflow.md](./api-documentation-workflow.md)。

## 1. 当前决策

### 暂不公开文档化

| 范围 | 状态 | 原因 / 恢复条件 |
|------|------|-----------------|
| `k.ai`（整个区域） | `product-hold` | `k.ai.app` 已是过时能力；先完成产品侧清理和推荐面确认，再重新审计 `k.ai` |
| `k.integration` | `product-hold` | 当前不加入公开推荐文档 |
| `k.integrateCommerce` | `product-hold` | 当前不加入公开推荐文档 |
| `k.market` | `product-hold` | 当前不加入公开推荐文档 |

以上范围即使出现在 `KScript/GetDefine` 中，也不进入 `docs/api/**`、`docs/en/api/**`、API 索引和示例。兼容代码不在公开正文建立“废弃方法清单”。

### 双语发布策略

- 中文源：`docs/api/**`，继续维护但暂不发布。
- 英文源：`docs/en/api/**`，当前正式发布。
- 每个实施批次必须中英 1:1 同步，不能先只完成英文再长期补中文。

## 2. 排序原则

每批开始前重新采集当前版本 `KScript/GetDefine`，以下清单只作为本次核对形成的候选队列，不替代实施时的实时审计。

排序规则：

1. 先清理文档中已不推荐或命名错误的内容，避免继续误导。
2. 先只读和上下文 API，再做可回滚 CRUD。
3. 需要站点配置、外部 provider 或真实凭据的模块后置。
4. 权限、发布、历史恢复、删除等高风险操作最后处理。
5. 一个批次只包含可独立验证和 review 的小区域。

## 3. 分区

| 区域 | 范围 | 主要验证等级 |
|------|------|--------------|
| Batch 0：推荐面清理 | 无提示、兼容入口、大小写、错误存在性说明、索引死链 | R；必要时 M |
| Zone A：核心与上下文 | 根方法、只读上下文、缓存分组等低风险能力 | R |
| Zone B：`k.site` | 站点上下文、资源库 CRUD、历史/发布/权限操作 | R → M → E |
| Zone C：`k.account` | 登录态、用户、组织、OAuth 等缺口 | R / E |
| Zone D：`k.DB` | 内置存储和外部数据库 provider | R / M / E |
| Zone E：配置型能力 | `k.google.firebase`、`k.cache.group` 等 | R / E |
| Zone F：长尾能力 | `history`、`template`、`sandbox`、`privacy`、`analytics`、`inlineEditor` | R / M / E |

## 4. 实施批次

### Batch 0：清理旧推荐与结构债务

目标：先让现有文档不再推荐当前提示面之外或命名错误的入口。

本次审计发现的候选项，实施前逐项重验：

- 核对并清理 `k.storage` 的公开推荐状态和索引入口；
- 核对 `k.payment.get()` 是否属于当前最终提示，并修正文档/provider 获取方式；
- 核对 `k.openApi.get()` 的动态提示模型，避免把兼容调用写成固定 API；
- 核对 `k.DB.getDB()` 是否仍应推荐；
- 将 `k.site.List()` / `k.site.Get()` 与最终提示大小写对齐；
- 移除把 `k.user` 当作新代码入口的兼容说明，统一推荐 `k.account` / `k.account.user`；
- 修正任何“`k.site.files` 不存在”的旧结论，以当前提示和运行结果为准；
- 同步修复中英 API 索引、侧边栏和死链。

验收：每项都要记录“当前提示证据 + 文档处理结果”；涉及替代写法时，替代示例必须实测。

### Batch 1：Zone A — 低风险核心与根方法

建议顺序：

1. `k.fromSite(nameOrId)`：先验证站点查找、无权限或不存在时的行为。
2. `k.output(value)`：验证适用执行上下文和实际输出。
3. `k.cache.group`：验证分组的读、写、过期和隔离语义。
4. 其他仅需当前上下文即可验证的根方法缺口。

拆分原则：`fromSite` 涉及跨站权限，不与普通输出示例混成一个页面任务。

### Batch 2–4：Zone B — `k.site`

#### Batch 2：只读与上下文

- `k.site` 根对象、当前站点信息与规范大小写；
- labels、media、images、menus、multilingual 等只读路径；
- `k.site.files` 与 `k.file` 的边界和互链。

#### Batch 3：可回滚资源 CRUD

- formValues；
- htmlBlocks、textContent；
- 已有 pages、layouts、views、scripts、styles、codes 文档的缺失方法和示例复核。

每个写操作必须使用独立 get/list/read 回读，并在测试结束后清理测试资源。

#### Batch 4：高风险站点操作

- editLog / history；
- user、权限相关操作；
- package、publish、restore、delete 等存在权限或不可逆风险的能力。

这一批必须逐子模块实施。无法安全 reset 的操作不进入公共示例。

### Batch 5：Zone C — `k.account`

先生成当前 `k.account` 完整提示树，再按以下顺序补全：

1. 当前用户和登录态的只读方法；
2. `k.account.user`；
3. organization；
4. OAuth / 登录登出等会改变会话或需要 provider 的能力。

必须明确区分账号、组织成员、站点访问权和前台会员，不能用 `k.site.list()` 或 `k.site.user.addUser()` 推导不存在的“是否为站点用户”语义。

### Batch 6：Zone D — `k.DB`

分两类处理：

#### 内置、可本地验证

- `indexedDb`；
- `sqlite`；
- key-value / worm 等当前提示实际暴露的存储。

#### 依赖配置的 provider

- mysql；
- sqlServer；
- mongo；
- 其他由当前提示返回的数据库 provider。

不能因为源码中存在 provider 就写入固定文档。只有在真实站点配置后出现提示并完成连接、查询及失败路径验证，才进入公开文档。

### Batch 7：Zone E — 配置型能力

建议顺序：

1. `k.google.firebase`；
2. `k.cache.group` 若未在 Batch 1 完成；
3. 其他站点配置生成的非暂停动态能力。

文档要明确配置前提，但不得暴露凭据。外部服务不可用时，不用模拟成功结果替代真实验证。

### Batch 8+：Zone F — 长尾能力

候选顺序：

1. `k.history`；
2. `k.template`；
3. `k.sandbox`；
4. `k.privacy`；
5. `k.analytics`；
6. `k.inlineEditor`。

每个模块先单独做“提示面 + 行为 + 推荐状态”小审计，再决定是建新页、合入现有页还是继续暂停。不要一次创建全部占位页。

## 5. 单批执行模板

```markdown
## 范围
- 智能提示路径：
- 中文文档：
- 英文文档：
- 明确排除：

## 当前证据
- Kooboo commit：
- 测试站点与配置：
- completion snapshot：
- 源码签名：

## 示例验证
- ai-check：
- live URL / curl：
- 读操作实际结果：
- 写操作 before / after / cleanup：

## 验收
- [ ] 仅记录当前推荐提示面
- [ ] 所有公开示例已执行
- [ ] 写操作已独立回读
- [ ] 中英文 1:1
- [ ] 导航、索引、链接通过
- [ ] 更新本计划与 backlog
```

## 6. 当前下一步

1. 先实施 Batch 0，不新增长尾页面。
2. Batch 0 验收后，按 Batch 1 → Batch 2 的顺序推进。
3. 每批开始前重新核对 Kooboo 当前版本和真实提示，若提示面变化，先更新计划再写正文。
4. 四个 `product-hold` 区域只有在维护者明确恢复后才能进入新批次。
