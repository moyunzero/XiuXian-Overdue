/**
 * AI 事件生成客户端逻辑
 * 负责提取游戏上下文、触发后台生成、校验并入库 AI 生成的事件
 *
 * 触发机制：
 * - 玩家完成第 5 次行动后首次触发
 * - 动态池事件数 < 50 时触发补充
 * - 检测到事件重复率 > 30% 时触发
 * - 之后每 10 分钟通过 setInterval 后台定时检查
 */
import type { EventDefinition, GameState } from '~/types/game'
import { useDynamicEventPool } from '~/composables/useDynamicEventPool'
import { calculateBehaviorProfile } from '~/composables/useBehaviorProfile'

/** 首次触发所需行动次数 */
const FIRST_TRIGGER_ACTION_COUNT = 5
/** 定时检查间隔（10 分钟） */
const GENERATION_INTERVAL_MS = 10 * 60 * 1000
/** 动态池事件数阈值 */
const MIN_DYNAMIC_EVENTS = 50
/** 事件重复率阈值 */
const MAX_REPEAT_RATE = 0.3
/** 重复率计算窗口（最近 14 天） */
const REPEAT_RATE_WINDOW_DAYS = 14

/** 生成调度状态 */
interface GenerationScheduler {
  timer: ReturnType<typeof setInterval> | null
  actionCount: number
  isRunning: boolean
  lastGenerationTime: number
  generationInProgress: boolean
}

let scheduler: GenerationScheduler | null = null

/**
 * 提取生成上下文
 */
function extractGenerationContext(gameState: GameState) {
  const profile = calculateBehaviorProfile(gameState)

  // 提取近期触发事件（用于避免重复）
  const recentEvents = extractRecentEvents(gameState)

  return {
    profile,
    gameState: {
      school: {
        day: gameState.school.day,
        classTier: gameState.school.classTier
      },
      econ: {
        cash: gameState.econ.cash,
        debtPrincipal: gameState.econ.debtPrincipal,
        delinquency: gameState.econ.delinquency
      },
      stats: {
        fatigue: gameState.stats.fatigue,
        focus: gameState.stats.focus,
        faLi: gameState.stats.faLi,
        rouTi: gameState.stats.rouTi
      }
    },
    recentEvents
  }
}

/**
 * 提取近期触发事件
 */
function extractRecentEvents(gameState: GameState): Array<{ family?: string; title?: string }> {
  const history = gameState.eventHistory ?? {}
  const currentDay = gameState.school.day
  const windowStart = currentDay - REPEAT_RATE_WINDOW_DAYS

  const recent: Array<{ family?: string; title?: string }> = []

  for (const [eventId, record] of Object.entries(history)) {
    if (record.lastDay >= windowStart) {
      recent.push({
        family: undefined, // 从事件定义中获取
        title: eventId
      })
    }
  }

  return recent.slice(-10) // 最多取 10 个
}

/**
 * 检查是否应该触发 AI 生成
 */
async function shouldTriggerGeneration(gameState: GameState): Promise<boolean> {
  // 检查动态池是否可用
  try {
    const pool = useDynamicEventPool()
    const isReady = await pool.isReady?.() ?? true
    if (!isReady) return false
  } catch {
    return false // IndexedDB 不可用，不触发
  }

  // 首次触发：第 5 次行动后
  if (scheduler && scheduler.actionCount === FIRST_TRIGGER_ACTION_COUNT) {
    return true
  }

  // 动态池事件数不足时触发补充
  try {
    const pool = useDynamicEventPool()
    const count = await pool.getEventCount()
    if (count < MIN_DYNAMIC_EVENTS) {
      return true
    }
  } catch {
    // 忽略
  }

  // 事件重复率过高时触发
  const repeatRate = calculateRepeatRate(gameState)
  if (repeatRate > MAX_REPEAT_RATE) {
    return true
  }

  return false
}

/**
 * 计算事件重复率
 */
function calculateRepeatRate(gameState: GameState): number {
  const history = gameState.eventHistory ?? {}
  const currentDay = gameState.school.day
  const windowStart = currentDay - REPEAT_RATE_WINDOW_DAYS

  let totalTriggers = 0
  let uniqueEvents = new Set<string>()

  for (const [eventId, record] of Object.entries(history)) {
    if (record.lastDay >= windowStart) {
      totalTriggers += record.times ?? 1
      uniqueEvents.add(eventId)
    }
  }

  if (totalTriggers === 0) return 0

  // 重复率 = (总触发次数 - 唯一事件数) / 总触发次数
  return (totalTriggers - uniqueEvents.size) / totalTriggers
}

/**
 * 验证事件定义（Schema 验证）
 */
export function validateEventDefinition(event: unknown): event is EventDefinition {
  if (typeof event !== 'object' || event === null) return false

  const e = event as Record<string, unknown>

  // 必需字段
  if (typeof e.id !== 'string' || !e.id) return false
  if (typeof e.title !== 'string' || !e.title) return false
  if (typeof e.body !== 'string' || !e.body) return false
  if (typeof e.type !== 'string' || !e.type) return false

  // options 校验
  if (!Array.isArray(e.options) || e.options.length === 0) return false

  for (const opt of e.options) {
    if (typeof opt !== 'object' || opt === null) return false
    const option = opt as Record<string, unknown>
    if (typeof option.id !== 'string' || !option.id) return false
    if (typeof option.label !== 'string' || !option.label) return false
    if (!Array.isArray(option.effects)) return false
  }

  return true
}

