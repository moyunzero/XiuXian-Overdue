/**
 * 事件选择管线
 * 合并静态池、种子库、动态池的事件，执行多级过滤和权重调整，最终加权随机选择
 */
import type { EventDefinition, GameState, PendingEvent } from '~/types/game'
import * as Engine from '~/logic/gameEngine'
import { ALL_EVENTS, getEventsByPhase } from '~/utils/events'
import { calculateBehaviorProfile, type BehaviorProfile } from '~/composables/useBehaviorProfile'
import { useDynamicEventPool } from '~/composables/useDynamicEventPool'

// 7 天内触发过的事件降权比例
const RECENT_TRIGGER_WEIGHT_PENALTY = 0.5
// 画像匹配度权重范围
const PROFILE_WEIGHT_MIN = 0.5
const PROFILE_WEIGHT_MAX = 1.5

export interface EventSelectionResult {
  event: EventDefinition
  finalWeight: number
}

/**
 * 合并所有事件池
 */
async function mergeEventPools(phase: EventDefinition['phase']): Promise<EventDefinition[]> {
  const staticEvents = getEventsByPhase(phase)
  
  // 尝试获取动态池事件（如果 IndexedDB 可用）
  try {
    const pool = useDynamicEventPool()
    const dynamicEvents = await pool.getAllEvents()
    
    // 过滤出匹配 phase 的动态事件
    const matchedDynamic = dynamicEvents.filter(e => {
      const eventPhase = e.phase ?? 'afterAction'
      return eventPhase === phase
    })
    
    // 合并并去重（以 id 为准）
    const mergedMap = new Map<string, EventDefinition>()
    
    for (const e of staticEvents) {
      mergedMap.set(e.id, e)
    }
    for (const e of matchedDynamic) {
      if (!mergedMap.has(e.id)) {
        mergedMap.set(e.id, e)
      }
    }
    
    return Array.from(mergedMap.values())
  } catch {
    // IndexedDB 不可用时降级为仅静态池
    return staticEvents
  }
}

/**
 * 触发条件过滤
 */
function filterByTrigger(
  candidates: EventDefinition[],
  gameState: GameState
): EventDefinition[] {
  return candidates.filter(event => Engine.eventMatchesTrigger(event, gameState))
}

/**
 * 冷却过滤
 */
function filterByCooldown(
  candidates: EventDefinition[],
  gameState: GameState
): EventDefinition[] {
  return candidates.filter(event => {
    if (Engine.isEventOnCooldown(gameState, event)) return false
    if (Engine.isFamilyOnCooldown(gameState, event)) return false
    if (Engine.hasEventReachedMaxTimes(gameState, event)) return false
    return true
  })
}

/**
 * 计算画像匹配度（0~1）
 */
export function calculateProfileMatchScore(
  event: EventDefinition,
  profile: BehaviorProfile
): number {
  const trigger = event.trigger
  if (!trigger) return 0.5 // 无触发条件视为中性匹配
  
  let matchCount = 0
  let totalChecks = 0
  
  // 检查财务风险匹配
  if (trigger.financialRiskIn && trigger.financialRiskIn.length > 0) {
    totalChecks++
    if (trigger.financialRiskIn.includes(profile.financialRisk)) {
      matchCount++
    }
  }
  
  // 检查教育信用匹配
  if (trigger.educationCreditIn && trigger.educationCreditIn.length > 0) {
    totalChecks++
    if (trigger.educationCreditIn.includes(profile.educationCredit)) {
      matchCount++
    }
  }
  
  // 检查制度顺从匹配
  if (trigger.complianceIn && trigger.complianceIn.length > 0) {
    totalChecks++
    if (trigger.complianceIn.includes(profile.compliance)) {
      matchCount++
    }
  }
  
  // 检查身体资产匹配
  if (trigger.bodyAssetIn && trigger.bodyAssetIn.length > 0) {
    totalChecks++
    if (trigger.bodyAssetIn.includes(profile.bodyAsset)) {
      matchCount++
    }
  }
  
  // 检查行为标签匹配
  if (trigger.profileTagIn && trigger.profileTagIn.length > 0) {
    totalChecks++
    const hasMatchingTag = trigger.profileTagIn.some(tag => profile.tags.includes(tag))
    if (hasMatchingTag) {
      matchCount++
    }
  }
  
  // 如果没有触发条件，返回默认匹配度
  if (totalChecks === 0) return 0.5
  
  return matchCount / totalChecks
}

