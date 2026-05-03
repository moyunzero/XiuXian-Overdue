# 动态事件引擎技术设计

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         客户端 (Nuxt 3)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  静态事件池   │    │  预置种子库   │    │   IndexedDB 动态池    │  │
│  │ events.json  │    │ seed-events  │    │  dynamicEventPool    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘  │
│         │                   │                        │              │
│         └───────────────────┼────────────────────────┘              │
│                             ▼                                       │
│                  ┌─────────────────────┐                            │
│                  │  事件合并与选择管线   │                            │
│                  │  EventSelectionPipe  │                            │
│                  └──────────┬──────────┘                            │
│                             │                                       │
│         ┌───────────────────┼───────────────────┐                  │
│         ▼                   ▼                   ▼                  │
│  ┌─────────────┐   ┌─────────────┐   ┌────────────────────┐       │
│  │ 触发条件过滤 │   │ 画像权重调整 │   │  全局去重 & 冷却    │       │
│  └─────────────┘   └─────────────┘   └────────────────────┘       │
│                             │                                       │
│                             ▼                                       │
│                  ┌─────────────────────┐                            │
│                  │    加权随机选择      │                            │
│                  └──────────┬──────────┘                            │
│                             │                                       │
│                             ▼                                       │
│                  ┌─────────────────────┐                            │
│                  │   PendingEvent 展示  │                            │
│                  └─────────────────────┘                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              后台 AI 生成管线 (requestIdleCallback)           │   │
│  │                                                             │   │
│  │  上下文提取 → Prompt 构建 → Edge Function 调用 → 校验 → 入库 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Vercel Edge Function                             │
│                                                                     │
│  /api/generate-events                                               │
│  接收: { profile, gameState, recentEvents }                         │
│  调用: Groq/Qwen API                                                │
│  返回: EventDefinition[]                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## 组件设计

### 1. IndexedDB 动态事件池 (`useDynamicEventPool`)

**文件位置**: `app/composables/useDynamicEventPool.ts`

**职责**:
- 管理 IndexedDB 的连接、读写操作
- 提供事件的增删改查接口
- 实现 LRU 淘汰策略
- 种子库导入逻辑

**数据结构**:
```typescript
interface DynamicEventRecord {
  id: string              // 事件唯一 ID
  event: EventDefinition  // 完整事件定义
  source: 'seed' | 'ai'   // 来源标记
  createdAt: number       // 创建时间戳
  lastTriggeredAt?: number // 最后触发时间
  triggerCount: number    // 累计触发次数
}
```

**数据库 Schema**:
```typescript
const DB_NAME = 'xiuxian-events-db'
const DB_VERSION = 1
const STORE_NAME = 'dynamic-events'

// IndexedDB 对象存储
{
  keyPath: 'id',
  indexes: [
    { name: 'source', keyPath: 'source' },
    { name: 'createdAt', keyPath: 'createdAt' },
    { name: 'lastTriggeredAt', keyPath: 'lastTriggeredAt' },
    { name: 'family', keyPath: 'event.family' }
  ]
}
```

**核心接口**:
```typescript
interface UseDynamicEventPool {
  // 初始化数据库
  init(): Promise<void>
  
  // 批量导入种子库事件
  importSeedEvents(events: EventDefinition[]): Promise<number>
  
  // 批量导入 AI 生成的事件
  insertAiEvents(events: EventDefinition[]): Promise<number>
  
  // 获取所有有效事件
  getAllEvents(): Promise<EventDefinition[]>
  
  // 更新事件触发记录
  recordEventTrigger(eventId: string, day: number): Promise<void>
  
  // 获取事件总数
  getEventCount(): Promise<number>
  
  // 清理过期事件 (LRU)
  evictOldEvents(maxCount: number): Promise<void>
  
  // 检查是否已导入种子库
  isSeedImported(): Promise<boolean>
}
```

### 2. 事件选择管线 (`EventSelectionPipeline`)

**文件位置**: `app/logic/eventSelectionPipeline.ts`

**职责**:
- 合并静态池、种子库、动态池的事件
- 执行多级过滤（触发条件、冷却、去重）
- 应用画像权重调整
- 执行加权随机选择

**管线流程**:
```typescript
function selectEvent(
  gameState: GameState,
  profile: PersonalityProfile,
  phase: EventPhase,
  rand: () => number
): PendingEvent | null {
  // Step 1: 合并候选池
  const candidates = mergeEventPools(gameState)
  
  // Step 2: 触发条件过滤
  const triggerFiltered = filterByTrigger(candidates, gameState)
  
  // Step 3: 冷却过滤
  const cooldownFiltered = filterByCooldown(triggerFiltered, gameState)
  
  // Step 4: 全局去重降权
  const diversityAdjusted = applyDiversityAdjustment(cooldownFiltered, gameState)
  
  // Step 5: 画像权重调整
  const profileAdjusted = applyProfileAdjustment(diversityAdjusted, profile)
  
  // Step 6: 加权随机选择
  return pickWeightedEvent(profileAdjusted, rand)
}
```