/**
 * 应用数值平衡约束
 */
export function applyNumericalConstraints(event: EventDefinition): EventDefinition {
  const maxCashDelta = 5000
  const maxStatDelta = 20
  const cloned = { ...event }

  // 确保 weight 范围
  if (cloned.weight !== undefined) {
    cloned.weight = Math.max(0.5, Math.min(2.0, cloned.weight))
  }

  // 约束 effects 数值
  for (const option of cloned.options) {
    for (const effect of option.effects) {
      if (effect.kind === 'stat' && effect.delta !== undefined) {
        effect.delta = Math.max(-maxStatDelta, Math.min(maxStatDelta, effect.delta))
      }
      if (effect.kind === 'econ' && effect.delta !== undefined) {
        effect.delta = Math.max(-maxCashDelta, Math.min(maxCashDelta, effect.delta))
      }
    }
  }

  return cloned
}

/**
 * 触发单次 AI 生成
 */
async function triggerGeneration(gameState: GameState): Promise<number> {
  if (!scheduler || scheduler.generationInProgress) return 0

  const shouldTrigger = await shouldTriggerGeneration(gameState)
  if (!shouldTrigger || !scheduler) return 0

  // 频率限制：至少间隔 5 分钟
  const now = Date.now()
  if (now - scheduler.lastGenerationTime < 5 * 60 * 1000) return 0

  scheduler.generationInProgress = true

  try {
    const context = extractGenerationContext(gameState)

    // 使用 requestIdleCallback 确保不阻塞主线程
    const scheduled = await new Promise<number>((resolve) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(async () => {
          const count = await doGeneration(context)
          resolve(count)
        }, { timeout: 5000 })
      } else {
        // 降级：直接执行
        doGeneration(context).then(resolve)
      }
    })

    if (scheduler) {
      scheduler.lastGenerationTime = Date.now()
    }
    return scheduled
  } catch (error) {
    console.warn('AI 事件生成失败:', error)
    return 0
  } finally {
    if (scheduler) {
      scheduler.generationInProgress = false
    }
  }
}

/**
 * 执行实际的生成请求
 */
async function doGeneration(context: ReturnType<typeof extractGenerationContext>): Promise<number> {
  try {
    const response = await fetch('/api/generate-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    })

    if (!response.ok) {
      console.warn(`[AI生成] API 返回 ${response.status}，跳过`)
      return 0
    }

    const events: unknown[] = await response.json()

    // 校验并约束
    const validEvents = events
      .filter(validateEventDefinition)
      .map(applyNumericalConstraints)

    if (validEvents.length === 0) {
      console.warn('[AI生成] 无有效事件')
      return 0
    }

    // 入库
    const pool = useDynamicEventPool()
    const inserted = await pool.insertAiEvents(validEvents)

    console.log(`[AI生成] 成功生成并入库 ${inserted} 个事件`)
    return inserted
  } catch (error) {
    console.warn('[AI生成] 请求失败:', error)
    return 0
  }
}

/**
 * 启动后台生成调度
 */
function startBackgroundGeneration(gameState: GameState): void {
  if (scheduler?.isRunning) return

  scheduler = {
    timer: null,
    actionCount: 0,
    isRunning: true,
    lastGenerationTime: 0,
    generationInProgress: false
  }

  // 立即尝试触发一次
  triggerGeneration(gameState)

  // 启动定时器，每 10 分钟检查一次
  scheduler.timer = setInterval(() => {
    triggerGeneration(gameState)
  }, GENERATION_INTERVAL_MS)
}

/**
 * 停止后台生成调度
 */
function stopBackgroundGeneration(): void {
  if (scheduler?.timer) {
    clearInterval(scheduler.timer)
  }
  scheduler = null
}

/**
 * 记录行动完成
 */
function onActionCompleted(gameState: GameState): void {
  if (!scheduler) {
    startBackgroundGeneration(gameState)
  }

  if (!scheduler) return

  scheduler.actionCount++

  // 第 5 次行动后首次触发
  if (scheduler.actionCount === FIRST_TRIGGER_ACTION_COUNT) {
    triggerGeneration(gameState)
  }
}

/**
 * AI 事件生成 Composable
 */
export function useAiEventGenerator() {
  return {
    /** 启动后台生成 */
    start: startBackgroundGeneration,
    /** 停止后台生成 */
    stop: stopBackgroundGeneration,
    /** 记录行动完成 */
    onActionCompleted,
    /** 手动触发一次生成 */
    trigger: triggerGeneration,
    /** 获取调度状态 */
    getScheduler: () => scheduler,
    /** 校验事件定义 */
    validateEventDefinition,
    /** 应用数值约束 */
    applyNumericalConstraints,
    /** 提取上下文 */
    extractGenerationContext
  }
}
