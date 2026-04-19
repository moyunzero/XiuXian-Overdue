# 方案 A 实施任务清单

本文档按“阶段 -> 文件 -> 变更点”拆解，默认以当前代码结构为准，方便后续按文件直接实施。

配套实施顺序请见：`implementation-order.md`。

## 阶段一：画像系统收束

### 1. 类型与状态定义

- [ ] `app/types/game.ts`
  - 新增画像中间结构类型，例如 `SocialProfile`、`FinancialRiskLevel`、`ComplianceLevel`、`BodyAssetLevel`
  - 新增画像标签类型，例如 `ProfileTagId` 或字符串字面量联合
  - 在 `GameState` 中新增画像快照字段，例如 `profileSnapshot`、`profileTags`、`lastProfileUpdateDay`
  - 明确哪些画像字段持久化，哪些字段只在运行时推导

- [ ] `app/composables/useGameState.ts`
  - 为默认存档补齐画像相关默认值
  - 保证旧档加载后不存在未初始化的画像字段

- [ ] `app/composables/useGameStorage.ts`
  - 在 `loadFromSlot()` 中为历史存档补齐画像相关迁移逻辑
  - 为旧版本存档增加默认画像回填和安全兜底

### 2. 纯规则与画像推导层

- [ ] `app/logic/gameEngine.ts`
  - 新增基础画像推导函数，例如 `buildSocialProfile(g)`
  - 新增四类维度推导函数：财务风险、教育信用、制度顺从、身体资产
  - 新增标签生成函数，例如 `deriveProfileTags(g)`
  - 新增画像摘要函数，例如 `buildProfileDigest(g)`，供 UI 和周结算使用
  - 明确画像推导只依赖 `GameState`，保持纯函数特性

- [ ] `app/logic/gameEngine.events.spec.ts`
  - 为画像驱动事件前的基础规则加测试入口
  - 补充画像标签与事件 trigger 兼容性的测试准备

- [ ] `app/logic/gameEngine.psy.spec.ts`
  - 补充制度顺从与麻木相关画像映射测试

- [ ] 新增 `app/logic/gameEngine.profile.spec.ts`
  - 专门覆盖画像等级、标签生成和画像摘要
  - 覆盖高债务、高逾期、高驯化、身体受损等组合场景

## 阶段二：把画像接入主流程

### 3. 游戏编排层接入

- [ ] `app/composables/useGame.ts`
  - 新增画像相关 computed，例如 `profileSnapshot`、`profileDigest`
  - 在 `startNew()` 后初始化首版画像
  - 在 `borrow()`、`repay()`、`resolveEvent()`、`act()`、日结后刷新画像快照
  - 将画像变化摘要接入周结算、日志或制度提示
  - 为后续组件暴露画像读取接口

- [ ] `app/composables/useGame.dayCycle.ts`
  - 在周结算阶段接入画像更新报告
  - 在周结算日志中增加“风险评级变化”“标签变化”“制度评估”摘要
  - 明确画像更新发生在日结前还是日结后，并固定顺序

- [ ] `app/composables/useGame.economy.ts`
  - 预留画像对还款压力、债务重组和费用惩罚的接入点
  - 如果需要，抽出画像驱动的借贷定价辅助函数

### 4. 事件数据与筛选机制

- [ ] `app/types/game.ts`
  - 为 `EventTrigger` 增加画像相关条件字段，例如 `profileTagIn`、`financialRiskIn`、`complianceIn`

- [ ] `data/events.json`
  - 为催收、老师、契约、宗门类事件补充画像触发条件
  - 新增若干方案 A 专属事件，体现“系统按画像精准投放”

- [ ] `scripts/validate-events.mjs`
  - 为新增画像 trigger 字段补充校验规则

- [ ] `app/utils/events.ts`
  - 如有需要，补充画像事件筛选辅助函数或 family 分类工具

- [ ] `app/logic/gameEngine.ts`
  - 扩展 `eventMatchesTrigger()`，使其支持画像相关条件判断
  - 扩展事件选择逻辑以兼容画像分流

- [ ] `app/composables/useGame.events.spec.ts`
  - 补充画像条件事件触发测试

## 阶段三：画像驱动具体系统

### 5. 借贷、还款与身体估值

- [ ] `app/logic/gameEngine.ts`
  - 增加画像驱动的借贷定价函数，例如信用额度、风险利率、重组倾向
  - 扩展身体估值函数，使其不仅依赖属性，也依赖画像状态

- [ ] `app/composables/useGame.ts`
  - 在 `creditLimit`、`borrow()`、`repay()` 中接入画像相关反馈
  - 在还款失败、借贷到账、重组相关日志中加入制度画像表述

- [ ] `app/composables/useGame.events.ts`
  - 扩展身体部位偿还文案和执行结果，使其反映画像标签
  - 为后续“身体抵押不只减债”预留扩展点

- [ ] `app/components/game/BorrowModal.vue`
  - 展示画像驱动的借贷解释，例如风险定价理由、额度压缩原因

- [ ] `app/components/game/RepayModal.vue`
  - 展示系统对玩家当前偿付能力的制度判断摘要

