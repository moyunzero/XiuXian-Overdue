# 实施计划：因果涌现引擎 (Causal Emergence Engine)

## 阶段 1：基础架构与情绪记忆层 (Week 1-2)

- [ ] 1.1 创建 CEE 核心目录结构
  - 在 `app/composables/` 下新建 `useEmotionalMemory.ts`
  - 在 `app/logic/` 下新建 `emotionalMemoryLayer.ts`
  - 在 `app/types/` 下扩展 `game.ts` 添加 CEE 相关类型
  - 确保目录结构与现有 `useGame.ts` / `gameEngine.ts` 风格一致

- [ ] 1.2 定义 CEE 核心 TypeScript 类型
  - 实现 `EmotionalMemory`、`SessionSummary`、`PersonalityProfile` 接口
  - 实现 `HiddenModifiers`、`HiddenVariables` 接口
  - 扩展 `GameState` 接口添加 `sessionMetrics`、`hiddenVariables` 字段（可选，保持向后兼容）
  - 参考 `design.md` 中 "Data Models" 章节

- [ ] 1.3 实现情绪记忆层核心逻辑
  - 实现 `initEmotionalMemory()`：从 localStorage 加载或创建默认记忆
  - 实现 `recordSession()`：在游戏结束时汇总本局数据并追加到记忆
  - 实现 `buildPersonalityProfile()`：从历史会话计算人格画像
  - 实现 `getHiddenModifiers()`：根据画像生成隐藏变量修正值
  - 实现 `pruneMemory()`：当会话数超过 50 时按权重淘汰旧记录
  - 参考 `requirements.md` Requirement 1 和 `design.md` Section 1

- [ ] 1.4 实现情绪记忆持久化与集成
  - 在 `useGameStorage.ts` 中新增 `kunxu_sim_emotional_memory_v1` 存储键
  - 实现导入/导出时合并情绪记忆的逻辑（冲突：最新优先）
  - 在 `useGame.ts` 的 `startNew()` 中调用 `applyMemoryToState()` 注入初始影响
  - 在 `useGame.ts` 的存档/读档流程中同步情绪记忆
  - 参考 `requirements.md` Requirement 7

- [ ]* 1.5 为情绪记忆层编写单元测试
  - 测试 `buildPersonalityProfile` 对各种决策模式的正确分类
  - 测试 `pruneMemory` 的权重淘汰逻辑
  - 测试隐藏修正值的数值范围（±5-15% 行动收益，±10-30% 事件概率）
  - 使用 Vitest 在 `app/logic/emotionalMemoryLayer.spec.ts` 中实现

- [ ] 1.6 检查点 - 确保阶段 1 编译通过且测试通过

## 阶段 2：因果图引擎与推演沙盘 (Week 3-4)

- [ ] 2.1 实现因果图数据结构
  - 在 `app/logic/causalGraphEngine.ts` 中实现 `createCausalGraph()`
  - 实现 `CausalNode`、`CausalEdge` 类型及图操作（增删查）
  - 确保图为 DAG，行动节点指向状态节点，状态节点指向下一个行动节点
  - 参考 `design.md` Section 2

- [ ] 2.2 实现因果图记录与预测
  - 实现 `recordAction()`：在行动执行后记录前后状态快照及隐藏变量贡献
  - 实现 `predictSequence()`：基于历史边权重预测行动序列的结果
  - 实现 `pruneGraph()`：超过 1000 节点时剪枝，保留关键路径
  - 实现 `getRecentChain()`：获取最近 N 天的因果链
  - 参考 `requirements.md` Requirement 2

- [ ] 2.3 将因果图集成到游戏主循环
  - 在 `useGame.ts` 的 `act()` 中调用 `recordAction()` 记录每次行动
  - 在 `useGame.ts` 的 `startNew()` 中初始化空因果图
  - 确保因果图随游戏状态一起存档/读档

- [ ] 2.4 实现推演沙盘 UI 组件
  - 创建 `app/components/game/DeductionSandbox.vue`
  - 实现行动队列（可添加/移除假设行动）
  - 实现时间轴视图（展示预测的状态变化链）
  - 实现风险指示器（债务轨迹、疲劳累积、考试预测、崩溃风险）
  - 对隐藏变量影响的结果展示不确定性区间（如 `法力 +1.2 ~ +1.8`）
  - 提供"执行序列"和"取消"按钮
  - 参考 `design.md` Section 5 和 `requirements.md` Requirement 5

