# Agent Instructions

面向 AI 编码代理的项目手册。人类向说明见 [README.md](./README.md)；文档索引见 [docs/README.md](./docs/README.md)。

## Harness Engineering（必读 · 交付门禁）

本仓库用 **Plan → Execute → Verify** + **机械门禁**，让 Agent **在生成代码过程中**完成验证，而不是交付后让人工点流程找 bug。

| 动作 | 命令 |
|------|------|
| **交付前必跑** | `yarn harness:verify` → 须看到 **`HARNESS_OK`** |
| 小步迭代 | `yarn harness:verify --quick` |
| PR / 发布前 | `yarn harness:verify --full` |
| 仅架构边界 | `yarn harness:architecture` |

- 完整说明：[docs/harness-engineering.md](./docs/harness-engineering.md)
- Gate 定义：`.harness/manifest.json`
- 任务模板：`.harness/PEV.template.md`、`.harness/progress.template.md`
- Cursor 规则：`.cursor/rules/harness.mdc`（始终生效）

**Agent 交付定义**：未跑 harness 或 exit ≠ 0 → **任务未完成**。禁止用「请你本地试一下」代替 spec + harness。

---

## 产品定位（不可漂移）

- **类型**：Web 单机 · 修仙题材 · 赛博朋克/反乌托邦 · **强系统**生存模拟（非传统宗门养成爽游）
- **核心体验**：在「分数=权限、债务=倒计时、身体=耗材」的制度下，与**可计算的恶意**讨价还价；多周目长线，局末生成**局内文字**制度档案结算
- **叙事来源**：灵感来自 debt-xianxia 类小说设定（仓库内 `best.md` 仅作策划参考，**禁止入库、禁止在 UI/事件文案中引用**）
- **代入规则**：玩家即「你」；使用玩家 `StartConfig` 自定义项（姓名、城市、出身、天赋、初始债务），**必须影响后续门槛/利率/台词变量**；**不得出现原著人名**（用「招生官」「灵贷专员」「家人」等制度角色）
- **重构方向**（优先于堆旧循环内容）：阶段 1「入学前夜」= 多窗口桌面模拟 + 面试 → 灵贷广告/首贷 → 家庭账本/催收；详见 [docs/PRD-act1-pre-enrollment.md](./docs/PRD-act1-pre-enrollment.md)

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | Nuxt **4.3** + Vue **3.5** + TypeScript |
| 包管理 | **Yarn**（`yarn.lock`） |
| 测试 | Vitest（`vitest.config.ts`，`environment: 'node'`） |
| 样式 | 原生 CSS 变量，`app/assets/css/main.css` |
| 3D | Three.js（人体模型，非核心逻辑） |
| 可选 AI | Groq，`server/api/generate-events.post.ts`，需 `.env` 的 `GROQ_API_KEY` |

## 命令（优先使用）

```bash
yarn install          # postinstall → nuxt prepare
yarn dev              # http://localhost:3000 ，从 / 进站
yarn harness:verify   # ★ 按变更跑 gates + 契约 spec（交付门禁）
yarn test             # 全量 Vitest（harness 内会调用）
yarn test:act1        # 仅 Act1 逻辑（入学前夜，改 act1 必跑）
yarn validate:events  # 改 data/events.json 后必跑
yarn build            # 发布前（harness --full --with-build）
```

### 单文件 / 窄范围（改哪测哪）

```bash
yarn vitest --run app/logic/gameEngine.debt.spec.ts
yarn vitest --run app/composables/useGameStorage.spec.ts
yarn vitest --run app/logic/eventSelectionPipeline.spec.ts
yarn test:act1        # 或等价：yarn vitest --run app/logic/act1
```

## 关键路径

