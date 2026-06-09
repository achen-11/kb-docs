# AB 测试落地

> 用 Cookie 固定访客分流，用 Kooboo API 记录 impression / conversion，并用 KeyValue 保存轻量统计。

## 适用场景

这套做法适合运营团队需要小规模验证页面文案、按钮、价格卡片或注册入口效果的场景：

- 首页 Hero 文案、CTA 按钮、注册入口对比；
- 活动页 A/B 文案和布局实验；
- 价格页、下载页、预约页的转化入口对比；
- 需要把实验结果和 [页面交互埋点](./interaction-tracking.md) 或 [AB 测试](/cms/operations/ab-testing) 结合观察。

不适合把 Cookie 分流当成权限、定价或支付规则。涉及价格、库存、会员权益、支付金额时，仍应以服务端业务规则为准，A/B 测试只决定展示和引导，不决定最终交易事实。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| CMS | 配置和查看后台 AB 测试能力、实验对象和报告 | [AB 测试](/cms/operations/ab-testing) |
| Page | 展示不同页面变体，并触发分流和转化事件 | [Page](/templateEngine/page/) |
| API | 分配 variant、记录 impression / conversion、返回统计 | [k.api](/api/api/) |
| Cookie | 固定同一访客的实验组，避免刷新后跳组 | [k.cookie](/api/cookie/) |
| KeyValue | 保存轻量聚合统计 | [k.DB.keyValue](/api/key-value/) |

## 推荐架构

前台页面不要自己随机分流。分流、Cookie 写入和统计都应由服务端 API 统一处理：

```text
Page 加载或按钮触发
   ↓
/api/ab-test/assignment
   ↓
读取 guide_ab_variant cookie
   ↓
无 cookie：选择 A/B 并写 cookie
有 cookie：复用原 variant
   ↓
KeyValue 记录 impression
   ↓
Page 渲染对应变体
```

转化事件也通过 API 记录：

```text
用户点击注册 / 下载 / 咨询
   ↓
/api/ab-test/convert
   ↓
读取 cookie 中的 variant
   ↓
KeyValue 增加 conversion
```

## API：固定分流并记录统计

示例用 `guide_ab_variant` Cookie 固定访客实验组，用 KeyValue 保存 A/B 两组的曝光和转化计数：

```ts
// @k-url /api/ab-test/{action}

const summaryKey = "guide-ab-test:summary";
const variantCookie = "guide_ab_variant";

function currentVariant() {
  const value = String(k.cookie.get(variantCookie) || "").toUpperCase();
  return value === "A" || value === "B" ? value : "";
}

function readSummary() {
  const raw = k.DB.keyValue.get(summaryKey);
  return raw ? JSON.parse(raw.toString()) : {
    totalAssignments: 0,
    totalConversions: 0,
    variants: {
      A: { impressions: 0, conversions: 0 },
      B: { impressions: 0, conversions: 0 },
    },
    latest: [],
    updatedAt: "",
  };
}
```

分配接口应先读 Cookie。没有 Cookie 时再选择 variant 并写回 Cookie：

```ts
k.api.get("assignment", () => {
  const summary = readSummary();
  let variant = currentVariant();
  const sticky = Boolean(variant);

  if (!variant) {
    variant = summary.variants.A.impressions <= summary.variants.B.impressions ? "A" : "B";
    k.cookie.set(variantCookie, variant, 30);
  }

  summary.totalAssignments += 1;
  summary.variants[variant].impressions += 1;
  summary.updatedAt = new Date().toISOString();
  k.DB.keyValue.set(summaryKey, JSON.stringify(summary));

  return { success: true, variant, sticky, summary };
});
```

转化接口必须要求已经完成分流。否则无法判断转化属于哪个实验组：

```ts
k.api.post("convert", () => {
  const variant = currentVariant();

  if (!variant) {
    return {
      success: false,
      code: "MISSING_VARIANT",
      message: "还没有分配实验组，请先请求 assignment。",
    };
  }

  const summary = readSummary();
  summary.totalConversions += 1;
  summary.variants[variant].conversions += 1;
  summary.updatedAt = new Date().toISOString();
  k.DB.keyValue.set(summaryKey, JSON.stringify(summary));

  return { success: true, variant, summary };
});
```

真实项目里，分流算法可以改成按配置权重、用户分群、URL 来源或 CMS AB 测试配置决定。无论算法怎么变，固定 Cookie 和服务端统计边界不应变。

## Page：根据 variant 展示变体

页面只负责调用 API 和渲染结果，不直接决定实验组：

```html
<!-- @k-url /ab-test -->
<button id="assign" type="button">分配实验组</button>
<button id="convert" type="button">记录转化</button>
<pre id="result">等待操作。</pre>

<script>
  async function get(url) {
    const response = await fetch(url);
    return response.json();
  }

  async function post(url) {
    const response = await fetch(url, { method: "POST" });
    return response.json();
  }

  document.querySelector("#assign").addEventListener("click", async () => {
    const data = await get("/api/ab-test/assignment");
    renderVariant(data.variant);
  });

  document.querySelector("#convert").addEventListener("click", async () => {
    show(await post("/api/ab-test/convert"));
  });
</script>
```

如果页面加载时自动分流，要注意“刷新一次就增加一次 impression”的统计口径。对只想统计唯一访客曝光的实验，应额外记录访客 ID 或会话 ID，避免重复曝光。

## 与 CMS AB 测试的边界

[后台 AB 测试](/cms/operations/ab-testing) 更适合由 CMS 管理实验对象、变体和报告；本文的 API 方案适合业务代码里需要更细粒度控制的情况。

| 方式 | 适合 | 注意 |
|------|------|------|
| CMS AB 测试 | 页面、View、商品等对象级替换和后台报告 | 需要先配置实验对象、目标和流量 |
| API + Cookie | 注册入口、弹窗、按钮、业务流程节点 | 要自己维护统计、清理和报告 |
| 页面交互埋点 | 只关心点击/浏览行为，不需要固定变体 | 不负责分流和转化归因 |

两者可以组合：CMS 负责对象级变体，业务 API 负责更细的转化归因和订单、注册、预约等后续事件。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 没有 variant cookie 就转化 | 返回 `MISSING_VARIANT`，提示先分流 |
| Cookie 中是非法值 | 忽略旧值，重新分配 A/B |
| 刷新页面导致 impression 重复增加 | 明确统计口径，必要时用 session/访客 ID 去重 |
| KeyValue 数据超过轻量统计范围 | 改用 SQLite 或外部分析系统 |
| 涉及价格、支付、库存 | A/B 只控制展示，不控制最终交易规则 |
| 需要清理实验 | 提供 reset 或后台任务清理 KeyValue 与 cookie |

## 相关

- [AB 测试](/cms/operations/ab-testing)
- [页面交互埋点](./interaction-tracking.md)
- [k.cookie](/api/cookie/)
- [k.DB.keyValue](/api/key-value/)
- [k.api](/api/api/)
