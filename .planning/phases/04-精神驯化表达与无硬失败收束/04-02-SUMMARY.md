---
phase: 04-精神驯化表达与无硬失败收束
plan: 02
subsystem: game-logic
tags: [vitest, gameEngine, PSY-02, collapse, events]

requires:
  - phase: 04-01
    provides: PSY-01 中后期门闩、周结算谓词、副指标字段
provides:
  - collapse deck（type=collapse + events.json）、强冲击间隔抖动
  - 每类首次 full / 后续 echo、周界清除 collapseModifier
  - act 管线优先级：还款 > 叙事结局 > collapse > 随机池（排除 collapse）
affects: [04-03-PLAN]

tech-stack:
  added: []
  patterns:
    - "tryEmitStrongCollapse + ALL_EVENTS.filter(type==='collapse')，避免测试 mock 缺省导出"
    - "randomPoolAfterAction 与还款拆分；collapse 不进通用 afterAction 加权池"

key-files:
  created:
    - app/composables/useGame.psy.spec.ts
  modified:
    - app/logic/gameEngine.ts
    - app/types/game.ts
    - app/logic/gameEngine.psy.spec.ts
    - app/composables/useGame.ts
    - app/utils/events.ts
    - data/events.json

key-decisions:
  - "强冲击调度独立于 EVT 随机池：type=collapse 仅经 tryEmitStrongCollapse，避免双轨重复"
  - "collapse 修正 ×0.88 挂到 study/tuna/train/parttime 收益；周结算块首行 clearCollapseModifier"

patterns-established:
  - "PSY-02 纯函数与状态字段集中在 gameEngine + GameState；useGame 只编排顺序与日志"

requirements-completed: [PSY-02]

duration: 3min
completed: 2026-03-21
---

# Phase 4 Plan 02: PSY-02 崩溃卡组与回声 Summary

**可配置 collapse deck（10～15 日抖动间隔）、每类首次完整弹窗与后续回声日志、首次后轻量修正至周界清除；act 管线与还款/叙事结局三墙顺序明确。**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T10:14:31Z
- **Completed:** 2026-03-21T10:17:30Z
- **Tasks:** 3（plan 内 Task 0 TDD 骨架与 Task 1 引擎合并为一次提交）
- **Files modified:** 7

## Accomplishments

- `GameState` 增加强冲击间隔、每类首次/回声、里程碑修正字段。
- `gameEngine`：`canTriggerStrongCollapse`、`tryEmitStrongCollapse`、`applyCollapseModifierToAction` 等与 D-09～D-12 对齐。
- `act`：还款 → 叙事结局 → collapse（full 弹窗 / echo 日志）→ `randomPoolAfterAction`（排除 `type=collapse`）。
- `data/events.json` 增加 `psy_collapse_spiral`；`events.ts` 提供 `getCollapseEventDeck()` 供扩展与文档化。
- `useGame.psy.spec.ts`：collapse 事件 resolve 走制度摘要与 stat effects。

## Task Commits

1. **Task 0/1：collapse 引擎 + gameEngine.psy.spec（PSY-02）** — `3502044` (feat)
2. **Task 2：useGame 接线 + events.json + useGame.psy.spec** — `08b5a55` (feat)

**Plan metadata：** 见下方 `docs(04-02)` 提交。

## Files Created/Modified

- `app/logic/gameEngine.ts` — PSY-02 导出：间隔、emit、modifier、deck 抽样
- `app/types/game.ts` — `lastStrongCollapseDay` 等字段
- `app/logic/gameEngine.psy.spec.ts` — `describe('PSY-02')` 覆盖 D-09～D-12
- `app/composables/useGame.ts` — 管线顺序、`randomPoolAfterAction`、行动收益修正、周界清除
- `app/utils/events.ts` — `getCollapseEventDeck`
- `data/events.json` — `psy_collapse_spiral`
- `app/composables/useGame.psy.spec.ts` — resolve 集成

## Decisions Made

- **collapse 与随机池解耦**：通用 `afterAction` 池不再 `pickWeighted` 到 collapse，避免与强冲击调度重复。
- **useGame 内用 `ALL_EVENTS.filter`** 拉取 deck，避免既有 `vi.mock('~/utils/events')` 单测缺少 `getCollapseEventDeck` 导出而失败。

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- 初次在 `useGame` 中 `import getCollapseEventDeck` 导致多份 `useGame.*.spec` 的 mock 未导出该函数；改为内联 `ALL_EVENTS.filter` 后全绿。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PSY-03 可基于 `collapseFirstDone` / 副指标 / 累计日 接总结解锁与冷表。

## Self-Check: PASSED

- `test -f .planning/phases/04-精神驯化表达与无硬失败收束/04-02-SUMMARY.md` → FOUND
- `git log --oneline | grep -q 3502044` → FOUND（`3502044`）
- `git log --oneline | grep -q 08b5a55` → FOUND（`08b5a55`）

---
*Phase: 04-精神驯化表达与无硬失败收束*  
*Completed: 2026-03-21*