- [ ] `app/components/game/DebtDashboard.vue`
  - 增加风险评级、画像摘要或制度标签入口
  - 将原有债务概览升级为“债务 + 风控画像”合成面板

- [ ] `app/composables/useGame.debt.spec.ts`
  - 补充画像影响借贷额度、利率或重组路径的测试

### 6. 分班与周结算

- [ ] `app/logic/gameEngine.ts`
  - 抽出分班解释层与画像摘要层组合函数
  - 保持考试主导分班，同时让报告层体现画像解释

- [ ] `app/composables/useGame.class.spec.ts`
  - 增加“相同成绩但不同画像下制度解释不同”的测试

- [ ] `app/composables/useGame.dayCycle.ts`
  - 周结算日志中加入画像变更和制度归类结果

## 阶段四：UI 展示与制度归档

### 7. 游戏主界面展示

- [ ] `app/pages/game.vue`
  - 接入 `profileSnapshot`、`profileDigest`、主要标签列表
  - 在页面上为画像摘要模块预留区域
  - 决定画像显示位置：头部、债务面板附近或独立卡片

- [ ] 新增 `app/components/game/ProfilePanel.vue`
  - 展示四类画像等级、主要标签、最近一次制度更新摘要
  - 保持冷制度风格，不做爽感视觉表达

- [ ] `app/components/game/DebtDashboard.vue`
  - 如果不单独做 `ProfilePanel`，则把画像摘要整合进债务面板详情区

### 8. 总结归档与分享素材

- [ ] `app/logic/gameEngine.ts`
  - 扩展 `SummarySnapshot`，加入画像等级、主标签、命运归档摘要
  - 新增命运判定卡所需的结构化输出函数

- [ ] `app/components/game/SummaryPanel.vue`
  - 加入“系统定义身份”“主要标签”“制度风险评级”区块
  - 保持当前“冷数据归档”口吻并强化画像归档感

- [ ] 新增 `app/components/share/FateCard.vue`
  - 以制度报告卡而非战力卡为目标进行设计
  - 展示画像标签、制度结论和命运摘要

- [ ] 新增 `app/components/share/FateCardGenerator.vue`
  - 从 `GameState` 或 `SummarySnapshot` 生成分享用结构化数据

- [ ] 新增 `app/composables/useShare.ts`
  - 封装命运判定卡的导出与分享入口

### 9. 首页与开局表达

- [ ] `app/components/home/HeroSection.vue`
  - 微调首页文案，让“被评分的人生模拟器”定位更清晰

- [ ] `app/pages/index.vue`
  - 在开局配置页提示“身份、天赋、城市、债务将共同决定系统初始画像”

## 阶段五：辅助主轴增强

### 10. 身体抵押修仙

- [ ] `app/composables/useGame.events.ts`
  - 扩展身体抵押收益，不再只服务减债
  - 区分“减债型”“准入型”“修行加速型”抵押结果

- [ ] `app/logic/gameEngine.ts`
  - 为身体抵押生成后续世界反馈，例如事件池、画像标签、估值下修

- [ ] `data/events.json`
  - 新增与已抵押身体状态相关的后续事件

- [ ] `app/components/game/HumanModelViewer.vue`
  - 如需强化反馈，可增加身体资产状态的可视表达入口

### 11. 反画像路线

- [ ] `app/logic/gameEngine.ts`
  - 设计“扰乱系统判断”的条件和收益边界
  - 保证玩家存在操作空间，但不能轻易破坏压迫主基调

- [ ] `app/composables/useGame.ts`
  - 将反画像结果写入日志、结算或特殊事件入口

- [ ] `data/events.json`
  - 新增少量“误判”“伪装成功”“系统回收纠偏”的专属事件

## 阶段六：测试与验证

### 12. 单测补齐

- [ ] 新增 `app/composables/useGame.profile.spec.ts`
  - 覆盖画像刷新时机、画像快照写入、画像展示数据是否稳定

- [ ] `app/composables/useGame.loop.spec.ts`
  - 验证主循环中画像刷新不会破坏时间推进和事件触发顺序

- [ ] `app/composables/useGame.feedback.spec.ts`
  - 验证制度记录文案与画像摘要是否保持统一基调

- [ ] `app/composables/useGameStorage.spec.ts`
  - 验证旧档加载时画像字段回填与持久化兼容性

### 13. 文档与数据同步

- [ ] `.monkeycode/docs/PLAN_A_SYSTEM_DESIGN.md`
  - 实施过程中同步更新已落地范围和偏差点

- [ ] `.monkeycode/specs/plan-a-credit-society-2026/requirements.md`
  - 若玩法边界调整，同步更新需求范围

- [ ] `.monkeycode/specs/plan-a-credit-society-2026/design.md`
  - 若画像结构或接入层变化，同步更新设计说明

## 里程碑建议

- [ ] M1：完成画像类型、推导规则和基础测试
- [ ] M2：完成画像驱动的借贷和事件分流
- [ ] M3：完成游戏页画像展示与周结算画像报告
- [ ] M4：完成制度归档和命运判定卡
- [ ] M5：完成身体抵押增强与反画像路线首版
