# 方案 A 按文件影响范围排序的实施顺序

本文档的目标，是帮助后续真正开工时减少返工。

排序原则如下：

- 先改影响全局类型和纯规则的文件
- 再改承接主流程的 composable
- 再改数据文件和校验脚本
- 再改页面与组件展示
- 最后补测试、文档与增强项

这样做可以避免出现以下返工：

- UI 先做了，但底层类型和快照结构还没稳定
- 事件数据先写了，但 trigger 结构和校验器还没支持
- 借贷和周结算先接了，但画像推导口径后面又改一遍

## 第一层：最先动，影响面最大

这些文件一旦改动，会影响后续大量模块的接口、依赖和数据结构，应最先定型。

### 1. `app/types/game.ts`

原因：

- 它决定画像结构、标签类型、持久化字段和事件 trigger 扩展字段
- 后续 `gameEngine.ts`、`useGame.ts`、`SummaryPanel.vue`、事件数据校验都会依赖这里

建议在这里一次定好：

- `SocialProfile` 及其维度等级类型
- `ProfileTagId`
- `GameState` 中需要持久化的画像字段
- `EventTrigger` 中的画像条件字段

### 2. `app/logic/gameEngine.ts`

原因：

- 它是方案 A 的规则中枢
- 画像推导、标签生成、事件匹配、借贷定价、周结算摘要、SummarySnapshot 扩展都会汇集到这里

建议第一轮先只做：

- 画像推导函数
- 标签生成函数
- 画像摘要函数

不要在第一轮同时把借贷、身体估值、反画像路线全部塞进去，否则会让规则面过大。

### 3. `app/composables/useGameState.ts`

原因：

- 它为新局默认状态提供初始值
- 任何新增持久化字段都需要这里兜底

### 4. `app/composables/useGameStorage.ts`

原因：

- 它决定旧档兼容和画像字段回填
- 如果这里不先补齐，后面调 UI 和主流程时会持续被旧存档问题干扰

## 第二层：主流程接入层

这一层决定画像何时刷新、如何被消费，是方案 A 从“规则存在”变成“系统在运行”的关键。

### 5. `app/composables/useGame.ts`

原因：

- 它负责 `startNew()`、`act()`、`borrow()`、`repay()`、`resolveEvent()` 等主入口
- 画像刷新时机必须先在这里收口

建议顺序：

1. 暴露 `profileSnapshot` / `profileDigest` computed
2. 在开局和关键动作后统一刷新画像
3. 最后再把画像摘要写入日志或向组件透出

### 6. `app/composables/useGame.dayCycle.ts`

原因：

- 周结算是方案 A 的关键表达位
- 画像如果不进周结算，玩家很难感知“制度在定义我”

建议在 `useGame.ts` 的刷新时序稳定后再动这个文件。

### 7. `app/composables/useGame.economy.ts`

原因：

- 需要等画像推导层稳定后，才能安全接入借贷定价和还款解释
- 它的影响主要在经济计算，不应早于画像结构定义

### 8. `app/composables/useGame.events.ts`

原因：

- 需要等画像标签和身体资产定义稳定后，才能接入身体抵押与估值文案

## 第三层：事件数据和校验链路

这一层很容易产生返工，所以应该晚于类型和规则、早于 UI。

### 9. `scripts/validate-events.mjs`

原因：

- 先让校验器认识画像 trigger 字段
- 再批量改 `data/events.json`，可以少踩大量格式错误

### 10. `data/events.json`

原因：

- 它是内容量最大的地方之一
- 一旦规则和 trigger 字段还没稳定就先改这里，后面返工成本最高

建议顺序：

1. 先补已有事件的画像条件字段
2. 再新增方案 A 专属事件
3. 最后再加“误判”“纠偏”“反画像路线”特殊事件

### 11. `app/utils/events.ts`

原因：

- 只有在确认事件加载方式需要额外辅助函数时再动
- 这不是首轮必须改的文件，避免过早扩展工具层

## 第四层：系统反馈最强的 UI 入口

这层应该在数据结构和流程稳定后再开始，否则组件会反复跟着类型改。

### 12. `app/components/game/DebtDashboard.vue`

原因：

- 债务面板是方案 A 最合适的首个画像展示入口
- 它天然承接“债务 + 风控”的组合表达

建议优先于独立画像面板改动。

### 13. `app/components/game/BorrowModal.vue`

原因：

- 画像驱动借贷定价最直接的解释场景在这里
- 借贷逻辑稳定后再接 UI 文案最省事

### 14. `app/components/game/RepayModal.vue`

原因：

- 与 BorrowModal 类似，属于经济反馈解释层

### 15. `app/pages/game.vue`

原因：

- 它负责把摘要数据串到界面上
- 应放在具体子组件能力稳定后再接入，避免页面层先承担过多临时逻辑

### 16. `app/components/game/ProfilePanel.vue`

原因：

- 这是可选增强件
- 只有当确认 `DebtDashboard.vue` 承载不下画像信息时再新增，能少建一个组件就少建一个

