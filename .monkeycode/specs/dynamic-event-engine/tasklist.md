# 需求实施计划

- [ ] 1. 创建 IndexedDB 动态事件池基础设施
   - 在 `app/composables/` 下创建 `useDynamicEventPool.ts`
   - 实现 IndexedDB 初始化、连接管理、错误处理
   - 定义数据库 Schema（对象存储、索引）
   - 实现事件 CRUD 操作接口（insert、getAll、recordTrigger、evict）
   - 实现 LRU 淘汰策略（达到 50MB 上限时清理最旧 20% 事件）

- [ ] 2. 实现预置种子库与导入逻辑
  - [ ] 2.1 创建种子库数据文件
    - 在 `public/seed-events.json` 创建包含 200+ 高质量事件的文件
    - 事件内容需符合"赛博朋克修仙"世界观，参考真实社会新闻、小说情节改编
    - 覆盖所有 event family（催收、推销、零工、社交、试功、法赛、健康、特殊）
    - 确保数值平衡（cash delta ≤ 5000, stat delta ≤ ±20, debt delta ≤ 总债务 30%）

  - [ ] 2.2 实现种子库导入逻辑
    - 在 `useDynamicEventPool` 中实现 `importSeedEvents()` 方法
    - 实现 `isSeedImported()` 检查，避免重复导入
    - 游戏启动时自动检查并导入种子库（若未导入）
    - 导入过程使用批量事务，确保性能

  - [ ] 2.3 为种子库导入编写单元测试
    - 测试导入成功路径
    - 测试重复导入防护
    - 测试种子库事件 schema 验证
    - 测试批量导入性能

- [ ] 3. 实现用户画像构建器
   - 在 `app/composables/` 下创建 `useBehaviorProfile.ts`
   - 实现行为标签计算逻辑（打工党、修仙党、违约惯犯、模范学生等）
   - 实现财务风险等级计算（基于 cash、debt、delinquency）
   - 实现教育信用等级计算（基于 classTier、examScore）
   - 实现制度顺从等级计算（基于事件历史中的选择倾向）
   - 实现身体资产等级计算（基于 bodyIntegrity、bodyPartRepayment）
   - 提供 `calculateBehaviorProfile(gameState): BehaviorProfile` 接口

- [ ] 4. 实现事件选择管线
  - [ ] 4.1 创建事件合并与过滤逻辑
    - 在 `app/logic/` 下创建 `eventSelectionPipeline.ts`
    - 实现 `mergeEventPools()` 合并静态池、种子库、动态池
    - 实现 `filterByTrigger()` 触发条件过滤（复用 Engine.eventMatchesTrigger）
    - 实现 `filterByCooldown()` 冷却过滤（复用 Engine.isEventOnCooldown + isFamilyOnCooldown）

  - [ ] 4.2 实现画像权重调整算法
    - 实现 `calculateProfileMatchScore()` 计算事件与画像的匹配度
    - 匹配度高（标签/等级匹配）的事件权重 × 1.5
    - 匹配度低的事件权重 × 0.7
    - 权重计算需考虑所有画像维度（标签、财务风险、顺从等级等）

  - [ ] 4.3 实现全局去重降权机制
    - 维护最近 14 天的事件触发历史记录
    - 7 天内触发过的事件权重降低 50%
    - 同 family 事件严格遵循现有冷却逻辑（7 天互斥）

  - [ ] 4.4 实现加权随机选择
    - 复用 `Engine.pickWeightedEvent()` 或实现等效逻辑
    - 确保权重为 0 的事件不会被选中
    - 处理候选池为空的边界情况

  - [ ] 4.5 为事件选择管线编写单元测试
    - 测试各过滤阶段的输出正确性
    - 测试画像权重调整逻辑
    - 测试去重降权机制
    - 属性测试：任意状态下选中的事件必须通过触发条件

- [ ] 5. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请询问用户
  - 验证双层事件池合并选择逻辑正常工作
  - 验证画像权重调整生效（匹配事件触发率提升 ≥ 50%）
  - 验证全局去重机制生效（7 天内同 family 事件不重复）

- [ ] 6. 集成事件选择管线到游戏主循环
   - 修改 `useGameEventResolver.ts` 中的 `randomPoolAfterAction()` 方法
   - 替换原有事件选择逻辑为新的管线调用
   - 保持向后兼容：若动态池不可用，降级为仅使用静态池
   - 确保事件触发历史记录正确写入（`Engine.recordEventTrigger` + IndexedDB 记录）

