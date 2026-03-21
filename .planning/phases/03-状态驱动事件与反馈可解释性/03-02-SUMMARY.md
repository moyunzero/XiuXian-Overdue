---
phase: 03-状态驱动事件与反馈可解释性
plan: 02
subsystem: ui
tags: [vue, events, vitest, institutional-log]

requires:
  - phase: 03-状态驱动事件与反馈可解释性
    provides: EVT-01 冷却与随机门、gameEngine 事件工具
provides:
  - EVT-02 tier、defaultOptionId、折叠系统区、主日志单条制度摘要
  - useGame.events.spec 可执行契约
  - eventInstitutionalLog 冷摘要纯函数
affects:
  - 03-03-PLAN（validate-events 与 JSON 字段可对齐）

tech-stack:
  added: []
  patterns:
    - "resolveEvent 数据事件：applyEventEffects(suppressLogEffects)+一条制度记录"
    - "toPendingEvent：critical 缺省系统块时由首选项 effects 推导"

key-files:
  created:
    - app/logic/eventInstitutionalLog.ts
    - app/composables/useGame.events.spec.ts
  modified:
    - app/types/game.ts
    - app/logic/gameEngine.ts
    - app/composables/useGame.ts
    - app/components/game/EventModal.vue
    - app/pages/game.vue
    - app/logic/gameEngine.events.spec.ts

key-decisions:
  - "主日志一条「制度记录：标题」+ buildInstitutionalEventLogDetail(effects)；kind:log 在数据事件路径抑制，避免与弹窗叙事重复刷屏"
  - "dismissOptionId：defaultOptionId 优先，否则末选项（常见消极/拒绝），与后续 validate-events 可对齐"

patterns-established:
  - "EventModal：tier===critical 且存在系统字段时展示 details 折叠区"

requirements-completed: [EVT-02]

duration: 12min
completed: 2026-03-21
---

# Phase 03 Plan 02: EVT-02 双反馈与制度摘要 Summary

**关键事件 `tier`、折叠制度区、主日志单条冷摘要，以及 ESC/遮罩映射 `defaultOptionId`（末选项回退）已落地并通过 Vitest。**

## Performance

- **Duration:** 约 12 min
- **Started:** 2026-03-21（执行会话内）
- **Completed:** 2026-03-21
- **Tasks:** 3（Wave0 测试 / 类型与引擎与 resolve / UI+dismiss）
- **Files modified:** 8

## Accomplishments

- `EventDefinition` / `PendingEvent` / `EventModalPayload` 支持 `tier`、`defaultOptionId`、系统块字段；`toPendingEvent` 写入并保证 critical 有制度块（可推导）。
- `resolveEvent` 在数据事件路径：`suppressLogEffects` + 一条 `制度记录：…` 主日志，正文不进入主日志（D-06）。
- `EventModal` 在 critical 下展示 `<details>` 制度区；`game.vue` 用 `dismissOptionId` 解析关闭（D-16）。
- `useGame.events.spec.ts` + `gameEngine.events.spec.ts` 覆盖 EVT-02 契约。

## Task Commits

1. **Task 0: Wave0 测试骨架（RED）** — `9beb8cf` (test)
2. **Task 1: 类型、toPendingEvent、制度摘要日志** — `6ce7723` (feat)
3. **Task 2: EventModal 折叠区 + game.vue dismiss** — `0a310ef` (feat)

**Plan metadata:** `260e694` (docs: complete plan)

## Files Created/Modified

- `app/logic/eventInstitutionalLog.ts` — 从 effects 生成冷「变更摘要」字符串。
- `app/composables/useGame.events.spec.ts` — EVT-02 行为断言。
- `app/types/game.ts` — 事件与弹窗载荷字段扩展。
- `app/logic/gameEngine.ts` — `toPendingEvent` 扩展与 critical 系统块补齐。
- `app/composables/useGame.ts` — 制度日志、`suppressLogEffects`、还款事件 `defaultOptionId`。
- `app/components/game/EventModal.vue` — 折叠制度区 UI。
- `app/pages/game.vue` — `eventForModal` 传 tier/系统字段；`dismissOptionId`。
- `app/logic/gameEngine.events.spec.ts` — `toPendingEvent` EVT-02 用例。

## Decisions Made

- 数据事件路径下 `kind: 'log'` 的 effect 不单独 `addLog`，避免与弹窗文学正文重复；数值与结构化后果仍由 `buildInstitutionalEventLogDetail` 归纳进一条制度记录。
- 无 `defaultOptionId` 时关闭映射为**末项选项 id**（注释标明可与后续 validate-events 收紧）。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Vitest `vi.mock` 与顶层常量：使用 `vi.hoisted` 包裹 mock 事件定义后解决。

## User Setup Required

None.

## Next Phase Readiness

- EVT-03 可向 `events.json` 填入 `tier`/`defaultOptionId`/系统字段，并与 `validate-events.mjs` 对齐。

---

## Self-Check: PASSED

- `app/logic/eventInstitutionalLog.ts`：存在。
- `app/composables/useGame.events.spec.ts`：存在。
- 提交 `9beb8cf`、`6ce7723`、`0a310ef`、`260e694`：`git log --oneline` 可检出。

---
*Phase: 03-状态驱动事件与反馈可解释性*  
*Completed: 2026-03-21*
