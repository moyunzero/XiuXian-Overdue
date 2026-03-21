import type {
  ActionId,
  EventDefinition,
  GameState,
  PendingEvent,
  SlotId,
} from '~/types/game'
import { clamp, uid } from '~/utils/rng'

export function fullDebt(g: GameState): number {
  return Math.max(0, g.econ.coreDebt + g.econ.collectionFee + g.econ.debtPrincipal + g.econ.debtInterestAccrued)
}

export function slotOrder(): SlotId[] {
  return ['morning', 'afternoon', 'night']
}

export function describeSlot(slot: SlotId) {
  if (slot === 'morning') return '清晨'
  if (slot === 'afternoon') return '午后'
  return '深夜'
}

export function describeDebtPressure(delinquency: number): '低' | '中' | '高' | '极高' {
  if (delinquency >= 4) return '极高'
  if (delinquency >= 2) return '高'
  if (delinquency >= 1) return '中'
  return '低'
}

export function describePerkChange(
  previous: GameState['school']['perks'],
  current: GameState['school']['perks']
): string {
  if (previous.mealSubsidy === current.mealSubsidy && previous.focusBonus === current.focusBonus) {
    return `下周待遇变化：维持（餐补¥${current.mealSubsidy}/日，专注加成${current.focusBonus}）`
  }
  return `下周待遇变化：餐补¥${previous.mealSubsidy}→¥${current.mealSubsidy}/日，专注加成${previous.focusBonus}→${current.focusBonus}`
}

export function scoreForExam(g: GameState, rand: () => number) {
  const { daoXin, faLi, rouTi, focus, fatigue } = g.stats
  const tier = g.school.classTier
  const tierBoost = tier === '示范班' ? 10 : tier === '普通班' ? 0 : -8
  const debtPenalty = Math.min(18, Math.log10(1 + fullDebt(g) / 1000) * 6)
  const fatiguePenalty = Math.max(0, (fatigue - 55) * 0.25)
  const focusBonus = (focus + g.school.perks.focusBonus) * 0.05

  const base =
    520 +
    daoXin * 8 +
    faLi * 6.5 +
    rouTi * 35 +
    tierBoost +
    focusBonus -
    debtPenalty -
    fatiguePenalty

  const noise = (rand() - 0.5) * 14
  return Math.round(base + noise)
}

export function determineTier(score: number) {
  if (score >= 600) return '示范班' as const
  if (score >= 540) return '普通班' as const
  return '末位班' as const
}

export function perksForTier(tier: GameState['school']['classTier']) {
  if (tier === '示范班') return { mealSubsidy: 160, focusBonus: 10 }
  if (tier === '普通班') return { mealSubsidy: 40, focusBonus: 0 }
  return { mealSubsidy: 0, focusBonus: -6 }
}

export function eventMatchesTrigger(event: EventDefinition, g: GameState) {
  const t = event.trigger
  if (!t) return true

  const day = g.school.day
  const debt = fullDebt(g)
  const cash = g.econ.cash
  const delinquency = g.econ.delinquency
  const tier = g.school.classTier
  const contractActive = g.contract.active

  if (t.minDay !== undefined && day < t.minDay) return false
  if (t.maxDay !== undefined && day > t.maxDay) return false
  if (t.minDebt !== undefined && debt < t.minDebt) return false
  if (t.maxDebt !== undefined && debt > t.maxDebt) return false
  if (t.minCash !== undefined && cash < t.minCash) return false
  if (t.maxCash !== undefined && cash > t.maxCash) return false
  if (t.minDelinquency !== undefined && delinquency < t.minDelinquency) return false
  if (t.maxDelinquency !== undefined && delinquency > t.maxDelinquency) return false
  if (t.classTierIn && t.classTierIn.length && !t.classTierIn.includes(tier)) return false
  if (t.contractActive !== undefined && contractActive !== t.contractActive) return false

  return true
}

export function isEventOnCooldown(g: GameState, event: EventDefinition) {
  const cd = event.cooldownDays
  if (cd === undefined || cd <= 0) return false
  const hist = g.eventHistory?.[event.id]
  if (!hist) return false
  return g.school.day - hist.lastDay < cd
}

export function hasEventReachedMaxTimes(g: GameState, event: EventDefinition) {
  if (!event.maxTimes) return false
  const hist = g.eventHistory?.[event.id]
  if (!hist) return false
  return hist.times >= event.maxTimes
}

export function pickWeightedEvent(events: EventDefinition[], rand: () => number): EventDefinition | undefined {
  if (!events.length) return undefined
  const weights: number[] = events.map((e) => (e.weight ?? 1))
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0)
  if (total <= 0) return undefined
  let r = rand() * total
  for (let i = 0; i < events.length; i++) {
    const w = weights[i] ?? 0
    r -= Math.max(0, w)
    if (r <= 0) return events[i]
  }
  return events[events.length - 1]
}

export function toPendingEvent(def: EventDefinition): PendingEvent {
  return {
    eventId: def.id,
    title: def.title,
    body: def.body,
    options: def.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      tone: opt.tone
    }))
  }
}

