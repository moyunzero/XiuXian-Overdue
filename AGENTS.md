# Agent Instructions

面向 AI 编码代理的**薄索引**（目标少于 120 行）。人类说明见 [README.md](./README.md)；完整文档见 [docs/README.md](./docs/README.md)。**勿**把里程碑细则、契约表、PRD 长文写进本文件——放进 `docs/`、`.cursor/rules/` 或 `.harness/manifest.json`。

## 交付（必读）

| 动作 | 命令 |
|------|------|
| **交付前必跑** | `yarn harness:verify` → **`HARNESS_OK`** |
| 小步 | `yarn harness:verify --quick` |
| 发布前 | `yarn harness:verify --full` |

未跑 harness 或 exit ≠ 0 → 任务未完成。禁止用「请你本地试一下」代替 spec。

- 体系：[docs/harness-engineering.md](./docs/harness-engineering.md)
- 契约与 gate：`.harness/manifest.json`（`contracts` / `triggerPaths`）
- 始终生效规则：`.cursor/rules/harness.mdc`

新增玩家卡点分支 → 加 `*Flow.spec.ts` 并在 manifest 登记。Setpiece 与压力恢复统一用 `app/logic/play/setpieceFlow.ts`（`prepare*` / `resumePressureAfter*`）。

## 产品定位（不可漂移）

Web 单机 · 修仙 + 赛博反乌托邦 · **强系统**生存模拟（非宗门爽游）。核心：分数=权限、债务=倒计时、身体=耗材；流程固定为 **S0 入学前夜 → Endless 单线修行（高中/大学/职场为内部段落自动推进）**。玩家即「你」；`StartConfig` 须影响门槛/利率/台词；**禁原著人名**（用制度角色）。`best.md` 仅策划参考，**禁止入库与 UI 引用**。阶段 1 见 [docs/PRD-act1-pre-enrollment.md](./docs/PRD-act1-pre-enrollment.md)。

## 技术栈与命令

Nuxt **4.3** + Vue **3.5** + TS · **Yarn** · Vitest（node）· CSS 变量 · 可选 Groq（`.env` `GROQ_API_KEY`）。

```bash
yarn install && yarn dev          # http://localhost:3000
yarn harness:verify             # 交付门禁
yarn test                       # 全量 logic spec
yarn test:act1                  # 改 act1 必跑
yarn validate:events            # 改 data/events.json
yarn build                      # harness --full --with-build
```

## 关键路径

| 路径 | 用途 |
|------|------|
| `app/pages/index.vue` | 开局、`StartConfig`、继续修行 |
| `app/pages/play/index.vue` | **主玩法** `/play` |
| `app/composables/usePlayStorage.ts` | 存档 `kunxu_sim_save_v5` |
| `app/types/play.ts` | `PlayRunState`、`RunMode`、`LifeStage` |
| `app/logic/play/*` | 压力牌、无尽单线、setpiece |
| `app/composables/useAct1Session.ts` | Act1 编排 |
| `app/logic/act1/familyLedger.ts` | 家庭账本（防卡点见 PRD §9 + `act1FamilyFlow.spec.ts`） |
| `app/pages/game.vue` | Legacy 三段式 `/game` |
| `app/logic/gameEngine.ts` | 债务/考试/身体抵押等纯函数 |
| `data/events.json` | 基础事件 |
| `.harness/manifest.json` | Gate / 契约 |

**路由**：`/` → `/play`（一条线：入学前夜 → 高中 → …）；`/act1`、`/game`、`/profile` 重定向至 `/play` 或 `/`。Dev：`app/pages/dev/`（含 3D 试验页）。

## 架构与风格

- 规则在 `app/logic/*`；composable 只编排。**禁止** logic import `~/pages`、`~/components`、`vue`。
- 全屏玩法页须视口铺满 → [.cursor/rules/responsive-layout.mdc](./.cursor/rules/responsive-layout.mdc)
- 玩家可见文案 / 压力牌 offered → [.cursor/rules/player-facing-copy.mdc](./.cursor/rules/player-facing-copy.mdc)、[pressure-deck-offer.mdc](./.cursor/rules/pressure-deck-offer.mdc)
- 探索架构 / 调用链 / 改动影响面（省 token）→ [.cursor/rules/code-intelligence.mdc](./.cursor/rules/code-intelligence.mdc)；符号用 **Codegraph** MCP（`.codegraph/`）；语义/onboarding 用 **Understand-Anything** skills（`.understand-anything/`，**勿**整文件读 `knowledge-graph.json`）
- 改动最小；无 ESLint；匹配现有风格；勿改 `yarn.lock`（除非任务要求）

## 改哪测哪

| 改动 | 至少 |
|------|------|
| `app/logic/*` | `yarn test` 或窄 spec |
| `data/events.json` | `yarn validate:events` |
| `useGameStorage` / `GameState` | `useGameStorage.spec.ts` |
| Act1 | **`yarn test:act1`**；家庭线确认 `act1FamilyFlow.spec.ts` |
| Play 编排 / setpiece | manifest 中对应 `contracts` + harness |

交付前：**必须** `yarn harness:verify`，回复写明 `HARNESS_OK` 或失败 gate。

## 规划与任务分流

动手前读对应 **PLAN + TASKLIST**（本地 `docs/planning/`，已 gitignore）或 [docs/README.md](./docs/README.md)，不要扩写 `AGENTS.md`。

| 你在做 | 先看 |
|--------|------|
| 任意功能 / bugfix | [harness-engineering.md](./docs/harness-engineering.md) + harness |
| v3 无尽单线（当前主线） | [ROADMAP-v3-endless-only.md](./docs/ROADMAP-v3-endless-only.md) + M-pivot-1 清理 |
| v2 里程碑 M1～M9 | 本地 `docs/ROADMAP-next-iterations.md` + `docs/planning/Mx-*/` |
| v3 双端 / 状态机 | 本地 `docs/ROADMAP-iteration-v3-dual-end.md` + `docs/planning/Ix-*/` |
| Act1 / 家庭催收 | 本地 `docs/PRD-act1-pre-enrollment.md`（gitignore，不公开）+ `yarn test:act1` |
| 事件 JSON | [事件创作指南.md](./docs/事件创作指南.md) |
| 架构 | [ARCHITECTURE.md](./docs/ARCHITECTURE.md) + [code-intelligence.mdc](./.cursor/rules/code-intelligence.mdc)（探索时用 Codegraph MCP） |
| M6 职场 | `docs/planning/M6-work/` |
| M7 收割 | `docs/planning/M7-campaign-harvest/` |
| M8 元进度 / AI | `docs/planning/M8-meta-ai/` |
| M9 无尽境 | `docs/planning/M9-endless-realm/` |

## 边界（禁止）

- 提交 `.env`、密钥；无指令改 `yarn.lock` / `saveSchemaVersion` 破坏兼容
- UI 禁原著人名；禁把 Act1 做成纯弹窗堆叠而无桌面系统壳
- 默认不 `git commit`；**禁止** `git push --force` main；禁 `best.md` 进构建产物

## Git

提交信息说明「为何」。AI 提交正文含：`Co-Authored-By: <Agent Name> <noreply@cursor.com>`
