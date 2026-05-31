# 项目现状（单一真相 · 2026-05-31）

> **读者**：策划、程序、AI Agent。与 [README](../README.md)、[AGENTS.md](../AGENTS.md) 对齐；细节以本文件 + `app/logic/*` spec 为准。  
> **验证**：`yarn harness:verify` → **HARNESS_OK** · 存档 schema **v6** · 默认 `runMode: chapter`

---

## 1. 产品形态（当前可玩）

```text
/ → 开局 StartConfig → /play
                        ├─ S0 入学前夜（Act1 桌面壳 · useAct1Session）
                        └─ Ch0 四十周灵贷契约（runMode: chapter · useChapterSession）
                             ├─ 周仪表盘：还款 / 刷题 / 吐纳 / 零工 / 休息 → tickChapterWeek
                             ├─ 仙司来文（mandateDelivery · 非 4 选 2 压力牌）
                             ├─ 天道审判关：月考 W4/8/12 · 筑基 W16 · 择宗 W17 · 结业 W28 · 三轨 W29 · 终局 W40
                             └─ 结局：征信灵籍（W40）或 崩盘归档（债务/身体/审查）
```

| 维度 | 当前 | Legacy（冷库/重定向） |
|------|------|---------------------|
| 主循环 | **周计划 + 来文** | Endless **4 选 2** 压力牌（`usePlayEndlessSession`） |
| 入口 | `/play` | `/game` 三段式日槽 · `/act1` |
| runMode 默认 | `chapter`（`createPlayRun`） | `endless` 读档可迁移为 chapter |
| 时间粒度 | **契约周**（40 周）+ 隐藏日推进计息 | 游戏日 + 压力牌回合 |

**未完成（产品）**：U5 人玩 / Beta 放行 → [playtest-checklist-ch0.md](./playtest-checklist-ch0.md)

---

## 2. 技术栈与门禁

| 项 | 值 |
|----|-----|
| 框架 | Nuxt 4.3 · Vue 3.5 · TypeScript |
| 规则层 | `app/logic/*`（禁止 import Vue/pages） |
| 编排层 | `useChapterSession` · `useAct1Session` · `usePlayOrchestrator` |
| 存档键 | `localStorage` **`kunxu_sim_save_v5`** · `saveSchemaVersion: 6` |
| 交付 | `yarn harness:verify` → **HARNESS_OK** |
| 契约 spec | `chapter0-contract-flow` · `chapter0-three-track-flow` · `act1FamilyFlow` 等 → `.harness/manifest.json` |

---

## 3. 主路径代码地图（Codegraph 锚点）

| 环节 | 路径 |
|------|------|
| 路由壳 | `app/pages/play/index.vue` → `PlayChapterScreenHost` / `PlayEndlessScreenHost` |
| 屏幕解析 | `app/logic/play/resolvePlayScreen.ts` |
| 章配置 | `data/chapters/ch0-forty-week-contract.json` · `chapterRegistry.ts` |
| 周推进 | `chapterWeekFlow.ts`（`initChapter` / `tickChapterWeek` / `clampWeekPlanToSegment`） |
| 周计划数值 | `chapterWeekPlanEffects.ts` |
| 来文 | `mandateDelivery.ts` · `mandatePsy.ts` · `data/mandates/*` |
| 审判关 | `setpieceFlow.ts` · `examBoss.ts` · `segmentGate.ts` · `beatRunner.ts` |
| 崩盘/终局 | `chapterCollapse.ts` · `chapterFailurePostMortem.ts` · `buildRunArchive.ts` |
| 债务 UI | `debtDashboard.ts`（chapter：**周账期文案**，非日倒计时） |
| Act1 结转 | `act1PlayTransition.ts` → `createHsPlayState.ts` → `initChapter` |

---

## 4. 文档分层（读哪份）

### 4.1 必读（当前）

| 文档 | 用途 |
|------|------|
| **本文件** | 产品 + 工程单一真相 |
| [REDESIGN-v4-chapter-institutional.md](./REDESIGN-v4-chapter-institutional.md) | v4 设计锁 · 验收标准 V4-1～8 |
| [交互流程图.md](./交互流程图.md) | 路由 / Ch0 状态机 / 屏 ID |
| [playtest-checklist-ch0.md](./playtest-checklist-ch0.md) | 对外试玩脚本 |
| [harness-engineering.md](./harness-engineering.md) | PEV · gate · 改哪测哪 |

### 4.2 规划（本地 `docs/planning/`，常 gitignore）

| 目录 | 状态 |
|------|------|
| [R-chapter-0](./planning/R-chapter-0/) | ✅ 逻辑 MVP 已交付 |
| [U-ch0-experience](./planning/U-ch0-experience/) | 🔶 U1–U4 ✅ · **U5 人玩待办** |
| I1～I3 | 未开始 / 部分（I3 validate 脚本已有） |
| M1～M9 | v2 功能已落地；**模式**由 v4 章制取代 |

### 4.3 Legacy 参考（勿当主路径）

| 文档 | 说明 |
|------|------|
| [archive/README.md](./archive/README.md) | **已归档规划**（M7 campaign · M-pivot-1 · 旧 SCHEMA 草案） |
| [archive/legacy-game/](./archive/legacy-game/) | **已归档**：Legacy 事件池四件套 |
| [ROADMAP-v3-endless-only.md](./ROADMAP-v3-endless-only.md) | **工程收敛史**（M-pivot-1）；玩法已由 v4 接替 |
| [ROADMAP-iteration-v3-dual-end.md](./ROADMAP-iteration-v3-dual-end.md) | I1～I6 体验工程；sprint/campaign **已废弃** |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Legacy `/game` · `useGame` composable |
| [系统逻辑总览.md](./系统逻辑总览.md) | Legacy `/game` · 3D 身体模型 |
| [开发者技术架构指南.md](./开发者技术架构指南.md) | Legacy `gameEngine` 日行动数学（study/tuna 公式仍适用于章内周计划） |

### 4.4 内容与数值

| 文档 | 说明 |
|------|------|
| [事件创作指南.md](./事件创作指南.md) · [事件贡献指南.md](./事件贡献指南.md) | `data/events.json`（Legacy `/game` 与部分 endless 仍用） |
| [archive/legacy-game/](./archive/legacy-game/) | **已归档**：事件池 RNG / 联动 / 全流程 / 边际效应 |
| [开发者技术架构指南.md](./开发者技术架构指南.md) | study/tuna 公式 → Ch0 周计划 |

---

## 5. 常见文档误区（已过期表述）

| 过期说法 | 现行 |
|----------|------|
| 「Endless 单线 + 4 选 2 主循环」 | Ch0 **周仪表盘 + 仙司来文** |
| 「runMode 恒为 endless」 | 新局默认 **`chapter`** |
| 「账单 X 日」倒计时（Ch0） | **第 N/40 周账期** + 展开明细「契约剩余 X 周」 |
| 「R1～R3 待实现」 | R-chapter-0 **已完成**（2026-05-31） |
| 「M-balance 当前阻塞」 | 无尽平衡挂起；**Ch0 试玩**为当前产品阻塞 |
| `saveSchemaVersion: 5` 无 chapter | 当前根级 **v6** |

---

## 6. 修订

| 日期 | 说明 |
|------|------|
| 2026-05-31 | 事件池四件套 → `docs/archive/legacy-game/` |
