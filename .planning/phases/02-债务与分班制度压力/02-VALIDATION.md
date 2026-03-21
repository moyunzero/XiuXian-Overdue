---
phase: 02
slug: 债务与分班制度压力
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 02 — Validation Strategy

> 验证债务与分班制度压力是否形成“持续高压但不硬失败”的可解释闭环。

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run app/composables/useGame.debt.spec.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~20-60 seconds |

---

## Sampling Rate

- **After every task commit:** Run related spec file (`debt/class/conflict`) once
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-00 | 01 | 1 | DEBT-01, DEBT-02, DEBT-03 | integration | `npx vitest run app/composables/useGame.debt.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 02-01-01 | 01 | 1 | DEBT-01, DEBT-02, DEBT-03 | integration | `npx vitest run app/composables/useGame.debt.spec.ts app/composables/useGame.spec.ts` | ✅ | ⬜ pending |
| 02-02-00 | 02 | 2 | CLASS-01, CLASS-02 | integration | `npx vitest run app/composables/useGame.class.spec.ts` | ❌ Wave 0 | ⬜ pending |
| 02-02-01 | 02 | 2 | CLASS-01, CLASS-02 | integration | `npx vitest run app/composables/useGame.class.spec.ts app/composables/useGame.debt.spec.ts` | ✅ | ⬜ pending |
| 02-03-00 | 03 | 3 | CLASS-03 | integration | `npx vitest run app/composables/useGame.conflict.spec.ts` | ✅ Wave 0 | ✅ green |
| 02-03-01 | 03 | 3 | CLASS-03 | integration | `npx vitest run app/composables/useGame.conflict.spec.ts app/composables/useGame.class.spec.ts app/composables/useGame.debt.spec.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/composables/useGame.debt.spec.ts` — 覆盖 DEBT-01~03，锁定 D-01~D-08
- [ ] `app/composables/useGame.class.spec.ts` — 覆盖 CLASS-01~02，锁定 D-09~D-12, D-17~D-19
- [x] `app/composables/useGame.conflict.spec.ts` — 覆盖 CLASS-03，锁定 D-13~D-16

---

## UAT Checklist (Phase 02)

### UAT-01 债务透明与还款可解释性（DEBT-01）
1. 启动 `npm run dev`，进入 `/game`。
2. 展开债务详情，记录本金/利息/罚金/逾期等级/最低周还款。
3. 执行一次还款并观察日志。
4. **期望：** 日志明确显示“减少了哪一项”，且能解释为什么仍有压力。

### UAT-02 周节律逾期升级与高压不硬失败（DEBT-02, DEBT-03）
1. 连续一周不还款推进到周结算日。
2. 观察是否只在周结算日升级逾期，首次仅警告。
3. 继续推进到高逾期后执行任意行动。
4. **期望：** 压力显著上升但仍可继续行动与推进天数。

### UAT-03 分班后果追踪（CLASS-01, CLASS-02）
1. 分别打出高分/低分两周，观察分班变化。
2. 对比分班前后学习收益、补贴与债务相关压力变化。
3. **期望：** 每 7 天自动分班，分班变化可追踪，且非单周崩盘。

### UAT-04 刷分 vs 打工冲突持续性（CLASS-03）
1. `npm run dev` 开局进入 `/game`。
2. **路径 A — 连续刷分：** 连续 3 个游戏日，每日三时段均选择「上课/刷题」或「吐纳」（不出现打工）。观察顶栏是否出现「系统记录：刷分路线偏科趋势」；日志是否出现「制度记录：路线失衡」或「制度抽检（费用）」；现金/费用池是否相对开局有制度性压力。
3. **路径 B — 连续打工：** 连续 3 个游戏日，每日三时段均选择「打工」。观察顶栏是否出现「打工路线偏科趋势」；周结算分数/分班与补贴是否相对路径 A 明显不同。
4. **路径 C — 交替：** 按「刷分日 → 打工日 → 刷分日」或「每段行动混合刷分与打工」推进至少 3 天，确认偏科提示减弱或消失，压力曲线与路径 A/B 不同。
5. **期望：** 能感知约每 2~3 日一次的制度反馈；提示仅描述失衡与参数调整，**不出现**「最优解」「你应该如何选」类指引；任意时刻仍可继续推进下一天（无硬 Game Over）。

---

## Validation Sign-Off

- [ ] All tasks include `<automated>` verify commands
- [ ] Wave 0 test files created and passing
- [ ] No hard game over path introduced in Phase 2
- [ ] Weekly cadence preserved for exam + delinquency
- [ ] `nyquist_compliant: true` set after all checks pass

**Approval:** pending
