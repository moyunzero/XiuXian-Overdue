# Phase 4 UAT · Playwright 自动化验收

> 对应 `.planning/phases/04-fate-slice-shells/04-UAT.md`。覆盖 head_jar 委托面板、mortgaged 四格+抽血、human 基线、灵籍更新 overlay 与 FateShell 主题。

| 字段 | 值 |
|------|-----|
| 开始 | 2026-06-19T13:32:55.819Z |
| 结束 | 2026-06-19T13:33:55.224Z |
| Harness | HARNESS_OK |
| 截图目录 | [`e2e/artifacts/phase4-uat/`](../e2e/artifacts/phase4-uat/) |

## 用例结果

| Test | 名称 | 结果 | 截图 |
|------|------|------|------|
| 1 | head_jar 委托面板与维生账单 | PASS | `e2e/artifacts/phase4-uat/test-01-head-jar-desktop.png`<br>`e2e/artifacts/phase4-uat/test-01-head-jar-mobile.png` |
| 2 | head_jar 维生档与委托工单选择 | PASS | `e2e/artifacts/phase4-uat/test-02-delegation-before.png`<br>`e2e/artifacts/phase4-uat/test-02-delegation-selected.png` |
| 3 | mortgaged 四格排程与抽血换现 | PASS | `e2e/artifacts/phase4-uat/test-03-mortgaged-four-tile.png` |
| 4 | human 四格基线与 FateShell | PASS | `e2e/artifacts/phase4-uat/test-04-human-baseline.png` |
| 5 | 灵籍更新 overlay 与跳过 | PASS | `e2e/artifacts/phase4-uat/test-05-fate-overlay.png`<br>`e2e/artifacts/phase4-uat/test-05-fate-overlay-dismissed.png` |
| 6 | head_jar WeekPressureRail 维生侧重 | PASS | `e2e/artifacts/phase4-uat/test-06-vitality-rail.png` |
| 7 | Harness 契约门禁 | PASS | `e2e/artifacts/phase4-uat/test-07-harness-ok.png` |

## UI 布局分析

基于各环节全页截图的静态审阅（1440×900 桌面 + 390×844 窄屏）。

| 区域 | 视口 | 严重度 | 观察 | 建议 | 截图 |
|------|------|--------|------|------|------|
| 委托双槽 | 1440×900 | suggestion | head_jar 仅两槽无四格 ghost，需确认宽屏下 bill + 双槽纵向节奏与 Phase 3 四格密度对比是否压迫感足够。 | 对照 04-UI-SPEC：维生账单预览应在开本周前占首屏注意力；窄屏断点检查双槽 min-height。 | `e2e/artifacts/phase4-uat/test-01-head-jar-desktop.png` |

## 步骤明细

### Test 1 · head_jar 桌面委托面板

- **操作**: 种子 phase4-head-jar-week8 → DelegationPanel + bill
- **视口**: 1440×900
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - primaryFate=head_jar
  - PlayShell--fate-head-jar
  - 无四格 WeekPlan
- **截图**: [e2e/artifacts/phase4-uat/test-01-head-jar-desktop.png](../e2e/artifacts/phase4-uat/test-01-head-jar-desktop.png)

### Test 1 · head_jar 窄屏委托面板

- **操作**: 390px 视口截图
- **视口**: 390×844
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase4-uat/test-01-head-jar-mobile.png](../e2e/artifacts/phase4-uat/test-01-head-jar-mobile.png)

### Test 2 · 选择前

- **操作**: 未选维生档/工单
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase4-uat/test-02-delegation-before.png](../e2e/artifacts/phase4-uat/test-02-delegation-before.png)

### Test 2 · 维持 + 阳巡值守

- **操作**: 点击维生维持档与阳巡值守工单
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - MaintenanceTierTile--on
  - DelegationJobTile--on
- **截图**: [e2e/artifacts/phase4-uat/test-02-delegation-selected.png](../e2e/artifacts/phase4-uat/test-02-delegation-selected.png)

### Test 3 · mortgaged 四格 + 抽血

- **操作**: 种子 mortgaged mid → WeekPlan + blood draw
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - ScheduleTile count=3
  - PlayShell--fate-mortgaged
  - WeekPressureRail debt emphasis
- **截图**: [e2e/artifacts/phase4-uat/test-03-mortgaged-four-tile.png](../e2e/artifacts/phase4-uat/test-03-mortgaged-four-tile.png)

### Test 4 · human 四格基线

- **操作**: chapter coerce 第8周
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - primaryFate=human
  - PlayShell--fate-human
- **截图**: [e2e/artifacts/phase4-uat/test-04-human-baseline.png](../e2e/artifacts/phase4-uat/test-04-human-baseline.png)

### Test 5 · overlay 初始

- **操作**: fateUpdatePending human→mortgaged
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase4-uat/test-05-fate-overlay.png](../e2e/artifacts/phase4-uat/test-05-fate-overlay.png)

### Test 5 · 跳过后周排程

- **操作**: 点击跳过 → week-dashboard
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - fateUpdatePending cleared
  - WeekPlan visible
- **截图**: [e2e/artifacts/phase4-uat/test-05-fate-overlay-dismissed.png](../e2e/artifacts/phase4-uat/test-05-fate-overlay-dismissed.png)

### Test 6 · 维生侧栏 emphasis

- **操作**: head_jar → WeekPressureRail--emphasis-vitality
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - 完整度 meter
  - 维生账单 meter
- **截图**: [e2e/artifacts/phase4-uat/test-06-vitality-rail.png](../e2e/artifacts/phase4-uat/test-06-vitality-rail.png)

### Test 7 · harness:verify --quick

- **操作**: beforeAll 已执行 yarn harness:verify --quick
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - HARNESS_OK
  - fate-continuity-flow contract
- **截图**: [e2e/artifacts/phase4-uat/test-07-harness-ok.png](../e2e/artifacts/phase4-uat/test-07-harness-ok.png)