**权重计算逻辑**:
```typescript
function calculateEventWeight(
  event: EventDefinition,
  profile: PersonalityProfile,
  gameState: GameState
): number {
  let weight = event.weight ?? 1
  
  // 画像匹配加成
  const profileMatchScore = calculateProfileMatchScore(event, profile)
  weight *= (0.5 + profileMatchScore * 1.0)  // 范围 0.5x ~ 1.5x
  
  // 全局去重降权
  const daysSinceLastTrigger = getDaysSinceLastTrigger(event, gameState)
  if (daysSinceLastTrigger < 7) {
    weight *= 0.5  // 7 天内触发过的事件降权 50%
  }
  
  return Math.max(0, weight)
}
```

### 3. 用户画像构建器 (`useBehaviorProfile`)

**文件位置**: `app/composables/useBehaviorProfile.ts`

**职责**:
- 分析用户历史行为数据
- 计算各维度画像等级
- 生成行为标签

**画像维度**:
```typescript
interface BehaviorProfile {
  // 财务风险等级
  financialRisk: 'low' | 'medium' | 'high' | 'extreme'
  
  // 教育信用等级
  educationCredit: 'excellent' | 'good' | 'fair' | 'poor'
  
  // 制度顺从等级
  compliance: 'rebel' | 'neutral' | 'compliant' | 'domesticated'
  
  // 身体资产等级
  bodyAsset: 'intact' | 'partial' | 'severe'
  
  // 行为标签（可多选）
  tags: ProfileTagId[]
}

type ProfileTagId = 
  | 'workaholic'        // 打工党
  | 'cultivator'        // 修仙党
  | 'defaulter'         // 违约惯犯
  | 'good_student'      // 模范学生
  | 'rebel'             // 反抗者
  | 'contract_slave'    // 契约奴隶
  | 'body_seller'       // 身体出卖者
```

**标签计算规则**:
```typescript
function calculateBehaviorProfile(gameState: GameState): BehaviorProfile {
  const history = gameState.eventHistory ?? {}
  const metrics = gameState.sessionMetrics ?? {}
  
  // 打工党：parttime 行动占比 > 40%
  const parttimeRatio = calculateActionRatio('parttime', history)
  const isWorkaholic = parttimeRatio > 0.4
  
  // 修仙党：study + tuna 行动占比 > 60%
  const cultivateRatio = calculateActionRatio(['study', 'tuna'], history)
  const isCultivator = cultivateRatio > 0.6
  
  // 违约惯犯：delinquency 等级经常 >= 2
  const isDefaulter = calculateDelinquencyFrequency(history) > 0.3
  
  // ... 其他标签计算
  
  return {
    financialRisk: calculateFinancialRisk(gameState.econ),
    educationCredit: calculateEducationCredit(gameState.school),
    compliance: calculateComplianceLevel(history),
    bodyAsset: calculateBodyAssetLevel(gameState),
    tags: [
      isWorkaholic && 'workaholic',
      isCultivator && 'cultivator',
      isDefaulter && 'defaulter',
      // ... 过滤 undefined
    ].filter(Boolean) as ProfileTagId[]
  }
}
```

### 4. AI 生成客户端 (`useAiEventGenerator`)

**文件位置**: `app/composables/useAiEventGenerator.ts`

**职责**:
- 提取游戏上下文
- 构建 AI Prompt
- 调用 Edge Function API
- 校验并入库生成的事件

**核心流程**:
```typescript
let generationTimer: ReturnType<typeof setInterval> | null = null
let actionCount = 0

function onActionCompleted() {
  actionCount++
  
  // 第 5 次行动后首次触发
  if (actionCount === 5 && !generationTimer) {
    startBackgroundGeneration()
  }
}

function startBackgroundGeneration() {
  // 立即触发一次
  triggerGeneration()
  
  // 启动定时器，每 10 分钟检查并触发一次
  generationTimer = setInterval(() => {
    triggerGeneration()
  }, 10 * 60 * 1000)
}

async function triggerGeneration() {
  if (!shouldTriggerGeneration()) return
  
  const context = extractGenerationContext()
  
  // 使用 requestIdleCallback 确保不阻塞主线程
  requestIdleCallback(async () => {
    try {
      const response = await fetch('/api/generate-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      })
      
      if (!response.ok) throw new Error('Generation failed')
      
      const events: EventDefinition[] = await response.json()
      const validEvents = events.filter(validateEventDefinition)
      const balancedEvents = validEvents.map(applyNumericalConstraints)
      
      await useDynamicEventPool().insertAiEvents(balancedEvents)
      
    } catch (error) {
      console.warn('AI event generation failed:', error)
    }
  })
}
```

**Prompt 构建示例**:
```typescript
function buildGenerationPrompt(context: GenerationContext): string {
  return `
你是一个赛博朋克修仙世界的事件设计师。请根据以下玩家画像生成 5-8 个个性化事件。

玩家画像：
- 行为标签：${context.profile.tags.join(', ')}
- 财务风险：${context.profile.financialRisk}
- 制度顺从：${context.profile.compliance}
- 当前压力值：${context.stressLevel}
- 债务总额：${context.totalDebt}

