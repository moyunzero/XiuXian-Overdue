# 文档索引

本目录收录**可公开**的设计说明、贡献流程与架构笔记。项目概况见 [README 根文档](../README.md)。

AI 编码代理请先读 **[AGENTS.md](../AGENTS.md)**（交付门禁、关键路径），再读 **[CURRENT-STATE.md](./CURRENT-STATE.md)**（产品 + 工程单一真相，2026-05-31）。

**交付前必跑**：[Harness Engineering](./harness-engineering.md) → `yarn harness:verify` → **HARNESS_OK**

> 里程碑 PLAN、内部 PRD 等**开发文档**位于 `docs/planning/`（常 gitignore）。克隆公开仓库后若无 planning，以 **CURRENT-STATE** + README + AGENTS 为准。

---

## 当前（v4 · Ch0）

| 文档 | 说明 |
|------|------|
| **[CURRENT-STATE.md](./CURRENT-STATE.md)** | **单一真相**：玩法、代码地图、文档分层、过期表述对照 |
| [REDESIGN-v4-chapter-institutional.md](./REDESIGN-v4-chapter-institutional.md) | v4.4 设计锁 · 四十周灵贷契约 |
| [交互流程图.md](./交互流程图.md) | `/play` 路由 · Ch0 状态机 · PlayScreenId |
| [playtest-checklist-ch0.md](./playtest-checklist-ch0.md) | 对外试玩 / Beta 放行 |

---

## 参与贡献

| 文档 | 说明 |
|------|------|
| [事件贡献指南](./事件贡献指南.md) | **无需编程**：GitHub 编辑 JSON、开 PR |
| [事件创作指南](./事件创作指南.md) | 事件 JSON 字段、触发器、`effects` 与校验 |

### 内容数据校验

| 数据 | 命令 |
|------|------|
| `data/events.json` | `yarn validate:events` |
| `data/pressureCards.json` | `yarn validate:pressure-cards` |
| `data/inboxTemplates.json` | `yarn validate:inbox-templates` |
| `data/jobs.json` | `yarn validate:jobs` |
| `data/realmTemplates.json` | `yarn validate:realm-templates` |
| `data/chapters/*.json` | `yarn validate:chapters` |
| `data/mandates/*.json` | `yarn validate:mandates` |

---

## 工程

| 文档 | 说明 |
|------|------|
| [harness-engineering.md](./harness-engineering.md) | PEV 工作流、验证门禁、CI |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Composable 架构（**§Play 当前** + legacy `useGame`） |

---

## 路线图（历史 · 勿当玩法真相）

| 文档 | 说明 |
|------|------|
| [archive/README.md](./archive/README.md) | 已归档规划（M7 · M-pivot-1 · 旧 SCHEMA） |
| [ROADMAP-v3-endless-only.md](./ROADMAP-v3-endless-only.md) | v3 工程收敛；**玩法已由 v4 接替** |
| [ROADMAP-iteration-v3-dual-end.md](./ROADMAP-iteration-v3-dual-end.md) | I1～I6 体验工程；sprint/campaign **已废弃** |
| [ROADMAP-next-iterations.md](./ROADMAP-next-iterations.md) | v2 M1～M9 功能对照（多数已实现） |

---

## 设计与数值（Legacy 参考）

| 文档 | 说明 |
|------|------|
| [系统逻辑总览.md](./系统逻辑总览.md) | ⚠️ Legacy `/game` + 3D；月考/身体数学仍可参考 |
| [开发者技术架构指南.md](./开发者技术架构指南.md) | ⚠️ Legacy 日槽；**study/tuna 公式**与 Ch0 周计划对齐 |
| [PSY系统与叙事螺旋.md](./PSY系统与叙事螺旋.md) | 心理 / 叙事（Ch0 来文 PSY 见 `mandatePsy.ts`） |
| [身体系统深度解析.md](./身体系统深度解析.md) | 抵押 · 完整度 |
| [archive/legacy-game/](./archive/legacy-game/) | **已归档**：事件池四件套（RNG · 联动 · 全流程 · 边际） |

---

## 资源

- [screenshots/](./screenshots/) — README 引用截图（部分为 legacy `/game` UI）
