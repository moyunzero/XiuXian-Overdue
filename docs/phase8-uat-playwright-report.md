# Phase 8 UAT · v5 Handoff Preflight

> 对应 `.planning/phases/08-playtest-harness-gate/08-UAT.md` 与 [playtest-checklist-v5.md](./playtest-checklist-v5.md) §0。串行：上一用例 PASS 才跑下一用例。

| 字段 | 值 |
|------|-----|
| 开始 | 2026-06-20T06:25:38.810Z |
| 结束 | 2026-06-20T06:27:11.991Z |
| Harness | HARNESS_OK (full) |
| 截图目录 | [`e2e/artifacts/phase8-uat/`](../e2e/artifacts/phase8-uat/) |

## 用例结果

| Test | 名称 | 结果 | 截图 |
|------|------|------|------|
| 1 | UAT-1 · 账号档案 FateCodexStrip | PASS | `e2e/artifacts/phase8-uat/test-01-meta-codex.png` |
| 2 | UAT-2 · M1 第8周四格排程 | PASS | `e2e/artifacts/phase8-uat/test-02-m1-dashboard.png` |
| 3 | UAT-3 · M1 来文池 | PASS | `e2e/artifacts/phase8-uat/test-03-mandate-inbox.png` |
| 4 | UAT-4 · 灵籍 overlay catalog | PASS | `e2e/artifacts/phase8-uat/test-04-overlay-before.png`<br>`e2e/artifacts/phase8-uat/test-04-overlay-dismissed.png` |
| 5 | UAT-5 · W40 无终局 | PASS | `e2e/artifacts/phase8-uat/test-05-w40-continuity.png` |
| 6 | UAT-6 · W41 → M2 | PASS | `e2e/artifacts/phase8-uat/test-06-w41-m2.png` |
| 7 | UAT-7 · ghost_bound 双账 | PASS | `e2e/artifacts/phase8-uat/test-07-ghost-bound.png` |

## 步骤明细

### Test 1 · meta-codex

- **操作**: §0 preflight · meta
- **视口**: 1440×900
- **URL**: http://localhost:3000/
- **结果**: PASS
- **截图**: [e2e/artifacts/phase8-uat/test-01-meta-codex.png](../e2e/artifacts/phase8-uat/test-01-meta-codex.png)

### Test 2 · m1-dashboard

- **操作**: §1 短局 · 周循环
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase8-uat/test-02-m1-dashboard.png](../e2e/artifacts/phase8-uat/test-02-m1-dashboard.png)

### Test 3 · mandate-inbox

- **操作**: §1 短局 · 来文
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase8-uat/test-03-mandate-inbox.png](../e2e/artifacts/phase8-uat/test-03-mandate-inbox.png)

### Test 4 · overlay-before

- **操作**: §3 命运链
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase8-uat/test-04-overlay-before.png](../e2e/artifacts/phase8-uat/test-04-overlay-before.png)

### Test 4 · overlay-dismissed

- **操作**: 跳过 → WeekPlan
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase8-uat/test-04-overlay-dismissed.png](../e2e/artifacts/phase8-uat/test-04-overlay-dismissed.png)

### Test 5 · w40-no-finale

- **操作**: §2 中局 · W40 续玩
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase8-uat/test-05-w40-continuity.png](../e2e/artifacts/phase8-uat/test-05-w40-continuity.png)

### Test 6 · w41-m2

- **操作**: §2 中局 · stage ladder
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase8-uat/test-06-w41-m2.png](../e2e/artifacts/phase8-uat/test-06-w41-m2.png)

### Test 7 · ghost-bound-panel

- **操作**: §3 幽影旁支
- **URL**: http://localhost:3000/play
- **结果**: PASS
- **截图**: [e2e/artifacts/phase8-uat/test-07-ghost-bound.png](../e2e/artifacts/phase8-uat/test-07-ghost-bound.png)
