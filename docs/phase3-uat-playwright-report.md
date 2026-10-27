# Phase 3 UAT · Playwright 自动化验收

> 对应 `.planning/phases/03-schedule-mandate-ux/03-UAT.md`。覆盖四格周排程、Reigns 来文卡、周末结算条与宽/窄视口布局。

| 字段 | 值 |
|------|-----|
| 开始 | 2026-06-19T11:29:20.234Z |
| 结束 | 2026-06-19T11:30:07.448Z |
| Harness | HARNESS_OK |
| 截图目录 | [`e2e/artifacts/phase3-uat/`](../e2e/artifacts/phase3-uat/) |

## 用例结果

| Test | 名称 | 结果 | 截图 |
|------|------|------|------|
| 1 | 四格周排程与开本周 CTA | PASS | `e2e/artifacts/phase3-uat/test-01-schedule-desktop.png`<br>`e2e/artifacts/phase3-uat/test-01-schedule-mobile.png` |
| 2 | 瓷片强度循环与负荷条 | PASS | `e2e/artifacts/phase3-uat/test-02-tile-before.png`<br>`e2e/artifacts/phase3-uat/test-02-tile-after.png` |
| 3 | 来文叠层与主区 dim | PASS | `e2e/artifacts/phase3-uat/test-03-mandate-overlay.png` |
| 4 | 开本周 → 来文链 → 周末结算条 | PASS | `e2e/artifacts/phase3-uat/test-04-before-advance.png`<br>`e2e/artifacts/phase3-uat/test-04-mandate-queue.png`<br>`e2e/artifacts/phase3-uat/test-04-settlement.png` |
| 5 | 来文队列满时开本周禁用 | PASS | `e2e/artifacts/phase3-uat/test-05-queue-blocked.png` |
| 6 | chapter 读档 coerce | PASS | `e2e/artifacts/phase3-uat/test-06-chapter-coerce.png` |
| 7 | Harness 契约门禁 | PASS | `e2e/artifacts/phase3-uat/test-07-harness-ok.png` |

## UI 布局分析

基于各环节全页截图的静态审阅（1440×900 桌面 + 390×844 窄屏）。非像素级回归，供 Phase 3 抛光参考。

| 区域 | 视口 | 严重度 | 观察 | 建议 | 截图 |
|------|------|--------|------|------|------|
| 周排程面板 | 1440×900 | suggestion | 周排程初始：周排程宽约 818px，占视口 57%，宽屏下中间列可能偏窄。 | 检查 PlayChapterScreenHost 中间列 `minmax(0,1fr)` 与 WeekPlan `width:100%` 拉伸链；hero 格可略增纵向占比。 | `/Users/moyun/code/xiuxian/xiuxian-sim/e2e/artifacts/phase3-uat/test-01-schedule-desktop.png` |
| 周排程面板 | 1440×900 | suggestion | 来文叠层：周排程宽约 818px，占视口 57%，宽屏下中间列可能偏窄。 | 检查 PlayChapterScreenHost 中间列 `minmax(0,1fr)` 与 WeekPlan `width:100%` 拉伸链；hero 格可略增纵向占比。 | `/Users/moyun/code/xiuxian/xiuxian-sim/e2e/artifacts/phase3-uat/test-03-mandate-overlay.png` |
| 来文卡 | 1440×900 | suggestion | 来文卡宽约 478px（max 520px），1440 视口下居中偏窄。 | 若产品希望 Reigns 卡更「铺满阅读区」，可将 MandateCardStack `min(520px)` 提至 `min(640px, calc(100% - 32px))` 并测窄屏断点。 | `/Users/moyun/code/xiuxian/xiuxian-sim/e2e/artifacts/phase3-uat/test-03-mandate-overlay.png` |
| dim 主区 | 1440×900 | suggestion | 来文时主区 dim 保留周排程轮廓，需确认对比度是否足够区分「不可操作」状态。 | 对照 UI-SPEC：dim 层 opacity/filter 与 disabled 瓷片文案「须先回应来文」双信号；可 A/B 略加深 dim。 | `/Users/moyun/code/xiuxian/xiuxian-sim/e2e/artifacts/phase3-uat/test-03-mandate-overlay.png` |
| 周排程面板 | 1440×900 | suggestion | 结算后：周排程宽约 818px，占视口 57%，宽屏下中间列可能偏窄。 | 检查 PlayChapterScreenHost 中间列 `minmax(0,1fr)` 与 WeekPlan `width:100%` 拉伸链；hero 格可略增纵向占比。 | `e2e/artifacts/phase3-uat/test-04-settlement.png` |

