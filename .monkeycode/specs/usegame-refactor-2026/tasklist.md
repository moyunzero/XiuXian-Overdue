# useGame.ts 重构实施计划

## Phase 1: 拆分 useGameComputed

- [x] 1.1 创建 `app/composables/useGameComputed.ts`
  - 定义 `useGameComputed` 函数，接收 `game: Ref<GameState>` 参数
  - 迁移 `totalDebt` 计算属性
  - 迁移 `minPayment` 计算属性
  - 迁移 `accumulatedMinPayment` 计算属性
  - 迁移 `creditLimit` 计算属性
  - 迁移 `nextLabel` 计算属性
  - 迁移 `remainingSlots` 计算属性
  - 迁移 `profileSnapshot` 计算属性
  - 迁移 `prevProfile` 计算属性
  - 迁移 `profileDigest` 计算属性
  - 迁移 `classPressureDigest` 计算属性
  - 迁移 `refreshProfileSnapshot` 函数

- [x] 1.2 创建 `app/composables/useGameComputed.spec.ts`
  - [x] 1.2.1 编写 totalDebt 计算正确性测试
  - [x] 1.2.2 编写 profileDigest 生成测试
  - [x] 1.2.3 编写 creditLimit 边界测试

- [x] 1.3 更新 `useGame.ts` 导入和使用
  - 删除已迁移的计算属性代码
  - 导入新的 `useGameComputed`
  - 验证 `npm test` 通过

## Phase 2: 拆分 useEmotionalMemoryStorage

- [x] 2.1 创建 `app/composables/useEmotionalMemoryStorage.ts`
  - 迁移 `loadEmotionalMemory` 函数
  - 迁移 `saveEmotionalMemory` 函数
  - 迁移 `recordCurrentSession` 函数
  - 迁移 `sessionStartDay`, `sessionStartTime`, `sessionAntiProfileStreakMax` 状态变量

- [x] 2.2 创建 `app/composables/useEmotionalMemoryStorage.spec.ts`
  - [x] 2.2.1 编写 localStorage 读写测试
  - [x] 2.2.2 编写 session 记录测试

- [x] 2.3 更新 `useGame.ts` 导入和使用
  - 删除已迁移的情感记忆代码
  - 导入新的 `useEmotionalMemoryStorage`
  - 验证 `npm test` 通过

## Phase 3: 拆分 useGameEconomyActions

- [ ] 3.1 创建 `app/composables/useGameEconomyActions.ts`
  - 创建函数，接收 `game`, `computed`, `storage` 依赖
  - 迁移 `borrow` 函数（含日志逻辑）
  - 迁移 `repay` 函数（含债务锁定检查、日志逻辑）

- [ ] 3.2 创建 `app/composables/useGameEconomyActions.spec.ts`
  - [ ] 3.2.1 编写借贷边界测试（额度不足、负数）
  - [ ] 3.2.2 编写还款边界测试（余额不足、债务锁定）
  - [ ] 3.2.3 编写逾期等级变化测试

- [ ] 3.3 更新 `useGame.ts` 导入和使用
  - 删除已迁移的 borrow/repay 代码
  - 导入新的 `useGameEconomyActions`
  - 验证 `npm test` 通过

## Phase 4: 拆分 useGameEventResolver

- [ ] 4.1 创建 `app/composables/useGameEventResolver.ts`
  - 创建函数，接收 `game`, `engine`, `storage`, `socialNetwork` 依赖
  - 迁移 `resolveEvent` 函数（包含所有事件选项处理分支）
  - 迁移 `applyEventEffects` 函数
  - 迁移 `randomPoolAfterAction` 函数
  - 迁移 `computeHiddenContributions` 函数

- [ ] 4.2 创建 `app/composables/useGameEventResolver.spec.ts`
  - [ ] 4.2.1 编写身体部位还款选项测试
  - [ ] 4.2.2 编写契约反噬选项测试
  - [ ] 4.2.3 编写随机事件池触发测试
  - [ ] 4.2.4 编写涌现事件生成集成测试

- [ ] 4.3 更新 `useGame.ts` 导入和使用
  - 删除已迁移的事件处理代码（约180行）
  - 导入新的 `useGameEventResolver`
  - 验证 `npm test` 通过

## Phase 5: 拆分 useGameActionExecutor

- [ ] 5.1 创建 `app/composables/useGameActionExecutor.ts`
  - 创建函数，接收所有必要依赖
  - 迁移 `act` 函数（约175行）
  - 保持 `act` 函数内部结构，仅移动位置

- [ ] 5.2 创建 `app/composables/useGameActionExecutor.spec.ts`
  - [ ] 5.2.1 编写行动阻塞测试（pendingEvent 存在时）
  - [ ] 5.2.2 编写契约触发测试
  - [ ] 5.2.3 编写时段推进测试
  - [ ] 5.2.4 编写行动统计更新测试

- [ ] 5.3 更新 `useGame.ts` 导入和使用
  - 删除已迁移的 act 代码
  - 导入新的 `useGameActionExecutor`
  - 验证 `npm test` 通过

## Phase 6: useGame.ts 最终清理

- [ ] 6.1 清理 `useGame.ts`
  - 删除所有已迁移的代码
  - 保留：UI状态、组合式调用、return 语句
  - 验证文件行数减少到 ~200 行

- [ ] 6.2 运行完整测试套件
  - 执行 `npm test` 确保全部通过
  - 检查测试覆盖率无显著下降

- [ ] 6.3 手动功能测试
  - 启动开发服务器
  - 测试完整游戏流程：开局 → 行动 → 事件 → 日终
  - 测试存档保存和加载
  - 测试借贷还款流程
  - 测试身体偿还流程

- [ ] 6.4 更新架构文档
  - 更新 `docs/ARCHITECTURE.md` 的组件图
  - 添加新模块到 `app/composables/` 说明

## 检查点

- [ ] Phase 1 检查点：确保 useGameComputed 测试通过
- [ ] Phase 2 检查点：确保 useEmotionalMemoryStorage 测试通过
- [ ] Phase 3 检查点：确保 useGameEconomyActions 测试通过
- [ ] Phase 4 检查点：确保 useGameEventResolver 测试通过
- [ ] Phase 5 检查点：确保 useGameActionExecutor 测试通过
- [ ] Phase 6 检查点：确保所有测试通过，手动测试完成