/**
 * 获取事件距离上次触发的天数
 */
function getDaysSinceLastTrigger(
  event: EventDefinition,
  gameState: GameState
): number {
  const history = gameState.eventHistory?.[event.id]
  if (!history) return Infinity
  return gameState.school.day - history.lastDay
}

/**
 * 计算事件最终权重（含画像匹配和去重降权）
 */
function calculateEventWeight(
  event: EventDefinition,
  profile: BehaviorProfile,
  gameState: GameState
): number {
  let weight = event.weight ?? 1
  
  // 画像匹配加成
  const profileMatchScore = calculateProfileMatchScore(event, profile)
  const profileMultiplier = PROFILE_WEIGHT_MIN + profileMatchScore * (PROFILE_WEIGHT_MAX - PROFILE_WEIGHT_MIN)
  weight *= profileMultiplier
  
  // 全局去重降权：7 天内触发过的事件降权 50%
  const daysSinceLastTrigger = getDaysSinceLastTrigger(event, gameState)
  if (daysSinceLastTrigger < 7) {
    weight *= RECENT_TRIGGER_WEIGHT_PENALTY
  }
  
  return Math.max(0, weight)
}

/**
 * 应用画像权重调整和去重降权
 */
function applyAdjustments(
  candidates: EventDefinition[],
  profile: BehaviorProfile,
  gameState: GameState
): Array<{ event: EventDefinition; weight: number }> {
  return candidates.map(event => ({
    event,
    weight: calculateEventWeight(event, profile, gameState)
  })).filter(item => item.weight > 0)
}

/**
 * 加权随机选择
 */
function pickWeightedEvent(
  weightedCandidates: Array<{ event: EventDefinition; weight: number }>,
  rand: () => number
): EventSelectionResult | null {
  if (weightedCandidates.length === 0) return null
  
  const totalWeight = weightedCandidates.reduce((sum, c) => sum + c.weight, 0)
  if (totalWeight <= 0) return null
  
  let r = rand() * totalWeight
  for (const candidate of weightedCandidates) {
    r -= candidate.weight
    if (r <= 0) {
      return candidate
    }
  }
  
  return weightedCandidates[weightedCandidates.length - 1]
}

/**
 * 主选择函数
 */
export async function selectEvent(
  gameState: GameState,
  phase: EventDefinition['phase'],
  rand: () => number = Math.random
): Promise<EventSelectionResult | null> {
  // Step 1: 合并候选池
  const candidates = await mergeEventPools(phase)
  if (candidates.length === 0) return null
  
  // Step 2: 触发条件过滤
  const triggerFiltered = filterByTrigger(candidates, gameState)
  if (triggerFiltered.length === 0) return null
  
  // Step 3: 冷却过滤
  const cooldownFiltered = filterByCooldown(triggerFiltered, gameState)
  if (cooldownFiltered.length === 0) return null
  
  // Step 4: 计算画像
  const profile = calculateBehaviorProfile(gameState)
  
  // Step 5: 应用画像权重调整和去重降权
  const adjusted = applyAdjustments(cooldownFiltered, profile, gameState)
  if (adjusted.length === 0) return null
  
  // Step 6: 加权随机选择
  return pickWeightedEvent(adjusted, rand)
}

/**
 * 转换为 PendingEvent
 */
export function toPendingEventFromSelection(result: EventSelectionResult): PendingEvent {
  return Engine.toPendingEvent(result.event)
}
