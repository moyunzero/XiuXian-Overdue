# useGame.ts 重构技术设计

## 1. 架构设计

### 1.1 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         useGame.ts                              │
│                      (协调层, ~200行)                            │
│  - 组合各模块                                                   │
│  - 暴露统一API                                                  │
│  - 管理UI状态                                                   │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│useGameComputed    │useGameEconomy │useGameEvent  │useGameAction
│  (~80行)   │  │  Actions    │  │  Resolver   │  │ Executor    │
│            │  │  (~100行)    │  │  (~200行)    │  │  (~180行)    │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
                        │              │              │
                        ▼              ▼              ▼
                  ┌─────────────────────────────────────────┐
                  │              gameEngine.ts                │
                  │           (纯函数, 1200+行)               │
                  └─────────────────────────────────────────┘
```

### 1.2 模块职责定义

#### useGameComputed.ts
```typescript
// 职责：所有计算属性
export function useGameComputed(game: Ref<GameState>) {
  // totalDebt - 总债务
  // minPayment - 最低周还款
  // accumulatedMinPayment - 累积最低还款
  // creditLimit - 信用额度
  // nextLabel - 当前时段标签
  // remainingSlots - 剩余时段数
  // profileSnapshot - 画像快照
  // profileDigest - 画像摘要
  // classPressureDigest - 班级压力摘要
}
```

#### useEmotionalMemoryStorage.ts
```typescript
// 职责：情感记忆的持久化
export function useEmotionalMemoryStorage() {
  // loadEmotionalMemory()
  // saveEmotionalMemory(memory)
  // recordCurrentSession(game, sessionStartDay, ...)
}
```

#### useGameEconomyActions.ts
```typescript
// 职责：经济相关操作
export function useGameEconomyActions(
  game: Ref<GameState>,
  computed: ReturnType<typeof useGameComputed>,
  storage: ReturnType<typeof useGameStorage>
) {
  // borrow(amount) - 借贷
  // repay(amount) - 还款
}
```

#### useGameEventResolver.ts
```typescript
// 职责：事件处理
export function useGameEventResolver(
  game: Ref<GameState>,
  engine: typeof Engine,
  storage: ReturnType<typeof useGameStorage>,
  socialNetwork: Ref<SocialNetwork>
) {
  // resolveEvent(optionId) - 处理事件选项
  // applyEventEffects(g, effects, opts) - 应用事件效果
  // randomPoolAfterAction(g, rand) - 随机事件池
}
```

#### useGameActionExecutor.ts
```typescript
// 职责：核心行动执行
export function useGameActionExecutor(
  game: Ref<GameState>,
  engine: typeof Engine,
  computed: ReturnType<typeof useGameComputed>,
  economyActions: ReturnType<typeof useGameEconomyActions>,
  eventResolver: ReturnType<typeof useGameEventResolver>,
  dayCycle: typeof useGameDayCycle
) {
  // act(action: ActionId) - 执行行动
}
```

## 2. 重构顺序

### Phase 1: useGameComputed
**目标**：先拆最简单的，建立模式

1. 创建 `useGameComputed.ts`
2. 从 `useGame.ts` 移动计算属性到新文件
3. 验证测试通过

### Phase 2: useEmotionalMemoryStorage
**目标**：分离持久化逻辑

1. 创建 `useEmotionalMemoryStorage.ts`
2. 移动 `loadEmotionalMemory`, `saveEmotionalMemory`, `recordCurrentSession`
3. 验证测试通过

### Phase 3: useGameEconomyActions
**目标**：分离经济操作

1. 创建 `useGameEconomyActions.ts`
2. 移动 `borrow`, `repay` 到新文件
3. 验证测试通过

### Phase 4: useGameEventResolver
**目标**：拆分最臃肿的模块

1. 创建 `useGameEventResolver.ts`
2. 移动 `resolveEvent`, `applyEventEffects`, `randomPoolAfterAction`
3. 验证测试通过

### Phase 5: useGameActionExecutor
**目标**：拆分第二大模块

1. 创建 `useGameActionExecutor.ts`
2. 移动 `act` 到新文件
3. 验证测试通过

### Phase 6: useGame.ts 清理
**目标**：成为真正的协调层

1. 删除已迁移的代码
2. 组合各模块
3. 验证完整测试通过

## 3. 接口设计

### 3.1 useGame() 返回值（保持不变）

```typescript
export function useGame() {
  return {
    game,
    activeSlot,
    saveToSlot,
    loadFromSlot,
    listSlots,
    reset,
    startNew,
    totalDebt,
    minPayment,
    accumulatedMinPayment,
    classPressureDigest,
    creditLimit,
    nextLabel,
    remainingSlots,
    act,
    borrow,
    repay,
    resolveEvent,
    summaryPanelOpen,
    openSummaryPanel,
    acknowledgeSummaryAndContinue,
    closeSummaryPanelWithoutMarking,
    profileSnapshot,
    profileDigest
  }
}
```

### 3.2 内部模块接口（新增）

每个新模块返回必要的状态和方法，供 useGame.ts 组合。

## 4. 数据流设计

### 4.1 行动执行流程（重构后）

```
act(action)
  │
  ├─► useGameActionExecutor
  │     │
  │     ├─► 更新 game.stats (委托给 gameEngine)
  │     │
  │     ├─► 更新 game.econ (委托给 useGameEconomyActions)
  │     │
  │     ├─► 更新 game.contract (委托给 gameEngine)
  │     │
  │     ├─► 记录因果图 (useCausalGraph)
  │     │
  │     ├─► 事件判定 (useGameEventResolver.randomPoolAfterAction)
  │     │
  │     └─► 日终处理 (useGameDayCycle)
  │
  └─► 保存存档 (useGameStorage)