## 第五层：制度归档和分享产物

这层依赖画像结构、周结算和游戏页展示都已基本定型。

### 17. `app/logic/gameEngine.ts` 中的 `SummarySnapshot` 扩展

原因：

- 归档结构最好在画像系统稳定后再扩展
- 否则 `SummaryPanel.vue` 和 FateCard 数据模型会跟着反复改

### 18. `app/components/game/SummaryPanel.vue`

原因：

- 它是方案 A 的“冷数据归档”核心出口
- 应在 `SummarySnapshot` 扩展完成后再调整

### 19. `app/components/share/FateCard.vue`

原因：

- 它是结果展示层，不应先于归档结构存在

### 20. `app/components/share/FateCardGenerator.vue`

原因：

- 它依赖归档结构和分享卡模板，应该更靠后

### 21. `app/composables/useShare.ts`

原因：

- 它是输出和导出层封装，最晚接入也最安全

## 第六层：首页表达和叙事补强

这些文件影响产品定位感知，但不会阻塞核心玩法落地，所以可以放到后面。

### 22. `app/components/home/HeroSection.vue`

原因：

- 负责首页定位文案微调
- 不影响核心系统开发，可后置

### 23. `app/pages/index.vue`

原因：

- 开局页可以补“初始画像”提示
- 但它不应早于主循环系统落地，否则会出现首页承诺了、游戏里还没有的情况

## 第七层：增强线，最后做

这些文件适合放在首轮系统稳定后，否则会把开发面一下拉得太宽。

### 24. `app/composables/useGame.events.ts` 身体抵押增强

原因：

- 它是方案 A 的强记忆点，但不是第一轮稳定画像系统的前置条件

### 25. `app/logic/gameEngine.ts` 反画像路线逻辑

原因：

- 反画像路线需要先知道画像系统是否已经足够稳定、足够可理解
- 否则会过早引入复杂策略分支

### 26. `data/events.json` 中的误判 / 纠偏 / 反画像事件

原因：

- 它们依赖前面的画像逻辑与文案风格已经成型

### 27. `app/components/game/HumanModelViewer.vue`

原因：

- 身体资产可视化属于增强反馈，不是首轮闭环必须项

## 第八层：测试补齐和回归验证

测试应跟随每一层逐步补，但如果只给一个总顺序，建议在核心功能链成型后集中补齐。

### 28. `app/logic/gameEngine.profile.spec.ts`

优先级最高，因为它验证画像推导本身是否稳定。

### 29. `app/composables/useGame.profile.spec.ts`

用于验证画像刷新时机是否正确。

### 30. `app/composables/useGame.debt.spec.ts`

验证借贷和还款已经接入画像反馈。

### 31. `app/composables/useGame.events.spec.ts`

验证画像事件分流是否生效。

### 32. `app/composables/useGame.class.spec.ts`

验证分班解释层的画像接入。

### 33. `app/composables/useGame.loop.spec.ts`

做闭环回归，确保画像刷新没破坏主循环。

### 34. `app/composables/useGame.feedback.spec.ts`

验证制度记录语气没有被破坏。

### 35. `app/composables/useGameStorage.spec.ts`

最后验证旧档兼容和持久化。

## 推荐的实际开发批次

如果按最少返工来排，我建议实际按下面 5 批推进。

### Batch 1：定类型和规则骨架

- `app/types/game.ts`
- `app/logic/gameEngine.ts`
- `app/composables/useGameState.ts`
- `app/composables/useGameStorage.ts`
- `app/logic/gameEngine.profile.spec.ts`

### Batch 2：接主流程和周结算

- `app/composables/useGame.ts`
- `app/composables/useGame.dayCycle.ts`
- `app/composables/useGame.economy.ts`
- `app/composables/useGame.profile.spec.ts`

### Batch 3：接事件和借贷反馈

- `scripts/validate-events.mjs`
- `data/events.json`
- `app/logic/gameEngine.ts` 的事件匹配扩展
- `app/composables/useGame.events.ts`
- `app/composables/useGame.events.spec.ts`
- `app/composables/useGame.debt.spec.ts`

### Batch 4：接展示和归档

- `app/components/game/DebtDashboard.vue`
- `app/components/game/BorrowModal.vue`
- `app/components/game/RepayModal.vue`
- `app/pages/game.vue`
- `app/components/game/SummaryPanel.vue`
- 如有需要再新增 `app/components/game/ProfilePanel.vue`

### Batch 5：接分享和增强线

- `app/components/share/FateCard.vue`
- `app/components/share/FateCardGenerator.vue`
- `app/composables/useShare.ts`
- `app/components/home/HeroSection.vue`
- `app/pages/index.vue`
- `app/components/game/HumanModelViewer.vue`
- `data/events.json` 中的反画像事件

## 一句话执行建议

真正开工时，优先把“画像结构 + 画像推导 + 主流程刷新 + 周结算表达”做成闭环，再去做事件分流、独立面板和分享卡。这样最不容易返工。