- [ ] 2.5 在 `game.vue` 中接入推演沙盘入口
  - 添加打开推演沙盘的按钮（桌面端放在侧边栏，移动端放入工具栏）
  - 沙盘使用 `currentState` + `causalGraph` + `personalityProfile` 作为输入
  - 执行序列时调用 `act()` 循环执行行动

- [ ]* 2.6 为因果图引擎编写单元测试
  - 测试预测准确性：已知行动序列的预测结果与实际结果偏差在合理范围
  - 测试剪枝后关键路径保留
  - 测试 DAG 无环约束
  - 在 `app/logic/causalGraphEngine.spec.ts` 中实现

- [ ] 2.7 检查点 - 确保推演沙盘可正常打开、预测、执行和取消

## 阶段 3：涌现式事件系统 (Week 5-6)

- [ ] 3.1 设计事件模板数据结构
  - 在 `app/types/game.ts` 中新增 `EventTemplate`、`TemplateCondition`、`OptionTemplate`、`EffectTemplate` 类型
  - 模板支持变量插值（如 `${stats.fatigue}`、`${profile.riskTolerance}`）
  - 参考 `design.md` Section 3

- [ ] 3.2 创建初始事件模板库
  - 在 `data/eventTemplates.json` 中创建 20-30 个事件模板
  - 覆盖以下主题：催收、老师推销、同学互动、黑市交易、身体抵押后续、契约反噬
  - 每个模板包含触发条件、标题/正文模板、选项模板、效果模板
  - 模板需通过现有 `validate-events.mjs` 的扩展校验
  - 参考 `requirements.md` Requirement 3

- [ ] 3.3 实现涌现式事件生成器
  - 在 `app/logic/emergentEventGenerator.ts` 中实现 `generateEmergentEvent()`
  - 实现 `scoreTemplateRelevance()`：根据当前状态、画像、网络、因果链评分
  - 实现 `fillTemplate()`：将模板中的变量替换为上下文数据
  - 实现 `fallbackToStaticEvent()`：无匹配模板时回退到 `data/events.json`
  - 生成的事件需符合现有 `EventDefinition` / `PendingEvent` 接口

- [ ] 3.4 将涌现事件集成到游戏事件系统
  - 在 `useGame.ts` 的 `randomPoolAfterAction()` 中优先调用 `generateEmergentEvent()`
  - 若生成器返回 null，则回退到现有静态事件池
  - 在 `useGame.ts` 的 `resolveEvent()` 中支持处理涌现事件（复用现有逻辑）
  - 记录涌现事件触发历史（用于调试和统计）

- [ ]* 3.5 为涌现事件生成器编写单元测试
  - 测试模板匹配：给定状态能命中预期模板
  - 测试模板填充：变量替换结果正确
  - 测试回退逻辑：无匹配时正确回退到静态事件
  - 测试确定性：相同种子和状态下生成结果一致
  - 在 `app/logic/emergentEventGenerator.spec.ts` 中实现

- [ ] 3.6 检查点 - 确保涌现事件能正常触发、展示和结算

## 阶段 4：NPC 社交网络 (Week 7-8)

- [ ] 4.1 实现社交网络数据结构
  - 在 `app/logic/socialNetworkEngine.ts` 中实现 `createSocialNetwork()`
  - 初始化默认 NPC：班主任、修炼导师、催收员、黑市商人、同学（对手/盟友）
  - 实现 `NPC`、`Relationship`、`NpcAttitude` 类型
  - 参考 `design.md` Section 4

- [ ] 4.2 实现影响力传播与态度计算
  - 实现 `recordInteraction()`：记录玩家与 NPC 的交互
  - 实现 `propagateInfluence()`：2 跳内的影响力扩散，按关系强度衰减
  - 实现 `getNpcAttitude()`：获取 NPC 对玩家的综合态度
  - 实现 `checkThresholdEvents()`：检测 NPC 态度阈值 crossing，返回触发事件
  - 实现 `getRelationshipHints()`：根据玩家洞察值返回关系线索
  - 参考 `requirements.md` Requirement 4

