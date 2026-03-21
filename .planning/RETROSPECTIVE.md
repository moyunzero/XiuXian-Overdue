# Retrospective

跨里程碑趋势与单里程碑复盘。新章节在每次 `/gsd-complete-milestone` 后追加。

## Cross-Milestone Trends

| 指标 | v1.0 |
|------|--------|
| 阶段数 | 5 |
| 计划数 | 15 |
| 任务数（工具统计） | 36 |

---

## Milestone: v1.0 — 修仙高压生存模拟初版闭环

**Shipped:** 2026-03-21  
**Phases:** 5 | **Plans:** 15

### What Was Built

- 无限天三时段核心循环与五大基础行动闭环；债务/分班制度压力；事件管线与叙事+系统双反馈；契约/驯化/麻木/崩溃与冷数据总结；本地存档与响应式主流程。

### What Worked

- 分阶段映射需求 ID（LOOP/ACT/DEBT/…）与 ROADMAP 对齐，便于验收与追溯。
- Vitest 覆盖关键引擎与 composable，回归成本可控。
- “无硬 Game Over + 主题收束”与存档/跨端分阶段落地，减少一次性耦合。

### What Was Inefficient

- 部分 SUMMARY 提取产生无效占位（已在 MILESTONES 中手工修正）。
- 里程碑审计文档未强制执行，依赖 Phase UAT 与需求表兜底。

### Patterns Established

- 事件 `family`、冷却与周降权规则在 spec 中固定为权威。
- 存档采用 `saveSchemaVersion` + 双写；破坏性变更走 README 而非静默迁移（v1）。

### Key Lessons

- 主题类游戏：规则可读性与“冷制度”语气需要与 UI/日志设计同步迭代。
- 本地存档：浏览器配额与损坏处理要在首版就留好用户路径（槽位作废、冷提示）。

### Pre-flight Note

- 完成里程碑时 **无** `.planning/v1.0-MILESTONE-AUDIT.md`；若需要对外发布证明链，可补跑 `/gsd-audit-milestone` 仅作文档。
