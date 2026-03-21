---
phase: 04-精神驯化表达与无硬失败收束
plan: 03
subsystem: game-logic, ui, persistence
tags: [psy-03, summary, sandbox, vitest]

requires:
  - phase: 04-01, 04-02
  provides: [summary unlock, cold snapshot UI, summary flags in save]
affects: [Phase 5 polish, future analytics]

tech-stack:
  added: []
  patterns:
    - "Pure `shouldUnlockSummary` / `buildSummarySnapshot` in gameEngine; narrative ending decoupled from day≥30"
    - "Persistent `summaryUnlocked` / `summarySeen` with load-time retroactive unlock"

key-files:
  created:
    - app/components/game/SummaryPanel.vue
  modified:
    - app/logic/gameEngine.ts
    - app/types/game.ts
    - app/composables/useGameStorage.ts
    - app/composables/useGame.ts
    - app/pages/game.vue
    - app/logic/gameEngine.psy.spec.ts
    - app/composables/useGame.psy.spec.ts

key-decisions:
  - "副指标阈值取 max(驯化,麻木) ≥ 50（SUMMARY_SUBSIDIARY_THRESHOLD），与 D-05 副指标一致"
  - "总结轨②：`情节结局：麻木化时刻` 日志或 `psy_collapse_spiral` 曾入 eventHistory"
  - "叙事 `shouldTriggerNarrativeEnding` 去掉 day>30 门闩，仅保留疲劳/专注/逾期条件，与 D-15③ 分离"

requirements-completed: [PSY-03]

duration: 28min
completed: 2026-03-21
---

# Phase 04 Plan 03: PSY-03 主题收束与冷数据总结 Summary

**三轨先到解锁冷数据总结页；叙事麻木结局与累计日解锁解耦；读后存档提示并无限天继续。**

## Performance

- **Duration:** ~28 min
- **Tasks:** 3（TDD：RED → 引擎/存储 → UI）
- **Files modified:** 8

## Accomplishments

- 实现 `shouldUnlockSummary`、`hasMetSummarySubsidiaryThreshold`、`buildSummarySnapshot` 及常量（D-13～D-15），并与 `shouldTriggerNarrativeEnding` 语义分离（叙事不再用 day>30）。
- `GameState` 增加 `summaryUnlocked` / `summarySeen` 等；`loadFromSlot` 默认合并旧档并在条件已满足时回溯解锁。
- `game.vue` 在条件满足时显示「总结」入口；`SummaryPanel` 展示冷表与 ≤2 句制度结语；「已阅并保存」后 `saveToSlot` + 浏览器 `confirm` 继续循环（D-16）。

## Task Commits

1. **Task 0: PSY-03 单测 RED** — `7d5358f` (test)
2. **Task 1: 引擎与存储** — `37cc45f` (feat)
3. **Task 2: UI 与 useGame** — `64618df` (feat)

## Files Created/Modified

- `app/logic/gameEngine.ts` — PSY-03 纯函数、叙事结局门闩调整、`NARRATIVE_ENDING_LOG_TITLE` 单源
- `app/types/game.ts` — 总结相关可选字段
- `app/composables/useGameStorage.ts` — 旧档合并与回溯解锁
- `app/composables/useGame.ts` — `ensureSummaryUnlock`、`openSummaryPanel`、`acknowledgeSummaryAndContinue`
- `app/pages/game.vue` — 「总结」按钮与面板事件
- `app/components/game/SummaryPanel.vue` — 冷数据表 + 结语
- `app/logic/gameEngine.psy.spec.ts` / `app/composables/useGame.psy.spec.ts` — 覆盖

## Deviations from Plan

None — plan executed as written.

## Known Stubs

None — 冷表数据来自 `buildSummarySnapshot` 实时状态。

## Self-Check: PASSED

- `04-03-SUMMARY.md` 已写入 `.planning/phases/04-精神驯化表达与无硬失败收束/`
- 任务提交 `7d5358f`、`37cc45f`、`64618df` 存在于 `git log`；规划文档已与 `docs(04-03)` 一并提交
- `npm test`（vitest）与 `npm run build` 已通过
