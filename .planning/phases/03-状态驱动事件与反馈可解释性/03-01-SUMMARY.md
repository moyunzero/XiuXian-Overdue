---
phase: 03-状态驱动事件与反馈可解释性
plan: 01
subsystem: testing
tags: [vitest, gameEngine, EVT-01, cooldown, family, weekly]

requires:
  - phase: 02-债务与分班制度压力
    provides: 经济/分班状态供 event trigger 与 randomEventAfterAction 使用
provides:
  - EVT-01：id+family 双轨冷却、最短冷却下限、周结算游玩日非强制随机降权
  - gameEngine.events.spec.ts 回归套件
affects:
  - 03-02-PLAN（EVT-02 UI/日志）
  - 03-03-PLAN（events.json 家族字段内容）

tech-stack:
  added: []
  patterns:
    - "effectiveCooldownDays = max(raw, MIN_EVENT_COOLDOWN_DAYS)"
    - "周降权仅乘 baseP；主随机仍仅 afterAction（D-01）"

key-files:
  created:
    - app/logic/gameEngine.events.spec.ts
  modified:
    - app/logic/gameEngine.ts
    - app/types/game.ts
    - app/composables/useGameState.ts
    - app/composables/useGameStorage.ts
    - app/composables/useGame.ts

key-decisions:
  - "MIN_EVENT_COOLDOWN_DAYS=3；WEEKLY_RANDOM_DOWNWEIGHT_K=0.65（D-04 区间内化）"
  - "isWeeklySettlementDay：school.day>0 且 day%7===0，与 endDay 自增后周块一致"

patterns-established:
  - "选中事件统一经 recordEventTrigger 写 eventHistory 与 familyHistory"
  - "读档合并缺省 familyHistory={}，避免旧档崩溃"

requirements-completed: [EVT-01]

duration: 8min
completed: 2026-03-21
---

# Phase 03 Plan 01: EVT-01 事件去重与周降权 Summary

**行动后单一主随机链上实现 id/family 双轨冷却、最短 3 日下限，以及周结算日前段对非强制随机的 baseP 降权（×0.65），并以 gameEngine.events.spec 为回归权威。**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-21T09:42:00Z
- **Completed:** 2026-03-21T09:50:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- 导出 `effectiveEventCooldownDays`、`isFamilyOnCooldown`、`isWeeklySettlementDay`、`applyWeeklyRandomDownweightToProbability`、`recordEventTrigger`，并在 `randomEventAfterAction` 中串联过滤与历史写入。
- `GameState.familyHistory` 与读档/默认态合并，旧存档与 legacy 迁移安全。
- Vitest 覆盖 D-01～D-04 可测行为（含固定种子蒙特卡洛降权对比）。

## Task Commits

1. **Task 0: Wave 0 — gameEngine.events.spec.ts 测试骨架（EVT-01）** - `31dc544` (test)
2. **Task 1: gameEngine + GameState 落地 family 双轨与周降权纯函数** - `bb4a81e` (feat)
3. **Task 2: randomEventAfterAction 接入新过滤与历史写入** - `09f3d4a` (feat)

**Plan metadata（文档/STATE/ROADMAP）：** 见提交信息 `docs(03-01): complete EVT-01 plan summary and planning state`

## Files Created/Modified

- `app/logic/gameEngine.events.spec.ts` — EVT-01 纯函数与抽样回归
- `app/logic/gameEngine.ts` — 冷却/家族/周谓词/降权/recordEventTrigger
- `app/types/game.ts` — `EventDefinition.family`、`GameState.familyHistory`
- `app/composables/useGameState.ts` — `defaultState.familyHistory`
- `app/composables/useGameStorage.ts` — 读档合并 `familyHistory`
- `app/composables/useGame.ts` — `randomEventAfterAction` 接线；legacy 迁移 `familyHistory`

## Decisions Made

- 冷却下限与家族互斥窗口统一为 `MIN_EVENT_COOLDOWN_DAYS = 3`（D-03、D-02）。
- 周降权常数 `WEEKLY_RANDOM_DOWNWEIGHT_K = 0.65`（落在 0.5～0.75，D-04）。
- `isWeeklySettlementDay` 用「当前 `school.day % 7 === 0`」表示下一格 endDay 将触发周块，与 `endDay` 内 `(day-1)%7===0` 对齐。

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Task 0 执行说明

计划 Task 0 仅列出 `gameEngine.events.spec.ts`；为使 TypeScript 与 Vitest 可编译运行，同批提交了 `EventDefinition.family` / `GameState.familyHistory` 及 `gameEngine` 内 RED 桩函数（随后在 Task 1 替换为真实实现）。属执行上必要的范围衔接，非功能偏离。

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EVT-01 自动化已绿；可进入 03-02（tier/双反馈 UI）与 03-03（events 内容家族标注）。

## Self-Check: PASSED

- `[ -f app/logic/gameEngine.events.spec.ts ]` — FOUND
- Commits `31dc544`, `bb4a81e`, `09f3d4a` present on branch — FOUND（`git log --oneline`）

---
*Phase: 03-状态驱动事件与反馈可解释性*  
*Completed: 2026-03-21*