- [ ] 7. 创建 Vercel Edge Function API
  - [ ] 7.1 实现 `/api/generate-events` 端点
    - 在 `app/api/` 下创建 `generate-events.ts`
    - 实现请求体解析（接收 profile、gameState、recentEvents）
    - 调用 AI API（Groq/Qwen）生成事件 JSON
    - 实现 Prompt 构建逻辑（基于上下文生成个性化 Prompt）
    - 实现响应解析与格式化

  - [ ] 7.2 配置环境变量与安全
    - 在 `.env` 中添加 `GROQ_API_KEY` 或等效 AI API 密钥
    - 实现 API 调用频率限制（客户端每 10 分钟最多 1 次）
    - 实现错误处理与降级（AI API 失败时返回空数组）

  - [ ] 7.3 为 Edge Function 编写集成测试
    - 测试正常请求响应
    - 测试 AI API 失败降级
    - 测试响应格式校验

- [ ] 8. 实现 AI 生成客户端逻辑
  - [ ] 8.1 创建 `useAiEventGenerator` composable
    - 在 `app/composables/` 下创建 `useAiEventGenerator.ts`
    - 实现 `shouldTriggerGeneration()` 触发条件检查
      - 玩家完成第 5 次行动后首次触发
      - 动态池事件数 < 50 时触发补充
      - 检测到事件重复率 > 30% 时触发
    - 实现 `extractGenerationContext()` 上下文提取
    - 实现 `buildGenerationPrompt()` Prompt 构建

  - [ ] 8.2 实现静默生成调度
    - 首次触发后，启动后台定时生成任务
    - 使用 `setInterval` 每 10 分钟检查并触发一次生成（需满足触发条件）
    - 使用 `requestIdleCallback` 确保生成请求不阻塞主线程
    - 实现 POST `/api/generate-events` 调用
    - 实现响应接收与解析

  - [ ] 8.3 实现事件校验与入库
    - 实现 `validateEventDefinition()` Schema 验证
    - 实现 `applyNumericalConstraints()` 数值平衡约束
    - 调用 `useDynamicEventPool().insertAiEvents()` 入库
    - 实现错误处理与静默失败降级

- [ ] 9. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有疑问请询问用户
  - 验证 Edge Function API 可正常调用并返回有效事件
  - 验证 AI 生成事件通过 Schema 验证并成功入库
  - 验证降级策略生效（AI 失败时游戏不崩溃）

- [ ] 10. 实现种子库事件内容创作
   - 创作 200+ 个高质量种子事件，覆盖以下主题：
     - **催收压迫类**（参考真实催收新闻：短信轰炸、上门威胁、社交羞辱）
     - **打工诱惑类**（参考零工经济报道：黑中介、克扣工资、过劳死）
     - **修仙挫折类**（参考教育内卷新闻：补习班陷阱、升学压力、资源垄断）
     - **制度压迫类**（参考社会信用体系、校园霸凌、权力滥用）
     - **身体偿还类**（参考器官买卖、医疗剥削新闻）
     - **社交关系类**（参考人际关系异化、朋友背叛、利益交换）
   - 确保事件文案风格统一：压抑、讽刺、现实主义
   - 确保数值平衡符合游戏经济系统
   - 使用 `npm run validate:events` 验证所有事件格式

- [ ] 11. 编写全量集成测试
   - 测试种子库导入 → 事件选择 → AI 生成 → 入库 → 再次选择 完整流程
   - 测试降级策略（IndexedDB 不可用、AI API 失败、种子库加载失败）
   - 属性测试：任意游戏状态下，事件选择管线必须在 10ms 内完成
   - 性能测试：IndexedDB 读写不阻塞主线程

- [ ] 12. 检查点 - 确保全量测试通过
  - 确保全量 530+ 测试用例通过
  - 验证种子库成功导入 IndexedDB，事件数量 ≥ 200
  - 验证双层事件池合并选择逻辑正常工作
  - 验证混合推荐算法生效，画像匹配事件触发率提升 ≥ 50%
  - 验证全局去重机制生效，7 天内同 family 事件不重复
  - 验证 Edge Function API 可正常调用并返回有效事件 JSON
  - 验证 Schema 验证拦截无效事件，错误事件不入库
  - 验证降级策略生效，AI 生成失败时游戏不崩溃
