# Phase 6 UAT · Playwright 自动化验收

> 对应 Phase 6 ghost_bound + 双账（人账/鬼账）。覆盖来文链、灵籍 overlay、冥籍委托面板、周末结算与 harness `ghost-bound-flow`。

| 字段 | 值 |
|------|-----|
| 开始 | 2026-06-20T04:28:13.797Z |
| 结束 | 2026-06-20T04:29:24.321Z |
| Harness | HARNESS_OK |
| 截图目录 | [`e2e/artifacts/phase6-uat/`](../e2e/artifacts/phase6-uat/) |

## 用例结果

| Test | 名称 | 结果 | 截图 |
|------|------|------|------|
| 1 | 阴司召令来文 inbox | PASS | `e2e/artifacts/phase6-uat/test-01-ghost-summon-inbox.png` |
| 2 | 来文链 → 灵籍更新 overlay | PASS | `e2e/artifacts/phase6-uat/test-02-before-ack-summons.png`<br>`e2e/artifacts/phase6-uat/test-02-bind-mandate.png`<br>`e2e/artifacts/phase6-uat/test-02-ghost-overlay.png`<br>`e2e/artifacts/phase6-uat/test-02-overlay-dismissed.png` |
| 3 | 冥籍绑定委托面板与双账标签 | PASS | `e2e/artifacts/phase6-uat/test-03-ghost-delegation-panel.png` |
| 4 | 开本周 → 双账周末结算 / 流水 | PASS | `e2e/artifacts/phase6-uat/test-04-week-plan-selected.png`<br>`e2e/artifacts/phase6-uat/test-04-week-settlement.png` |
| 5 | WeekPressureRail 阳债冥币 | PASS | `e2e/artifacts/phase6-uat/test-05-dual-ledger-rail.png` |
| 6 | Harness ghost-bound-flow | PASS | `e2e/artifacts/phase6-uat/test-06-harness-ok.png` |

## 步骤明细

### Test 1 · summon mandate inbox

- **操作**: 种子 phase6-ghost-summon-pending
- **视口**: 1440×900
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - primaryFate=head_jar
  - MandateInbox visible
  - 确认出席 CTA
- **截图**: [e2e/artifacts/phase6-uat/test-01-ghost-summon-inbox.png](../e2e/artifacts/phase6-uat/test-01-ghost-summon-inbox.png)

### Test 2 · summon before ack

- **操作**: 召令待回应
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase6-uat/test-02-before-ack-summons.png](../e2e/artifacts/phase6-uat/test-02-before-ack-summons.png)

### Test 2 · bind mandate queued

- **操作**: 确认出席 → 绑定来文
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase6-uat/test-02-bind-mandate.png](../e2e/artifacts/phase6-uat/test-02-bind-mandate.png)

### Test 2 · ghost_bound overlay

- **操作**: 接受绑定 → FateUpdateOverlay
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - primaryFate=ghost_bound
  - 双账正文
- **截图**: [e2e/artifacts/phase6-uat/test-02-ghost-overlay.png](../e2e/artifacts/phase6-uat/test-02-ghost-overlay.png)

### Test 2 · overlay dismissed

- **操作**: 跳过 overlay → DelegationPanel
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase6-uat/test-02-overlay-dismissed.png](../e2e/artifacts/phase6-uat/test-02-overlay-dismissed.png)

### Test 3 · delegation panel dual labels

- **操作**: 种子 phase6-ghost-bound-playable
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - PlayShell--fate-ghost-bound
  - 冥籍绑定 / 人账阳债 / 鬼账冥币
- **截图**: [e2e/artifacts/phase6-uat/test-03-ghost-delegation-panel.png](../e2e/artifacts/phase6-uat/test-03-ghost-delegation-panel.png)

### Test 4 · plan selected

- **操作**: 紧缩 + 阳巡值守
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase6-uat/test-04-week-plan-selected.png](../e2e/artifacts/phase6-uat/test-04-week-plan-selected.png)

### Test 4 · after week advance

- **操作**: 开本周 + drain mandates
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - weekIndex=15
  - WeekSettlementStrip 人账/鬼账
  - ledgerLog=true
- **截图**: [e2e/artifacts/phase6-uat/test-04-week-settlement.png](../e2e/artifacts/phase6-uat/test-04-week-settlement.png)

### Test 5 · dual ledger rail

- **操作**: 种子 phase6-ghost-bound-after-week
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - yangDebt=285945.8
  - mingCoin=40
- **截图**: [e2e/artifacts/phase6-uat/test-05-dual-ledger-rail.png](../e2e/artifacts/phase6-uat/test-05-dual-ledger-rail.png)

### Test 6 · harness:verify --quick

- **操作**: beforeAll yarn harness:verify --quick
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - HARNESS_OK
  - ghost-bound-flow contract
- **截图**: [e2e/artifacts/phase6-uat/test-06-harness-ok.png](../e2e/artifacts/phase6-uat/test-06-harness-ok.png)