export function estimateDebtAtWeek(g: GameState, weeksAgo: number): number {
  const currentDebt = fullDebt(g)
  const weeklyRate = g.econ.dailyRate * 7
  return currentDebt / Math.pow(1 + weeklyRate, weeksAgo)
}

export function calculateAccumulatedMinPayment(g: GameState): number {
  const daysSincePay = g.school.day - g.econ.lastPaymentDay
  const weeksPassed = Math.floor(daysSincePay / 7)
  if (weeksPassed <= 0) return Math.max(280, Math.floor(fullDebt(g) * 0.08))
  let accumulated = 0
  for (let i = 0; i < weeksPassed; i++) {
    const debtAtWeek = estimateDebtAtWeek(g, i)
    const minPay = Math.max(280, Math.floor(debtAtWeek * 0.08))
    accumulated += minPay
  }
  return accumulated
}

export function shouldTriggerRepaymentEvent(g: GameState, rand: () => number): { trigger: boolean; mandatory: boolean } {
  const allRepaid = (['LeftPalm', 'RightPalm', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'] as const)
    .every(id => g.bodyPartRepayment?.[id] === true)
  if (allRepaid) return { trigger: false, mandatory: false }

  if (g.lastBodyPartRepaymentDay !== undefined) {
    const daysSinceRepayment = g.school.day - g.lastBodyPartRepaymentDay
    if (daysSinceRepayment < 7) return { trigger: false, mandatory: false }
  }

  const daysSincePay = g.school.day - g.econ.lastPaymentDay
  if (daysSincePay >= 28) return { trigger: true, mandatory: true }

  if (g.econ.delinquency >= 3) {
    const totalDebt = fullDebt(g)
    let prob = 0.25
    if (g.econ.delinquency >= 4) prob += 0.20
    if (totalDebt > 80000) prob += 0.15
    if (rand() < prob) return { trigger: true, mandatory: false }
  }

  return { trigger: false, mandatory: false }
}

export const BASE_PRICES: Record<string, number> = {
  LeftPalm: 8000,
  RightPalm: 8000,
  LeftArm: 15000,
  RightArm: 15000,
  LeftLeg: 18000,
  RightLeg: 18000
}

export function calculateDynamicValuation(partId: string, state: { faLi: number; rouTi: number; fatigue: number; buyDebasement: number }): number {
  const basePrice = BASE_PRICES[partId] ?? 15000
  const cultivationMultiplier = 1 + state.faLi * 0.1 + state.rouTi * 0.2
  const fatiguePenalty = state.fatigue > 70 ? (state.fatigue - 70) * 0.01 : 0
  const debasementPenalty = state.buyDebasement * 0.05
  const raw = Math.floor(
    basePrice * cultivationMultiplier * (1 - fatiguePenalty) * (1 - debasementPenalty)
  )
  const minValue = Math.floor(basePrice * 0.2)
  return Math.max(raw, minValue)
}

export function contractWouldTrigger(g: GameState, action: ActionId, rand: () => number) {
  if (!g.contract.active) return false
  if (action === 'rest') return true
  if (action === 'parttime') return false
  if (g.stats.fatigue >= 88) return false
  const debt = fullDebt(g)
  const strict = clamp(0.25 + g.contract.vigilance / 160 + (debt > 60_000 ? 0.12 : 0), 0.15, 0.65)
  if (action === 'buy' && strict < 0.45) return false
  return rand() < strict
}

export function actionTrendLabel(g: GameState, action: ActionId): '稳健' | '冒险' | '透支' {
  const highFatigue = g.stats.fatigue >= 75
  const mediumFatigue = g.stats.fatigue >= 55
  const debtStress = g.econ.delinquency >= 2
  const cashTight = g.econ.cash < 260

  if (action === 'rest') return highFatigue || mediumFatigue ? '稳健' : '冒险'
  if (action === 'buy') return cashTight ? '透支' : mediumFatigue ? '稳健' : '冒险'
  if (action === 'parttime') return highFatigue ? '透支' : debtStress ? '稳健' : '冒险'
  if (action === 'train') return highFatigue ? '透支' : mediumFatigue ? '冒险' : '稳健'
  if (action === 'study') return highFatigue ? '透支' : debtStress ? '稳健' : '冒险'
  return highFatigue ? '冒险' : '稳健'
}

export function makeContractBacklashEvent(g: GameState, intended: ActionId): PendingEvent {
  return {
    title: '反噬倒计时：不要故意拖延',
    body:
      `你刚准备“${intended === 'rest' ? '休息' : '摸鱼'}”，脑海里就响起一个冷静到不像人的声音：\n\n“请遵守契约，努力完成愿望。10…9…8…”\n\n你明白：要么立刻做正事，要么付出代价。`,
    options: [
      { id: 'forced_tuna', label: '立刻吐纳（把呼吸拧成一条线）', tone: 'primary' },
      { id: 'forced_study', label: '立刻刷题（把分数当护身符）', tone: 'primary' },
      { id: 'defy', label: '硬抗（我就要休息）', tone: 'danger' }
    ]
  }
}
