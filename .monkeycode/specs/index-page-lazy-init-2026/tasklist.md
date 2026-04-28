# 首页性能优化实施计划 - 延迟初始化 useGame()

## 问题背景

### 现象
1. 用户进入页面，存档区域展示前，其他区域已展示
2. 在存档区域出现前，点击「身份选择」按钮和「自定义角色」选项**无法触发效果**
3. 只有当存档区域出现后，交互才恢复正常

### 根本原因
`index.vue` 中 `useGame()` 的**同步阻塞初始化**：

```typescript
// index.vue:16 - 同步调用，阻塞主线程
const { game, startNew, reset, listSlots, ... } = useGame()
```

`useGame()` 调用链中的阻塞操作：
- `useGameStorage()` - 同步读取 `localStorage`
- `useGameEventResolver()` - 导入重型模块（`causalGraphEngine.ts` 610行、`emergentEventGenerator.ts` 353行）
- `useCausalGraph()` - 重复导入 `causalGraphEngine.ts`

### 技术原理
JavaScript 单线程执行模型下，同步初始化会阻塞 Vue 响应式系统和事件处理器，导致交互事件积压。存档区域出现后触发重新渲染，批量刷新了积压事件。

### 优化思路
1. **延迟初始化**：首页只加载必要组件，将重型逻辑延迟到 `onMounted` 或游戏页面
2. **分片执行**：使用 `requestIdleCallback` 分批执行初始化
3. **按需加载**：仅加载首页需要的 `listSlots`/`activeSlot` 等轻量功能

---

## 任务列表

- [ ] 1. 分析 useGame() 的依赖关系，识别首页必需的最小调用集
  - [ ] 1.1 检查 index.vue 实际使用的 useGame() 返回值
    - 分析 `game`, `startNew`, `reset`, `listSlots`, `loadFromSlot`, `saveToSlot`, `activeSlot` 各属性的使用位置
    - 确认哪些是首页真正需要的（`listSlots`, `activeSlot`, `saveToSlot`, `loadFromSlot`, `startNew`, `reset`）
    - 确认哪些是仅在游戏页面使用的（`act`, `borrow`, `repay`, `resolveEvent` 等）

  - [ ] 1.2 分析 useGameStorage() 的 localStorage 访问时机
    - 检查 `loadContainerFromDisk()` 的调用栈
    - 确认 `listSlots` 是否依赖立即读取的 localStorage 数据
    - 分析是否可以延迟到客户端 `onMounted` 后再读取

  - [ ] 1.3 评估 useGameEventResolver() 的重型导入是否影响首页
    - 检查 `useGameEventResolver` 在首页是否有实际使用
    - 确认是否可以将其延迟到游戏页面加载

- [ ] 2. 实现 useGame 的分层初始化
  - [ ] 2.1 抽取 useGameStorage 为独立 composable
    - 将 `listSlots`, `activeSlot`, `saveToSlot`, `loadFromSlot`, `reset` 抽取为 `useGameStorage()` 独立模块
    - 确保 `useGameStorage` 可以单独初始化，不依赖重型模块
    - 保持现有 `useGame()` API 兼容

  - [ ] 2.2 创建 useGameLite() 轻量版本
    - 新建 `useGameLite()` composable，仅包含首页需要的返回值
    - 仅导入 `useGameStorage` 和基础 `useGameState`
    - 不导入 `useGameEventResolver`、`useCausalGraph` 等重型模块

  - [ ] 2.3 修改 index.vue 使用 useGameLite()
    - 将 `const { ... } = useGame()` 替换为 `const { ... } = useGameLite()`
    - 确保 `listSlots`, `activeSlot`, `saveToSlot`, `loadFromSlot`, `startNew`, `reset`, `game` 返回值不变

- [ ] 3. 实现重型模块的延迟加载
  - [ ] 3.1 使用 requestIdleCallback 延迟加载重型模块
    - 在 `useGameEventResolver.ts` 中使用动态 import 延迟导入重型模块
    - 使用 `requestIdleCallback` 在浏览器空闲时完成初始化
    - 参考问题描述中的"添加 requestIdleCallback 预加载重型模块"优化

  - [ ] 3.2 确保 useGame() 完整版在游戏页面正常加载
    - 确保 `game.vue` 中的 `useGame()` 调用不受影响
    - 验证重型模块在游戏页面可以正常同步使用

  - [ ] 3.3 添加加载状态提示（可选）
    - 如果延迟加载时间较长，显示友好的加载提示
    - 避免用户看到无响应的界面

- [ ] 4. 验证优化效果
  - [ ] 4.1 测试首页渲染性能
    - 启动开发服务器 `npm run dev`
    - 检查控制台是否有模块加载警告
    - 测量首页渲染到可交互的时间

  - [ ] 4.2 测试身份选择按钮响应
    - 验证点击身份选择按钮能立即响应
    - 验证自定义角色选项能正常工作

  - [ ] 4.3 测试存档功能正常
    - 验证存档列表正确显示
    - 验证新建游戏和加载游戏流程正常

  - [ ] 4.4 测试游戏页面功能
    - 验证进入游戏页面后所有功能正常
    - 验证 act(), borrow(), repay() 等功能正常

  - [ ] 4.5 运行测试套件确保无回归
    - 执行 `npm test` 确保所有 489 个测试通过

- [ ] 5. 检查点
  - 确保所有测试通过,如有疑问请询问用户
