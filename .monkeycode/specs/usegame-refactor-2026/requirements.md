# useGame.ts 重构需求

## 1. 问题背景

`app/composables/useGame.ts` (826行) 是游戏核心逻辑的单一入口，承担了过多职责：

| 职责类型 | 具体内容 | 行数占比 |
|---------|---------|---------|
| UI状态管理 | summaryPanelOpen, socialNetwork | ~2% |
| 计算属性 | totalDebt, profileDigest, classPressureDigest | ~6% |
| 情感记忆持久化 | load/save emotional memory | ~4% |
| 游戏初始化 | startNew | ~7% |
| 经济操作 | borrow, repay | ~12% |
| **事件处理** | resolveEvent, applyEventEffects, randomPoolAfterAction | **~33%** |
| **核心行动执行** | act | **~21%** |

## 2. 重构目标

### 2.1 单一职责原则

每个 composable 应该只负责一个明确的领域：
- 游戏状态管理 (`useGameState`) - **已有**
- 游戏核心逻辑编排 (`useGame`) - 保留为协调层
- 计算属性 (`useGameComputed`) - **新增**
- 情感记忆存储 (`useEmotionalMemoryStorage`) - **新增**
- 经济操作 (`useGameEconomyActions`) - **新增**
- 事件处理 (`useGameEventResolver`) - **新增**
- 行动执行 (`useGameActionExecutor`) - **新增**

### 2.2 可维护性

- 单个文件不超过 200 行
- 每个函数的圈复杂度不超过 10
- 职责边界清晰，跨模块调用链路可追踪

### 2.3 向后兼容

- 保持现有 API 不变 (`useGame()` 返回值结构不变)
- 现有测试继续通过
- 现有调用方（Vue组件）无需修改

## 3. 重构范围

### 3.1 不纳入重构的部分

- `useGameState.ts` - 已经是单一职责
- `useGameStorage.ts` - 已经是单一职责
- `useCausalGraph.ts` - 已经是单一职责
- `useGame.actions.ts` - 已经是单一职责
- `useGame.economy.ts` - 已经是单一职责
- `useGame.dayCycle.ts` - 已经是单一职责
- `useGame.events.ts` - 已经是单一职责
- `gameEngine.ts` - 纯函数模块，不直接操作状态

### 3.2 纳入重构的部分

从 `useGame.ts` 中拆分出：

| 新模块 | 职责 | 目标行数 |
|--------|------|---------|
| `useGameComputed.ts` | 计算属性：totalDebt, minPayment, profileDigest 等 | ~80 |
| `useEmotionalMemoryStorage.ts` | 情感记忆的加载/保存 | ~30 |
| `useGameEconomyActions.ts` | borrow, repay 操作 | ~100 |
| `useGameEventResolver.ts` | resolveEvent, applyEventEffects, randomPoolAfterAction | ~200 |
| `useGameActionExecutor.ts` | act 函数 | ~180 |

## 4. 成功标准

### 4.1 代码质量

- [ ] `useGame.ts` 从 826 行减少到 ~200 行
- [ ] 每个新模块单一职责明确
- [ ] 无循环依赖
- [ ] 保持 TypeScript 严格类型检查通过

### 4.2 功能验证

- [ ] 现有测试全部通过 (`npm test`)
- [ ] 手动游戏流程测试无异常
- [ ] 事件触发、选项选择、状态更新正常
- [ ] 存档和加载功能正常

### 4.3 性能

- [ ] 拆分后 bundle size 不显著增加
- [ ] 游戏操作响应时间无明显退化

## 5. 约束条件

- **渐进式重构**：每次只拆分一个模块，确保每步可回滚
- **向后兼容**：不改变 `useGame()` 的返回类型
- **测试先行**：每拆出模块，先确保对应测试通过
- **不停机发布**：重构不影响游戏功能，分阶段合并
