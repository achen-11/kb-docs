# 页面交互埋点

> 在前台页面为 CTA、价格卡片、文档入口等关键锚点上报事件，由 Kooboo API 统一接收、校验、聚合并记录日志。

## 适用场景

这套做法适合运营和产品需要观察页面行为的场景：

- 首页主 CTA、活动 Banner、价格卡片点击；
- 注册、试用、咨询、下载等转化入口；
- 文档站目录、搜索、复制代码等操作；
- 活动页不同版本或渠道来源对比；
- 与 [页面交互](/cms/operations/page-interaction) 或访问统计配合分析。

不适合把埋点 API 当成业务写入接口。埋点数据可以丢失少量请求，但不能阻塞核心业务；下单、支付、注册等动作仍要有自己的业务 API 和日志。

## 能力拆解

| 层级 | 职责 | 相关文档 |
|------|------|----------|
| Page | 在按钮、链接、卡片上绑定锚点和事件名 | [Page](/templateEngine/page/) |
| API | 接收事件、校验字段、写入聚合数据 | [k.api](/api/api/) |
| Request | 读取 body、User-Agent、Referer、clientIp | [k.request](/api/request/) |
| KeyValue | 保存轻量聚合统计和最近事件 | [k.DB.keyValue](/api/key-value/) |
| Logger | 记录可检索的事件审计 | [k.logger](/api/logger/) |
| CMS | 查看系统页面交互能力 | [页面交互](/cms/operations/page-interaction) |

## 推荐架构

埋点事件应先定义清楚事件名和锚点 ID：

```text
Page 元素
   ↓ data-track-anchor / data-track-event
前端 track()
   ↓
/api/interaction-tracking/track
   ↓
校验 eventName、anchorId
   ↓
KeyValue 聚合 + logger 审计
```

事件命名要稳定，不要直接使用按钮文案。按钮文案会被运营修改，`anchorId` 和 `eventName` 应像业务字段一样可长期对比。

## API：接收事件并聚合

下面示例用 KeyValue 保存总数、按锚点计数、按事件类型计数和最近事件。真实项目可以换成 SQLite 或外部分析系统。

```ts
// @k-url /api/interaction-tracking/{action}

type TrackBody = {
  eventName?: string;
  anchorId?: string;
  path?: string;
  variant?: string;
  metadata?: Record<string, unknown>;
};

const summaryKey = "interaction-tracking:summary";
const logCategory = "Guide.InteractionTracking";

function readSummary() {
  const raw = k.DB.keyValue.get(summaryKey);
  return raw ? JSON.parse(raw.toString()) : {
    total: 0,
    byAnchor: {},
    byEvent: {},
    latest: [],
    updatedAt: "",
  };
}
```

记录事件时，服务端要校验必要字段，并限制可写入的上下文字段：

```ts
k.api.post("track", () => {
  const body = JSON.parse(k.request.body || "{}") as TrackBody;
  const eventName = String(body.eventName || "").trim();
  const anchorId = String(body.anchorId || "").trim();

  if (!eventName) {
    return { success: false, code: "MISSING_EVENT_NAME", message: "缺少事件名称。" };
  }

  if (!anchorId) {
    return { success: false, code: "MISSING_ANCHOR_ID", message: "缺少锚点 ID。" };
  }

  const event = {
    eventName,
    anchorId,
    path: String(body.path || k.request.url),
    variant: String(body.variant || "default"),
    userAgent: String(k.request.headers.get("User-Agent") || "").slice(0, 120),
    referer: String(k.request.headers.get("Referer") || "").slice(0, 160),
    clientIp: String(k.request.clientIp || ""),
    metadata: body.metadata || {},
    trackedAt: new Date().toISOString(),
  };

  const summary = readSummary();
  summary.total += 1;
  summary.byAnchor[anchorId] = (summary.byAnchor[anchorId] || 0) + 1;
  summary.byEvent[eventName] = (summary.byEvent[eventName] || 0) + 1;
  summary.latest = [event, ...summary.latest].slice(0, 10);
  summary.updatedAt = event.trackedAt;

  k.DB.keyValue.set(summaryKey, JSON.stringify(summary));
  k.logger.information(logCategory, JSON.stringify({
    event: "interaction.tracked",
    eventName,
    anchorId,
    path: event.path,
    variant: event.variant,
    trackedAt: event.trackedAt,
  }));

  return {
    success: true,
    message: "事件已记录。",
    summary: {
      total: summary.total,
      anchorCount: summary.byAnchor[anchorId],
      eventCount: summary.byEvent[eventName],
    },
  };
});
```

KeyValue 适合少量聚合。高流量页面应把明细写入更适合追加和查询的存储，或转发到专门的分析系统。

## Page：绑定锚点和事件名

页面上用 `data-track-anchor` 和 `data-track-event` 标记元素：

```html
<!-- @k-url /interaction-tracking -->
<button data-track-anchor="hero-cta" data-track-event="cta_click" type="button">点击主 CTA</button>
<button data-track-anchor="pricing-card" data-track-event="pricing_click" type="button">点击价格卡片</button>
<button data-track-anchor="docs-link" data-track-event="docs_click" type="button">点击文档链接</button>

<script>
  async function track(anchorId, eventName) {
    return fetch("/api/interaction-tracking/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anchorId,
        eventName,
        path: location.pathname,
        variant: "guide-demo",
        metadata: { title: document.title },
      }),
    });
  }

  document.querySelectorAll("[data-track-anchor]").forEach((button) => {
    button.addEventListener("click", () => {
      track(button.dataset.trackAnchor, button.dataset.trackEvent);
    });
  });
</script>
```

埋点失败不应阻塞按钮原本的业务动作。真实页面可以用 `navigator.sendBeacon` 或异步 `fetch`，但关键业务提交仍要走业务 API。

## 失败处理

| 情况 | 推荐处理 |
|------|----------|
| 缺少事件名 | 返回 `MISSING_EVENT_NAME`，不写入统计 |
| 缺少锚点 ID | 返回 `MISSING_ANCHOR_ID`，不写入统计 |
| User-Agent / Referer 过长 | 截断后保存 |
| metadata 太大 | 只保存白名单字段 |
| 高频页面 | 不用单个 KeyValue 保存全部明细，改用批量或专门存储 |
| 隐私字段 | 不记录邮箱、手机号、姓名、token、订单敏感信息 |

埋点要尽量少采集个人信息。需要按会员、订单或组织分析时，优先保存内部不可逆 ID 或分组字段，并遵守站点的隐私策略。

## 相关

- [页面交互](/cms/operations/page-interaction)
- [访问统计](/cms/operations/visitor-logs)
- [k.request](/api/request/)
- [k.DB.keyValue](/api/key-value/)
- [k.logger](/api/logger/)
- [k.api](/api/api/)