近期已触发事件（避免重复）：
${context.recentEvents.map(e => `- ${e.family}: ${e.title}`).join('\n')}

要求：
1. 事件必须符合"修仙欠费中"的世界观：压抑、讽刺、现实主义
2. 事件类型应覆盖：催收、打工诱惑、修仙挫折、制度压迫等
3. 数值必须合理：cash delta 不超过 5000，stat delta 不超过 ±20
4. 输出格式为 JSON 数组，符合 EventDefinition 类型

请生成事件 JSON：
`
}
```

### 5. Vercel Edge Function (`/api/generate-events`)

**文件位置**: `app/api/generate-events.ts`

**职责**:
- 接收客户端上下文
- 调用 AI API (Groq/Qwen)
- 返回格式化的事件 JSON

**实现逻辑**:
```typescript
import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const context = await readBody(event)
  
  // 构建 Prompt
  const prompt = buildPrompt(context)
  
  // 调用 AI API
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 4000
    })
  })
  
  const aiResponse = await response.json()
  const content = aiResponse.choices[0].message.content
  
  // 解析 JSON
  try {
    const events = JSON.parse(extractJsonFromMarkdown(content))
    return events
  } catch {
    throw new Error('Invalid AI response format')
  }
})
```

## 数据流

### 游戏启动流程
```
1. 初始化 IndexedDB (useDynamicEventPool.init())
2. 检查种子库是否已导入
   - 否：从 /seed-events.json 加载并导入
   - 是：跳过
3. 加载静态事件池 (events.json)
4. 合并事件池，准备游戏
```

### 事件选择流程
```
1. 玩家执行行动
2. 触发 randomPoolAfterAction()
3. 调用 EventSelectionPipeline.selectEvent()
   a. 合并静态池 + 动态池
   b. 触发条件过滤
   c. 冷却过滤
   d. 画像权重调整
   e. 全局去重降权
   f. 加权随机选择
4. 返回 PendingEvent 展示
5. 记录事件触发历史
```

### AI 生成流程
```
1. 玩家执行行动，行动计数器 +1
2. 第 5 次行动后，触发首次 AI 生成
3. 启动后台定时器（每 10 分钟检查一次）
4. 每次触发时：
   a. 检查生成条件（动态池数量、重复率）
   b. requestIdleCallback 调度
   c. 提取游戏上下文
   d. POST /api/generate-events
   e. 接收事件数组
   f. Schema 验证 + 数值约束
   g. 插入 IndexedDB 动态池
5. 下次事件选择时自动纳入候选
```
4. POST /api/generate-events
5. 接收事件数组
6. Schema 验证 + 数值约束
7. 插入 IndexedDB 动态池
8. 下次事件选择时自动纳入候选
```

## 错误处理

### 降级策略
| 故障场景 | 降级行为 |
|---------|---------|
| IndexedDB 不可用 | 仅使用静态事件池 |
| AI API 调用失败 | 静默失败，下次空闲时重试 |
| 种子库加载失败 | 仅使用静态事件池，记录警告 |
| 事件校验失败 | 丢弃无效事件，记录错误日志 |
| 动态池满 (50MB) | LRU 淘汰最旧 20% 事件 |

### 校验规则
```typescript
function validateEventDefinition(event: unknown): event is EventDefinition {
  if (typeof event !== 'object' || event === null) return false
  
  const e = event as Record<string, unknown>
  
  // 必需字段
  if (typeof e.id !== 'string') return false
  if (typeof e.title !== 'string') return false
  if (typeof e.body !== 'string') return false
  if (!Array.isArray(e.options)) return false
  
  // 选项校验
  for (const opt of e.options) {
    if (typeof opt.id !== 'string') return false
    if (typeof opt.label !== 'string') return false
    if (!Array.isArray(opt.effects)) return false
    
    // effects 校验
    for (const effect of opt.effects) {
      if (!validateEffect(effect)) return false
    }
  }
  
  return true
}
```

## 测试策略

### 单元测试
- `useDynamicEventPool.spec.ts`: IndexedDB 操作模拟测试
- `eventSelectionPipeline.spec.ts`: 管线各级过滤逻辑测试
- `useBehaviorProfile.spec.ts`: 画像计算逻辑测试
- `eventValidation.spec.ts`: Schema 验证测试

### 属性测试
- 事件选择管线：任意游戏状态下，选择的事件必须通过触发条件
- 画像权重：匹配度高的事件权重必须高于不匹配的
- 去重机制：7 天内同 family 事件不得重复选择

### 集成测试
- 种子库导入 → 事件选择 → AI 生成 → 入库 → 再次选择 完整流程

## 性能优化

1. **IndexedDB 异步操作**：所有 DB 操作不阻塞主线程
2. **事件池缓存**：启动时加载到内存，避免频繁读取 DB
3. **requestIdleCallback**：AI 生成仅在浏览器空闲时执行
4. **批量操作**：种子库导入使用批量插入事务
5. **索引优化**：为常用查询字段创建 IndexedDB 索引
