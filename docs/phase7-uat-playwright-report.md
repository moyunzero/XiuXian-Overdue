# Phase 7 UAT · Stage Content Migration

> 对应 `.planning/phases/07-stage-content-migration/07-UAT.md`。Playwright 串行：上一用例 PASS 才跑下一用例；每环节截图。

| 字段 | 值 |
|------|-----|
| 开始 | 2026-06-20T05:58:07.506Z |
| 结束 | 2026-06-20T05:59:23.114Z |
| Harness | HARNESS_OK |
| 截图目录 | [`e2e/artifacts/phase7-uat/`](../e2e/artifacts/phase7-uat/) |

## 用例结果

| Test | 名称 | 结果 | 截图 |
|------|------|------|------|
| 1 | M1 第8周 · 四格排程 | PASS | `e2e/artifacts/phase7-uat/test-01-m1-week8-dashboard.png` |
| 2 | M1 来文 · stage manifest 池 | PASS | `e2e/artifacts/phase7-uat/test-02-mandate-inbox-visible.png` |
| 3 | 灵籍 overlay · catalog copy | PASS | `e2e/artifacts/phase7-uat/test-03-overlay-before-dismiss.png`<br>`e2e/artifacts/phase7-uat/test-03-overlay-dismissed.png` |
| 4 | W40 无契约终局闸门 | PASS | `e2e/artifacts/phase7-uat/test-04-w40-no-finale.png` |
| 5 | W41 → M2 学籍段 | PASS | `e2e/artifacts/phase7-uat/test-05-w41-m2-stage.png` |
| 6 | Harness validate:stages + stage-content-flow | PASS | `e2e/artifacts/phase7-uat/test-06-harness-ok.png` |

## 步骤明细

### Test 1 · debt + week plan

- **操作**: seed M1 W8 fate_run → DebtDashboard + WeekPlan
- **视口**: 1440×900
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - WeekPlan visible
  - DebtDashboard visible
  - stage-m1-contract seed
- **截图**: [e2e/artifacts/phase7-uat/test-01-m1-week8-dashboard.png](../e2e/artifacts/phase7-uat/test-01-m1-week8-dashboard.png)

### Test 2 · mandate inbox visible

- **操作**: pending mandate from stage-m1-contract pool
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - MandateInbox gate
  - 灵信 · 来文 tag
- **截图**: [e2e/artifacts/phase7-uat/test-02-mandate-inbox-visible.png](../e2e/artifacts/phase7-uat/test-02-mandate-inbox-visible.png)

### Test 3 · overlay before dismiss

- **操作**: fateUpdatePending human→mortgaged
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase7-uat/test-03-overlay-before-dismiss.png](../e2e/artifacts/phase7-uat/test-03-overlay-before-dismiss.png)

### Test 3 · overlay dismissed

- **操作**: 跳过 overlay → week-dashboard
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - overlay gone
  - WeekPlan visible
- **截图**: [e2e/artifacts/phase7-uat/test-03-overlay-dismissed.png](../e2e/artifacts/phase7-uat/test-03-overlay-dismissed.png)

### Test 4 · w40 playable no finale

- **操作**: W40 fate_run → WeekPlan, no 契约终局 screen
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - WeekPlan visible
  - 契约终局 absent
- **截图**: [e2e/artifacts/phase7-uat/test-04-w40-no-finale.png](../e2e/artifacts/phase7-uat/test-04-w40-no-finale.png)

### Test 5 · w41 m2 stage

- **操作**: advance to W41 → stage-m2-hs seed playable
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - WeekPlan visible
  - expectStageId stage-m2-hs
- **截图**: [e2e/artifacts/phase7-uat/test-05-w41-m2-stage.png](../e2e/artifacts/phase7-uat/test-05-w41-m2-stage.png)

### Test 6 · harness ok baseline

- **操作**: beforeAll yarn harness:verify --quick → HARNESS_OK
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - HARNESS_OK
  - validate:stages
  - stage-content-flow
- **截图**: [e2e/artifacts/phase7-uat/test-06-harness-ok.png](../e2e/artifacts/phase7-uat/test-06-harness-ok.png)
