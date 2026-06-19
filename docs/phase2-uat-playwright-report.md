# Phase 2 UAT · Playwright 自动化验收

> 对应 `.planning/phases/02-milestoneweekflow/02-UAT.md`。存档由 `chapterTestHelpers` + `milestoneWeekFlow` 在 Node 侧推进至目标周，避免手工点击 40 周。

| 字段 | 值 |
|------|-----|
| 开始 | 2026-06-19T09:28:27.194Z |
| 结束 | 2026-06-19T09:29:01.644Z |
| Harness | HARNESS_OK |
| 截图目录 | [`e2e/artifacts/phase2-uat/`](../e2e/artifacts/phase2-uat/) |

## 用例结果

| Test | 名称 | 结果 | 截图 |
|------|------|------|------|
| 1 | 继续修行读档 coerce 为 fate_run | PASS | `e2e/artifacts/phase2-uat/test-01-chapter-load.png`<br>`e2e/artifacts/phase2-uat/test-01-fate-run-dashboard.png` |
| 2 | W40 确认计划后无 ContractFinale 全屏 | PASS | `e2e/artifacts/phase2-uat/test-02-week40-before.png`<br>`e2e/artifacts/phase2-uat/test-02-week41-no-finale.png` |
| 3 | fated 状态仍在 week-dashboard | PASS | `e2e/artifacts/phase2-uat/test-03-before-advance.png`<br>`e2e/artifacts/phase2-uat/test-03-fated-dashboard.png` |
| 4 | 第 41 周学籍段切换 M2 | PASS | `e2e/artifacts/phase2-uat/test-04-m2-dashboard.png` |
| 5 | Harness 契约门禁 | PASS | `e2e/artifacts/phase2-uat/test-05-harness-ok.png` |

## 步骤明细

### Test 1 · chapter 档载入 /play

- **操作**: 种子 chapter 第 12 周 → 打开 /play
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase2-uat/test-01-chapter-load.png](../e2e/artifacts/phase2-uat/test-01-chapter-load.png)

### Test 1 · coerce 后周仪表盘

- **操作**: 断言 runMode=fate_run + 主界面可操作
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - runMode=fate_run
  - runStatus=active
- **截图**: [e2e/artifacts/phase2-uat/test-01-fate-run-dashboard.png](../e2e/artifacts/phase2-uat/test-01-fate-run-dashboard.png)

### Test 2 · 第 40 周种子

- **操作**: logic 推进至 W40（fate_run）
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase2-uat/test-02-week40-before.png](../e2e/artifacts/phase2-uat/test-02-week40-before.png)

### Test 2 · W40 确认后进第 41 周

- **操作**: UI 确认本周计划（W40→W41）
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - ContractFinale 不可见
  - chapterWeekIndex=41
  - continuity log 已写入
- **截图**: [e2e/artifacts/phase2-uat/test-02-week41-no-finale.png](../e2e/artifacts/phase2-uat/test-02-week41-no-finale.png)

### Test 3 · 低 bodyIntegrity 种子

- **操作**: fate_run + bodyIntegrity 触线前
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase2-uat/test-03-before-advance.png](../e2e/artifacts/phase2-uat/test-03-before-advance.png)

### Test 3 · fated 后仍周仪表盘

- **操作**: 确认周计划触发 fateTransition
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - runStatus=fated
- **截图**: [e2e/artifacts/phase2-uat/test-03-fated-dashboard.png](../e2e/artifacts/phase2-uat/test-03-fated-dashboard.png)

### Test 4 · W41 + M2 种子 UI

- **操作**: logic 已 resolveWeekEnd 至 M2
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - stageId=stage-m2-hs
- **截图**: [e2e/artifacts/phase2-uat/test-04-m2-dashboard.png](../e2e/artifacts/phase2-uat/test-04-m2-dashboard.png)

### Test 5 · harness:verify --quick

- **操作**: beforeAll 已执行 yarn harness:verify --quick
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **断言**:
  - HARNESS_OK
- **截图**: [e2e/artifacts/phase2-uat/test-05-harness-ok.png](../e2e/artifacts/phase2-uat/test-05-harness-ok.png)