| 路径 | 用途 |
|------|------|
| `app/pages/index.vue` | 开局自定义、`StartConfig`、Act1 档案/周目2入口 |
| `app/pages/act1/index.vue` | 入学前夜桌面（`/act1`） |
| `app/composables/useAct1Session.ts` | Act1 编排、存档、家庭/灵贷/面试事件 |
| `app/logic/act1/familyLedger.ts` | 家庭账本、催收档位、三结局 |
| `app/logic/act1/act1FamilyFlow.spec.ts` | **家庭线防卡点回归**（改家庭相关必绿） |
| `app/pages/game.vue` | 当前主循环（三段式行动，legacy） |
| `app/composables/useGame.ts` | 主编排；子模块 `useGame.*.ts` |
| `app/logic/gameEngine.ts` | 纯函数规则（考试、债务、身体抵押、画像门控） |
| `app/types/game.ts` | `GameState`、`StartConfig`、存档结构 |
| `app/composables/useGameStorage.ts` | `kunxu_sim_save_v2`，`saveSchemaVersion: 3`（含 `act1BySlot`） |
| `data/events.json` | 基础事件；`data/eventTemplates.json` 涌现模板 |
| `scripts/validate-events.mjs` | 事件 JSON 校验 |
| `scripts/harness/verify.mjs` | **统一验证编排（PEV Verify 层）** |
| `.harness/manifest.json` | Gate / 契约触发路径（机器可读） |
| `docs/harness-engineering.md` | Harness 体系说明 |
| `.cursor/rules/guideline.mdc` | 行为准则（改动最小、先验证） |
| `.cursor/rules/harness.mdc` | PEV + harness 门禁（始终生效） |

**路由**：`/` 开局 → `/game` 主局 → `/profile` 制度档案。开发页在 `app/pages/dev/`。

## 架构约定

- **规则与 UI 分离**：数值/门控进 `app/logic/*`；Vue composable 只做编排与状态
- **Composable 拆分**：`useGameComputed`、`useGameEconomyActions`、`useGameEventResolver`、`useGameActionExecutor` 等；勿把新逻辑全部塞进 `useGame.ts`
- **开局字段**：`StartConfig` = `playerName` | `background` | `talent` | `initialDebt` | `startingCity` — 新系统（面试/灵贷/家庭）须读取并写入派生 flag，禁止「装饰性自定义」
- **存档**：改 `GameState` 或槽结构时同步 `saveSchemaVersion` 与 `useGameStorage` 测试；**不**自动迁移 `kunxu_sim_save_v1`
- **事件**：`effects` 的 `econ.target` 等以校验脚本为准；贡献流程见 [docs/事件贡献指南.md](./docs/事件贡献指南.md)

## 代码风格（仓库无 ESLint 配置）

- TypeScript + Vue 3 `<script setup lang="ts">`
- 组件 PascalCase；composables `useXxx.ts`；逻辑 `camelCase.ts`
- 业务字面量可用中文联合类型（`Background`、`Talent` 等）
- 日志：`{ title, detail, tone?: 'info'|'warn'|'danger'|'ok' }`
- 匹配现有文件风格；**禁止**顺手大改无关文件、无关格式化

## 测试与校验

### 通用（每次改逻辑都要做）

| 改动范围 | 必跑命令 | 通过标准 |
|----------|----------|----------|
| 任意 `app/logic/*` | `yarn test` 或窄范围 spec | 0 failed |
| `data/events.json` | `yarn validate:events` | exit 0 |
| 存档 / `useGameStorage` | `yarn vitest --run app/composables/useGameStorage.spec.ts` | 0 failed |
| **Act1 任意文件**（见下表） | **`yarn test:act1`** | **0 failed** |
| Act1 家庭/催收/UI 文案 | 上式 + 确认 `act1FamilyFlow.spec.ts` 仍在 | 防卡点用例全绿 |

**Agent 交付前硬性要求（无例外）：**

1. **必须** `yarn harness:verify`（或 `--full`）全绿，回复中写明 `HARNESS_OK` 或失败 gate。
2. 动过 Act1 → harness 会跑 `test:act1`；动家庭线会跑 `act1FamilyFlow.spec.ts`。
3. 不得用「请你本地点一下」代替测试；只有 spec 无法覆盖的纯视觉问题才建议人工看一眼。
4. 新增分支/档位/结局门槛 → **同步加回归用例**，并更新 `.harness/manifest.json` 的 `triggerPaths`（若新路径）。

### Act1 文件 → 测试映射

| 文件 | 建议 spec |
|------|-----------|
| `familyLedger.ts` | `familyLedger.spec.ts` + **`act1FamilyFlow.spec.ts`** |
| `loanProducts.ts` | `loanProducts.spec.ts` |
| `scoreInterview.ts` | `scoreInterview.spec.ts` |
| `act1Settlement.ts` / carryover | `act1Settlement.spec.ts` / `act1Carryover.spec.ts` |
| `moduleProgress.ts` | `moduleProgress.spec.ts` |
| `useAct1Session.ts` | 逻辑下沉到 `app/logic/act1/*` 后由 act1 spec 覆盖；避免只改 UI 不调规则 |
| `app/components/act1/**` | `yarn test:act1` + `act1Compliance.spec.ts`（禁人名） |