- [ ] 4.3 将社交网络集成到游戏循环
  - 在 `useGame.ts` 的 `startNew()` 中初始化社交网络
  - 在事件结算时调用 `recordInteraction()` 更新 NPC 关系
  - 在 `randomPoolAfterAction()` 中查询 `checkThresholdEvents()` 获取 NPC 触发事件
  - 在日志中偶尔插入 NPC 态度变化的暗示文本

- [ ] 4.4 添加 NPC 关系 UI 面板
  - 创建 `app/components/game/SocialNetworkPanel.vue`
  - 展示玩家与各 NPC 的可见关系指标（好感度、信任度，隐藏变量不展示）
  - 展示已获得的关系线索（如"班主任与修炼导师似乎不和"）
  - 面板通过游戏内按钮或侧边栏入口打开

- [ ]* 4.5 为社交网络引擎编写单元测试
  - 测试影响力传播：A→B→C 的传播衰减计算正确
  - 测试阈值检测：态度 crossing 时正确触发事件
  - 测试线索生成：洞察值越高，返回线索越多
  - 在 `app/logic/socialNetworkEngine.spec.ts` 中实现

- [ ] 4.6 检查点 - 确保社交网络能正常初始化、传播和展示

## 阶段 5：隐藏变量系统与打磨 (Week 9-10)

- [ ] 5.1 实现隐藏变量核心系统
  - 在 `app/logic/hiddenVariableEngine.ts` 中实现隐藏变量管理
  - 定义四类隐藏变量：情绪残留、环境因素、NPC 态度、叙事动量
  - 实现隐藏变量对行动收益、事件概率、叙事文本的影响逻辑
  - 确保隐藏变量不直接暴露给 UI，仅通过结果偏差和文本变化体现
  - 参考 `requirements.md` Requirement 6

- [ ] 5.2 将隐藏变量集成到游戏主循环
  - 在 `useGame.ts` 中维护 `hiddenVariables` 状态
  - 在行动收益计算中应用 `hiddenModifiers.actionOutcomes`
  - 在事件概率计算中应用 `hiddenModifiers.eventProbabilities`
  - 在日志和事件文本中根据 `narrativeBias` 选择变体模板

- [ ] 5.3 实现人格画像汇总 UI
  - 创建 `app/components/game/PersonalityProfilePanel.vue`
  - 展示聚合后的人格画像（风险倾向、顺从倾向、资源策略等）
  - 不展示具体数值，使用描述性标签（如"你倾向于在压力下借贷"）
  - 提供导出/导入人格档案功能（JSON 格式）

- [ ] 5.4 性能优化与边界处理
  - 确保因果图预测 21 行动序列在 100ms 内完成
  - 确保社交网络传播在 50ms 内完成
  - 处理 localStorage 满时的优雅降级（仅内存模式）
  - 处理旧存档无 CEE 数据时的向后兼容（自动初始化默认值）

- [ ]* 5.5 编写集成测试
  - 测试完整会话流程：开始游戏 → 执行行动 → 结束会话 → 验证记忆持久化 → 新游戏验证记忆影响
  - 测试沙盘准确性：沙盘预测序列与实际执行结果对比
  - 测试事件生成质量：多种状态下涌现事件的上下文适配性
  - 在 `app/composables/useGame.spec.ts` 或独立集成测试文件中实现

- [ ] 5.6 最终检查点 - 确保所有系统协同工作，向后兼容，性能达标

## 附录：关键文件清单

| 文件路径 | 说明 |
|---------|------|
| `app/types/game.ts` | 扩展 CEE 相关类型 |
| `app/logic/emotionalMemoryLayer.ts` | 情绪记忆层核心逻辑 |
| `app/logic/causalGraphEngine.ts` | 因果图引擎 |
| `app/logic/emergentEventGenerator.ts` | 涌现事件生成器 |
| `app/logic/socialNetworkEngine.ts` | 社交网络引擎 |
| `app/logic/hiddenVariableEngine.ts` | 隐藏变量系统 |
| `app/composables/useEmotionalMemory.ts` | 情绪记忆组合式函数 |
| `app/components/game/DeductionSandbox.vue` | 推演沙盘 UI |
| `app/components/game/SocialNetworkPanel.vue` | 社交网络面板 UI |
| `app/components/game/PersonalityProfilePanel.vue` | 人格画像面板 UI |
| `data/eventTemplates.json` | 涌现事件模板库 |
