# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [代码结构|代码模式|代码生成|构建方法|测试方法|依赖关系|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

[债务系统的核心体验定位]
- Date: 2026-04-17
- Context: Agent 在执行“分析项目定位并强化债务不可出清机制”任务时发现
- Category: 代码模式
- Instructions:
  - 项目将“债务压迫”作为核心体验，玩家可缓解压力但不应出现现金覆盖总债务的可出清窗口。
  - 债务相关主逻辑集中在 `app/composables/useGame.ts`（流程编排）与 `app/composables/useGame.economy.ts`（结算规则）。

[游戏核心架构拆分]
- Date: 2026-04-19
- Context: Agent 在执行“分析现有项目逻辑”任务时发现
- Category: 代码结构
- Instructions:
  - 项目是 Nuxt 4 单页游戏，页面入口主要为 `app/pages/index.vue`（开局与存档）和 `app/pages/game.vue`（主循环界面）。
  - 运行时状态集中在 `app/composables/useGame.ts`，但已按职责拆分到 `useGame.actions.ts`、`useGame.dayCycle.ts`、`useGame.economy.ts`、`useGame.events.ts`。
  - `app/logic/gameEngine.ts` 主要承载纯函数规则，例如分班、最低还款、事件冷却、心理压力、崩溃机制与总结快照。
  - 随机事件采用 `data/events.json` 数据驱动，`app/utils/events.ts` 负责统一加载与按 phase/family 筛选。

[测试覆盖重点]
- Date: 2026-04-19
- Context: Agent 在执行“分析现有项目逻辑”任务时发现
- Category: 测试方法
- Instructions:
  - 项目使用 Vitest，测试主要围绕 `app/composables/*.spec.ts` 与 `app/logic/*.spec.ts`，重点覆盖债务、时间循环、事件、分班、心理系统与存档规则。

[文档任务执行偏好]
- Date: 2026-04-19
- Context: 用户在提出“方案 A 的系统设计稿，补充到 memory、docs 和 specs 中，注意不进行代码修改”时明确要求
- Instructions:
  - 当用户要求产出方案或设计文档时，应同时把结论同步到 `.monkeycode/MEMORY.md`、`.monkeycode/docs/` 与 `.monkeycode/specs/`，方便后续延续开发。
  - 此类任务默认只修改文档，不改动业务代码、配置或测试文件，除非用户另行明确要求。