## 步骤明细

### Test 1 · W8 周排程桌面

- **操作**: 种子 fate_run 第8周 → 断言四格 + CTA
- **视口**: 1440×900
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - ScheduleTile count=3
  - 开本周可见
- **截图**: [e2e/artifacts/phase3-uat/test-01-schedule-desktop.png](../e2e/artifacts/phase3-uat/test-01-schedule-desktop.png)

### Test 1 · W8 周排程窄屏

- **操作**: 390px 视口截图
- **视口**: 390×844
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase3-uat/test-01-schedule-mobile.png](../e2e/artifacts/phase3-uat/test-01-schedule-mobile.png)

### Test 2 · 点击前刷题强度

- **操作**: 读取刷题瓷片 badge
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - badge~刷题卷低
- **截图**: [e2e/artifacts/phase3-uat/test-02-tile-before.png](../e2e/artifacts/phase3-uat/test-02-tile-before.png)

### Test 2 · 点击后负荷条更新

- **操作**: 点击刷题瓷片循环强度
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - badge 刷题卷低 → 刷题卷中
- **截图**: [e2e/artifacts/phase3-uat/test-02-tile-after.png](../e2e/artifacts/phase3-uat/test-02-tile-after.png)

### Test 3 · 来文卡叠层

- **操作**: 种子 pending ch0-debt-reminder
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - MandateInbox 可见
  - main--dimmed
- **截图**: [e2e/artifacts/phase3-uat/test-03-mandate-overlay.png](../e2e/artifacts/phase3-uat/test-03-mandate-overlay.png)

### Test 4 · 开本周前 W6

- **操作**: seed 17 第6周
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase3-uat/test-04-before-advance.png](../e2e/artifacts/phase3-uat/test-04-before-advance.png)

### Test 4 · 开本周后来文

- **操作**: advanceScheduleWeek 触发来文队列
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase3-uat/test-04-mandate-queue.png](../e2e/artifacts/phase3-uat/test-04-mandate-queue.png)

### Test 4 · 来文清空后结算

- **操作**: drain mandates + finalizeWeek
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - weekIndex=7
  - 结算写入 log（条或未闪）
- **截图**: [e2e/artifacts/phase3-uat/test-04-settlement.png](../e2e/artifacts/phase3-uat/test-04-settlement.png)

### Test 5 · 队列满禁用

- **操作**: 3 封 pending → 开本周 disabled
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - 开本周 disabled
  - 瓷片 disabled
- **截图**: [e2e/artifacts/phase3-uat/test-05-queue-blocked.png](../e2e/artifacts/phase3-uat/test-05-queue-blocked.png)

### Test 6 · coerce 后周排程

- **操作**: chapter 第8周种子
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - runMode=fate_run
- **截图**: [e2e/artifacts/phase3-uat/test-06-chapter-coerce.png](../e2e/artifacts/phase3-uat/test-06-chapter-coerce.png)

### Test 7 · harness:verify --quick

- **操作**: beforeAll 已执行 yarn harness:verify --quick
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - HARNESS_OK
  - schedule-mandate-flow contract
- **截图**: [e2e/artifacts/phase3-uat/test-07-harness-ok.png](../e2e/artifacts/phase3-uat/test-07-harness-ok.png)
