# M-pivot-1 PLAN

> **ARCHIVED 2026-05-31** — 已于 `c80db1c` 交付；见 [ROADMAP-v3-endless-only.md](../../../ROADMAP-v3-endless-only.md)。

## 主题

v3 endless-only 单线收敛：废弃 sprint/campaign，统一 `/play` 入口与存档 v5。

## 状态

**✅ 已完成** — 2026-05-31 · commit `c80db1c`

## 验收（已全部通过）

- [x] `RunMode` 仅 `endless`；v4 读档迁移剥离 promotion gate
- [x] `advanceLifeSegment` 自动 `pre → hs → uni → work`
- [x] `endlessFromDay1Flow.spec.ts` + harness `endless-from-day1-flow`
- [x] `yarn harness:verify` → HARNESS_OK
- [x] `yarn test:e2e` 2/2
- [x] AGENTS / README / ROADMAP-v3 更新

## 非目标（已明确不做）

- M-pivot-2 离线返回
- M-pivot-3 prestige
- 平衡数值大改（移交 M-balance）