```

## 5. 错误处理策略

### 5.1 各模块错误边界

- **useGameComputed**: 无副作用，纯计算，错误向上传播
- **useEmotionalMemoryStorage**: 吞掉 localStorage 错误，保证游戏继续
- **useGameEconomyActions**: 返回失败结果，由调用方处理日志
- **useGameEventResolver**: 不抛异常，异常结果写入 logs
- **useGameActionExecutor**: 不抛异常，所有结果通过 game 状态体现

### 5.2 回滚策略

每个 phase 完成时，如果测试失败：
1. 保留备份：`git checkout useGame.ts@prev-phase`
2. 定位问题
3. 修复后重试

## 6. 测试策略

### 6.1 现有测试保持

- 不修改现有测试文件
- 拆分后运行相同测试套件

### 6.2 新增测试

| 模块 | 测试文件 | 覆盖目标 |
|------|---------|---------|
| useGameComputed | useGameComputed.spec.ts | 计算属性正确性 |
| useGameEconomyActions | useGameEconomyActions.spec.ts | 借贷还款边界 |
| useGameEventResolver | useGameEventResolver.spec.ts | 事件选项效果 |
| useGameActionExecutor | useGameActionExecutor.spec.ts | 行动流程完整性 |

## 7. 文件清单

### 7.1 新增文件

```
app/composables/
  ├── useGameComputed.ts           # 新增
  ├── useEmotionalMemoryStorage.ts # 新增
  ├── useGameEconomyActions.ts     # 新增
  ├── useGameEventResolver.ts      # 新增
  └── useGameActionExecutor.ts     # 新增
```

### 7.2 修改文件

```
app/composables/
  └── useGame.ts                   # 重构后精简
```

### 7.3 测试文件

```
app/composables/
  ├── useGameComputed.spec.ts           # 新增
  ├── useGameEconomyActions.spec.ts     # 新增
  ├── useGameEventResolver.spec.ts      # 新增
  └── useGameActionExecutor.spec.ts     # 新增
```

## 8. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 循环依赖 | 重构失败 | 遵循依赖方向：useGame → 子模块 → gameEngine |
| 类型丢失 | 运行时错误 | 保持 TypeScript 严格模式，每个模块单独编译检查 |
| 性能退化 | 用户体验下降 | 每阶段基准测试，对比重构前后 |
| 测试覆盖盲区 | 隐藏 bug | 保留现有集成测试，新增单元测试 |