不新增只断言常量的无意义测试；**防玩家卡点**的流程用例属于高价值测试。

---

## Act1 · 家庭账本（防卡点契约）

实现与 PRD 对齐见 [docs/PRD-act1-pre-enrollment.md](./docs/PRD-act1-pre-enrollment.md) §9。下列为**不可违反**的运行时契约（由 `act1FamilyFlow.spec.ts` 锁住）：

### 进度 ≠ 结案

| 概念 | 规则 |
|------|------|
| `moneyRequests >= 3` | 仅触发 `isCollectionEscalated`（催收话术加码），**不是**家庭模块结案门槛 |
| 家庭模块结案 | 玩家在「迁出预警」节拍选择结局 → `finalizeFamily` → `completedModules` 含 `family` |
| 全剧结算 | 面试 + 灵贷 + 家庭 **三个模块都完成** 后才出现制度档案 |

### 催收三档（展示）

1. **提醒**（要钱 ≥1）→ `ack` / `delay` 必须推进**可见**档位（`displayCollectionStage` 变化或反馈可见）。
2. **联系人**（通常要钱 ≥1 且过完第 1 档）→ `shield` / `contact-family` 二选一；选后**不得**留在「无按钮的第二档」。
3. **迁出预警** → 出现 `accept-left` | `pay-save`（需已 `shield`）| `false-hope`；**第二档处理完后即可进入，不必再凑 3 次要钱**。

### 实现禁忌（曾导致玩家卡点）

- 禁止用 `Math.min(collectionStage, moneyRequests)` 之类把**选项推进**和**要钱次数**绑死展示。
- 禁止 `isStage2CollectionResolved` 为 true 时 `displayCollectionStage` 仍长期为 2 且 `choices` 为空。
- 禁止结局仅藏在 `v-else-if` 且被「永远存在的 `getCollectionBeat()`」挡住。
- 改催收文案时避免「反馈条 + 正文 + 底部」三重重复；结局档用 `hasFamilyEndingChoices` 横幅即可。

### 最短可玩路径（QA / 用例基准）

```
向家里要 1 次 → 知道了 → 你扛下 → 接受迁出 → 家庭模块结案
```

联系家人路径：第 2 档选「联系家人」后也应直接进入迁出预警（`pay-save` 仍须先扛下）。

---

## 边界（禁止）

- 提交 `.env`、API Key、token
- 修改 `yarn.lock` / 升级依赖（除非任务明确要求）
- 在玩家可见文案中使用小说**原著角色姓名**或可追溯的梗人物
- 无计划地改动 `saveSchemaVersion`、破坏旧槽兼容说明
- 把阶段 1 做成「再套一层弹窗事件」而缺少**多窗口、待办栈、合同/表格**等系统壳
- 默认 `git commit`（仅用户明确要求时提交）；**禁止** `git push --force` 到 main
- 将 `best.md` 加入构建产物或公开部署

## Git / PR

- 提交信息：简洁中文或英文均可，说明「为何」
- AI 提交须在正文包含（按需改模型名）：

```
Co-Authored-By: <Agent Name> <noreply@cursor.com>
```

## 任务分流

| 你在做 | 先看 |
|--------|------|
| **任何功能 / bugfix** | [docs/harness-engineering.md](./docs/harness-engineering.md) + `yarn harness:verify` |
| 事件 JSON | [docs/事件创作指南.md](./docs/事件创作指南.md) + `validate:events` |
| 架构 / composable | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| 阶段 1 桌面模拟重构 | [docs/PRD-act1-pre-enrollment.md](./docs/PRD-act1-pre-enrollment.md) + **`yarn test:act1`** |
| Act1 家庭线 / 催收 | `app/logic/act1/familyLedger.ts` + **`act1FamilyFlow.spec.ts`** |
| 数值公式 | `app/logic/gameEngine.ts` + README「核心数值」节 |

## 当前实现 vs 计划

| 状态 | 内容 |
|------|------|
| **已有** | 三段式行动、`/game`、债务/身体抵押/画像、CEE 模块、AI 事件 API、`/profile` |
| **已有（阶段 1）** | `/act1` 桌面壳；面试 / 灵贷 / 家庭三模块；家庭三结局 + 制度档案结算；`yarn test:act1` 回归 |
| **注意** | 改 Act1 务必跑 `test:act1`；家庭线以 `act1FamilyFlow.spec.ts` 防卡点 |
| **计划（后续周目）** | 昆墟高中主循环接入、法骸/生物资产等 — 见产品讨论记录，勿提前大扩 scope |
