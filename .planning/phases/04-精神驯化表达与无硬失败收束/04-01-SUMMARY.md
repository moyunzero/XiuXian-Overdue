---
phase: 04-精神驯化表达与无硬失败收束
plan: 01
subsystem: game-logic
tags: [vitest, gameEngine, PSY-01, contract, rest]

requires:
  - phase: 03-状态驱动事件与反馈可解释性
    provides: 事件管线、周结算日、契约反噬事件
provides:
  - isMidLatePhase / getConflictPressureTier / 复合压力分数
  - restRecoveryMultiplier、麻木休息与休息恢复管线
  - domestication/numbness 存档字段与契约联动同步
  - game.vue 契约旁单行副指标 Pill
affects: [04-02-PLAN, 04-03-PLAN]

tech-stack:
  added: []
  patterns:
    - "rest 行动：先麻木随机、再 contractWouldTrigger；麻木成功不弹反噬"
    - "computeRestRecovery 支持 skipNumbCheck 避免二次麻木随机"

key-files:
  created:
    - app/logic/gameEngine.psy.spec.ts
  modified:
    - app/logic/gameEngine.ts
    - app/types/game.ts
    - app/composables/useGame.ts
    - app/composables/useGameState.ts
    - app/composables/useGameStorage.ts
    - app/composables/useGame.actions.spec.ts
    - app/pages/game.vue

key-decisions:
  - "休息反噬由「必触发」改为与其它行动一致的 strict 概率；麻木在 act 内优先判定，避免弹窗打断麻木体感"
  - "驯化同步在 progress/vigilance 上升时按增量累加（含事件与反噬选项）"

patterns-established:
  - "PSY 纯函数集中在 gameEngine，UI 仅消费 formatPsySubsidiaryLine"

requirements-completed: [PSY-01]

duration: 12min
completed: 2026-03-21
---

# Phase 4 Plan 01: PSY-01 精神驯化与休息压迫 Summary

**中后期门闩与周阶梯可测；契约缠绕降低休息恢复倍率；麻木休息路径与反噬分流；驯化/麻木副指标存档并在契约变动时同步；契约 Pill 旁单行副指标。**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-21T10:10:00Z
- **Completed:** 2026-03-21T10:22:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- 新增 `gameEngine.psy.spec.ts` 覆盖 D-01～D-08，与 `gameEngine` 导出 API 对齐。
- `GameState` 增加 `domestication`/`numbness`，默认与读档迁移补 0。
- `act`：签约休息先 `shouldTakeNumbRest`，再 `contractWouldTrigger`；`rest` 不再在引擎层 100% 反噬。
- `applyRestAction` 经 `computeRestRecovery`（含 `skipNumbCheck`）写回专注；麻木记制度日志并累加麻木。
- `game.vue` 契约 Pill 旁展示 `formatPsySubsidiaryLine` 单行。

## Task Commits

1. **Task 0: Wave 0 — gameEngine.psy.spec.ts** — `e314309` (test)
2. **Task 1: 类型与 gameEngine 纯函数** — `36b5fd8` (feat)
3. **Task 2: useGame 管线 + game.vue** — `8470db8` (feat)

**Docs:** `docs(04-01)` 批次含 SUMMARY、STATE、ROADMAP、REQUIREMENTS（与任务提交分列）。

## Files Created/Modified

- `app/logic/gameEngine.psy.spec.ts` — PSY-01 回归（D-01～D-08）
- `app/logic/gameEngine.ts` — 中后期、阶梯、压力、休息倍率、麻木概率、驯化同步、单行文案；`contractWouldTrigger` 对 `rest` 改为概率带
- `app/types/game.ts` — `domestication`/`numbness`
- `app/composables/useGame.ts` — 休息状态机、事件/反噬契约同步、`migrateLegacy`
- `app/composables/useGameState.ts` — 默认副指标 0
- `app/composables/useGameStorage.ts` — 读档补字段
- `app/composables/useGame.actions.spec.ts` — ACT-04 固定 `seed=0` 保证反噬可复现
- `app/pages/game.vue` — 副指标 Pill

## Decisions Made

- 麻木与反噬顺序：先抽麻木，成功则跳过反噬弹窗；否则与其它行动共用 `strict` 反噬概率。
- `computeRestRecovery` 增加 `skipNumbCheck`，避免「act 已判非麻木」后再次随机到麻木。

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- ACT-04 依赖随机流：`contractWouldTrigger` 行为变化后，用 `seed=0` 固定反噬可复现性。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PSY-01 状态基础已就绪，可接 04-02 collapse 卡组与 04-03 总结解锁。

## Self-Check: PASSED

- `app/logic/gameEngine.psy.spec.ts` 存在。
- 任务提交 `e314309`、`36b5fd8`、`8470db8` 已在 `git log` 中可见；文档批次与 `docs(04-01)` 提交同历史。

---
*Phase: 04-精神驯化表达与无硬失败收束*  
*Completed: 2026-03-21*
