---
phase: 02-债务与分班制度压力
plan: 03
subsystem: game-rules
tags: [vitest, vue, nuxt, class-system, conflict]

requires:
  - phase: 02-01
    provides: 债务与还款基础
  - phase: 02-02
    provides: 分班与周考节律
provides:
  - 连续纯刷分/纯打工日 streak 与路线分类（D-13）
  - 边际递减 + 随机事件概率上调 + 刷分偏科下现金链费用抽检（D-14、D-16）
  - 冷制度日志与顶栏偏科趋势提示，不提供策略（D-15）
  - `useGame.conflict.spec.ts` 防回归
affects:
  - Phase 03 事件管线（可复用失衡权重）

tech-stack:
  added: []
  patterns:
    - 日终 classifyDayRoute + updateRouteStreaks，与 act() 内时段记录闭环
    - 失衡下双轨反制：数值边际 + 事件概率 + 费用池（刷分路线优先现金链）

key-files:
  created:
    - app/composables/useGame.conflict.spec.ts
  modified:
    - app/logic/gameEngine.ts
    - app/composables/useGame.ts
    - app/composables/useGameState.ts
    - app/types/game.ts
    - app/pages/game.vue
    - .planning/phases/02-债务与分班制度压力/02-VALIDATION.md

key-decisions:
  - "纯刷分日定义为三时段均为 study 或 tuna；纯打工日为三时段均为 parttime；其余为 mixed 并重置 streak。"
  - "失衡提示节流：max(streak)≥2 且距上次制度提示 ≥2 游戏日再写主日志，贴合 2~3 日感知节律。"

patterns-established:
  - "路线 streak 仅存于 GameState，引擎提供纯函数 multiplier / classify / streak 更新。"

requirements-completed: [CLASS-03]

duration: 6min
completed: 2026-03-21
---

# Phase 02 Plan 03: 冲突内核（刷分 vs 打工）Summary

**连续路线 streak 驱动的边际递减、事件概率与现金链费用抽检，配合冷制度日志与顶栏偏科趋势提示，完成 CLASS-03 可测闭环。**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T09:10:00Z
- **Completed:** 2026-03-21T09:16:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- 实现单日路线分类、score/cash 连续日计数，并在连续偏科下施加上课/打工边际与「制度抽检（费用）」现金链压力（刷分路线优先）。
- 失衡时上调随机事件基础触发概率；主日志与顶栏仅提示「记录/趋势」，不包含最优解指引。
- 新增 `useGame.conflict.spec.ts` 覆盖 D-13~D-16 与无限天可推进；更新 Phase 2 `02-VALIDATION.md` UAT-04 可执行步骤。

## Task Commits

1. **Task 1: 偏科检测、边际递减与反制** - `8332c02` (feat)
2. **Task 0: CLASS-03 冲突测试骨架** - `2cafe3e` (test)
3. **Task 2: 前端失衡提示与 UAT** - `8b447f1` (feat；`02-VALIDATION.md` 已更新于工作区，目录被 `.gitignore` 忽略)

**Plan metadata:** 已随仓库提交 `.planning` 下 SUMMARY、STATE、ROADMAP、REQUIREMENTS 与 `02-VALIDATION.md` 更新。

_Note：Task 0/1 在实现顺序上为先核心逻辑再合入测试文件，以便每步 `vitest` 可绿。_

## Files Created/Modified

- `app/types/game.ts` — `daySlotActions`、`scoreDayStreak`、`cashDayStreak`、`lastConflictNoticeDay`
- `app/composables/useGameState.ts` — 默认值
- `app/logic/gameEngine.ts` — 路线分类、streak 更新、失衡乘子与事件概率加成
- `app/composables/useGame.ts` — 时段记录、`finalizeDayRouteStreak`、行动/契约乘子、费用抽检、legacy 迁移
- `app/composables/useGame.conflict.spec.ts` — CLASS-03 集成测试
- `app/pages/game.vue` — 顶栏偏科趋势 Pill
- `.planning/phases/02-债务与分班制度压力/02-VALIDATION.md` — UAT-04 步骤细化

## Decisions Made

- 纯刷分日：三时段均为 `study` 或 `tuna`；纯打工日：三时段均为 `parttime`；混用日重置两 streak。
- 制度主日志每 ≥2 游戏日最多一条失衡提示，避免刷屏但仍保持中短周期可见。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 02 三条计划对应的自动化与 UAT 脚本已齐；可进行 `/gsd-verify-work` 或 Phase 03 规划。
- `.planning` 目录在仓库中被 gitignore；本地已写 SUMMARY/STATE/ROADMAP 更新，若需入库请 `git add -f`。

## Self-Check: PASSED

- `test -f .planning/phases/02-债务与分班制度压力/02-03-SUMMARY.md` → FOUND
- `git log --oneline --grep "02-03"` 可见 feat/test/docs 四条提交链

---
*Phase: 02-债务与分班制度压力*
*Completed: 2026-03-21*
