import type {
  ActionId,
  EventDefinition,
  GameState,
  PendingEvent,
  SlotId,
} from '~/types/game'
import { buildInstitutionalEventLogDetail } from '~/logic/eventInstitutionalLog'
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

export type DelinquencyPolicy = {
  level: number
  rateStepMultiplier: number
  minWeeklyPaymentMultiplier: number
  collectionRiskWeight: number
}

export type TierDebtProfile = {
  studyGainMultiplier: number
  dailyRateMultiplier: number
  minWeeklyPaymentMultiplier: number
  collectionRiskWeight: number
}

const DELINQUENCY_POLICIES: Record<number, DelinquencyPolicy> = {
  0: { level: 0, rateStepMultiplier: 1, minWeeklyPaymentMultiplier: 1, collectionRiskWeight: 1 },
  1: { level: 1, rateStepMultiplier: 1, minWeeklyPaymentMultiplier: 1, collectionRiskWeight: 1.05 },
  2: { level: 2, rateStepMultiplier: 1.12, minWeeklyPaymentMultiplier: 1.08, collectionRiskWeight: 1.2 },
  3: { level: 3, rateStepMultiplier: 1.18, minWeeklyPaymentMultiplier: 1.16, collectionRiskWeight: 1.35 },
  4: { level: 4, rateStepMultiplier: 1.24, minWeeklyPaymentMultiplier: 1.24, collectionRiskWeight: 1.5 },
  5: { level: 5, rateStepMultiplier: 1.3, minWeeklyPaymentMultiplier: 1.35, collectionRiskWeight: 1.7 }
}

const DEFAULT_DELINQUENCY_POLICY: DelinquencyPolicy = {
  level: 5,
  rateStepMultiplier: 1.3,
  minWeeklyPaymentMultiplier: 1.35,
  collectionRiskWeight: 1.7
}

export function normalizeDelinquencyLevel(level: number): number {
  return clamp(Math.floor(level), 0, 5)
}

export function delinquencyPolicy(level: number): DelinquencyPolicy {
  const normalized = normalizeDelinquencyLevel(level)
  return DELINQUENCY_POLICIES[normalized] ?? DEFAULT_DELINQUENCY_POLICY
}

export function nextWeeklyDelinquencyLevel(currentLevel: number, daysSinceLastPayment: number): number {
  const normalizedCurrent = normalizeDelinquencyLevel(currentLevel)
  // 首次逾期在满两周时进入 1 级，之后按每周节律升级。
  if (daysSinceLastPayment <= 7) return normalizedCurrent
  return normalizeDelinquencyLevel(normalizedCurrent + 1)
}

export function calculateWeeklyMinPayment(totalDebt: number, delinquency: number): number {
  const debt = Math.max(0, Math.floor(totalDebt))
  if (debt <= 0) return 0
  const policy = delinquencyPolicy(delinquency)
  const base = debt * 0.08
  return Math.max(280, Math.floor(base * policy.minWeeklyPaymentMultiplier))
}

export function debtProfileForTier(tier: GameState['school']['classTier']): TierDebtProfile {
  if (tier === '示范班') {
    return {
      studyGainMultiplier: 1.12,
      dailyRateMultiplier: 0.94,
      minWeeklyPaymentMultiplier: 0.93,
      collectionRiskWeight: 0.86
    }
  }
  if (tier === '普通班') {
    return {
      studyGainMultiplier: 1,
      dailyRateMultiplier: 1,
      minWeeklyPaymentMultiplier: 1,
      collectionRiskWeight: 1
    }
  }
  return {
    // 末位班用持续小惩罚，不做单周重击。
    studyGainMultiplier: 0.9,
    dailyRateMultiplier: 1.08,
    minWeeklyPaymentMultiplier: 1.09,
    collectionRiskWeight: 1.18
  }
}

export function calculateTierAdjustedMinPayment(
  totalDebt: number,
  delinquency: number,
  tier: GameState['school']['classTier']
): number {
  const base = calculateWeeklyMinPayment(totalDebt, delinquency)
  if (base <= 0) return 0
  return Math.max(280, Math.floor(base * debtProfileForTier(tier).minWeeklyPaymentMultiplier))
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

/** 事件 id 冷却下限（D-03），与数据 cooldownDays 取 max */
export const MIN_EVENT_COOLDOWN_DAYS = 3

/** 周结算游玩日上对非强制随机的概率乘数（D-04），区间 0.5～0.75 */
export const WEEKLY_RANDOM_DOWNWEIGHT_K = 0.65

export function effectiveEventCooldownDays(event: EventDefinition): number {
  const raw = event.cooldownDays
  if (raw === undefined || raw <= 0) return 0
  return Math.max(raw, MIN_EVENT_COOLDOWN_DAYS)
}

/**
 * endDay 内 day 自增后与周结算块一致的条件 (g.school.day - 1) % 7 === 0（D-04 / 03-RESEARCH Pitfall 2）
 */
export function isWeeklySettlementDayAfterDayRoll(day: number): boolean {
  return (day - 1) % 7 === 0
}

/**
 * 当前游玩日是否处于「下一次 endDay 将跑周结算」的周界日前段（D-04）。
 * 与 endDay 中 day+=1 后的周块条件一致：下一日 D 满足 (D-1)%7===0 ⇔ 当前日 %7===0。
 */
export function isWeeklySettlementDay(g: GameState): boolean {
  const d = g.school.day
  return d > 0 && d % 7 === 0
}

/** 非 mandatory 的 afterAction 随机门概率乘数（D-04）；仅作用于 baseP，不禁止随机 */
export function applyWeeklyRandomDownweightToProbability(baseP: number, g: GameState): number {
  if (!isWeeklySettlementDay(g)) return baseP
  return baseP * WEEKLY_RANDOM_DOWNWEIGHT_K
}

/** 同 family 短周期互斥（D-02），窗口长度与 MIN_EVENT_COOLDOWN_DAYS 一致 */
export function isFamilyOnCooldown(g: GameState, event: EventDefinition): boolean {
  const fam = event.family
  if (!fam) return false
  const hist = g.familyHistory?.[fam]
  if (!hist) return false
  return g.school.day - hist.lastDay < MIN_EVENT_COOLDOWN_DAYS
}

/** 选中随机事件后写入 id 与 family 时间戳（D-02、D-03） */
export function recordEventTrigger(g: GameState, event: EventDefinition): void {
  if (!g.eventHistory) g.eventHistory = {}
  const entry = g.eventHistory[event.id] || { lastDay: 0, times: 0 }
  entry.lastDay = g.school.day
  entry.times += 1
  g.eventHistory[event.id] = entry
  if (event.family) {
    if (!g.familyHistory) g.familyHistory = {}
    g.familyHistory[event.family] = { lastDay: g.school.day }
  }
}

export function isEventOnCooldown(g: GameState, event: EventDefinition) {
  const cd = effectiveEventCooldownDays(event)
  if (cd <= 0) return false
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

function ensureSystemBlock(
  def: EventDefinition,
  tier: 'critical' | 'normal'
): { systemSummary: string; systemDetails: string } {
  if (def.systemSummary && def.systemDetails) {
    return { systemSummary: def.systemSummary, systemDetails: def.systemDetails }
  }
  if (tier === 'critical') {
    const fx = def.options[0]?.effects ?? []
    return {
      systemSummary: def.systemSummary ?? '制度性参数将按选项结果更新',
      systemDetails: def.systemDetails ?? buildInstitutionalEventLogDetail(fx)
    }
  }
  return {
    systemSummary: def.systemSummary ?? '',
    systemDetails: def.systemDetails ?? ''
  }
}

export function toPendingEvent(def: EventDefinition): PendingEvent {
  const tier = def.tier ?? 'normal'
  const sys = ensureSystemBlock(def, tier)
  return {
    eventId: def.id,
    title: def.title,
    body: def.body,
    options: def.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      tone: opt.tone
    })),
    tier,
    systemSummary: sys.systemSummary,
    systemDetails: sys.systemDetails,
    defaultOptionId: def.defaultOptionId,
    mandatory: def.mandatory ?? false
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
  if (weeksPassed <= 0) return calculateTierAdjustedMinPayment(fullDebt(g), g.econ.delinquency, g.school.classTier)
  let accumulated = 0
  for (let i = 0; i < weeksPassed; i++) {
    const debtAtWeek = estimateDebtAtWeek(g, i)
    const minPay = calculateTierAdjustedMinPayment(debtAtWeek, g.econ.delinquency, g.school.classTier)
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
    const tierProfile = debtProfileForTier(g.school.classTier)
    let prob = 0.25
    if (g.econ.delinquency >= 4) prob += 0.20
    if (totalDebt > 80000) prob += 0.15
    prob *= tierProfile.collectionRiskWeight
    prob = clamp(prob, 0.08, 0.82)
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
  // D-06：麻木休息在 act() 内先分流；此处「休息」不再 100% 反噬，与其他行动共用 strict 概率带
  if (action === 'parttime') return false
  if (g.stats.fatigue >= 88) return false
  const debt = fullDebt(g)
  const strict = clamp(0.25 + g.contract.vigilance / 160 + (debt > 60_000 ? 0.12 : 0), 0.15, 0.65)
  if (action === 'buy' && strict < 0.45) return false
  return rand() < strict
}

/** 刷分路线：上课/吐纳（与打工对立的制度轴） */
export function isScoreRouteAction(action: ActionId): boolean {
  return action === 'study' || action === 'tuna'
}

/** 现金路线：打工 */
export function isCashRouteAction(action: ActionId): boolean {
  return action === 'parttime'
}

/**
 * 根据当日三时段行动判定单日路线；缺段或混用视为 mixed。
 */
export function classifyDayRoute(actions: Partial<Record<SlotId, ActionId>>): 'score' | 'cash' | 'mixed' {
  const order: SlotId[] = ['morning', 'afternoon', 'night']
  for (const s of order) {
    if (actions[s] === undefined) return 'mixed'
  }
  const vals = order.map((s) => actions[s]!)
  const allScore = vals.every((a) => isScoreRouteAction(a))
  const allCash = vals.every((a) => isCashRouteAction(a))
  if (allScore) return 'score'
  if (allCash) return 'cash'
  return 'mixed'
}

export function updateRouteStreaks(g: GameState, kind: 'score' | 'cash' | 'mixed'): void {
  if (kind === 'score') {
    g.scoreDayStreak = (g.scoreDayStreak ?? 0) + 1
    g.cashDayStreak = 0
  } else if (kind === 'cash') {
    g.cashDayStreak = (g.cashDayStreak ?? 0) + 1
    g.scoreDayStreak = 0
  } else {
    g.scoreDayStreak = 0
    g.cashDayStreak = 0
  }
}

/** 连续纯刷分日 ≥2 时边际递减（D-14） */
export function studyGainImbalanceMultiplier(g: GameState): number {
  const s = g.scoreDayStreak ?? 0
  if (s < 2) return 1
  return Math.max(0.72, 1 - 0.065 * (s - 1))
}

/** 连续纯打工日 ≥2 时边际递减 */
export function parttimePayImbalanceMultiplier(g: GameState): number {
  const s = g.cashDayStreak ?? 0
  if (s < 2) return 1
  return Math.max(0.74, 1 - 0.055 * (s - 1))
}

/** 失衡下随机事件基础概率上调权重（双轨反制之一） */
export function imbalanceEventProbabilityBoost(g: GameState): number {
  const m = Math.max(g.scoreDayStreak ?? 0, g.cashDayStreak ?? 0)
  return m >= 2 ? 0.08 : 0
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

export function shouldTriggerNarrativeEnding(g: GameState): boolean {
  if (g.school.day <= 30) return false
  if (g.stats.fatigue < 90) return false
  if (g.stats.focus > 15) return false
  if (g.econ.delinquency < 3) return false
  return true
}

export function makeNarrativeEndingEvent(): PendingEvent {
  return {
    title: '情节结局：麻木化时刻',
    body:
      '你忽然意识到，自己已经不再期待“好起来”，而只是在机械地选择下一步。系统没有宣布结束，你也没有。你只是继续。',
    options: [
      { id: 'ending_continue', label: '继续下一天', tone: 'primary' }
    ]
  }
}

// ========== PSY-01：中后期门闩、阶梯加压、休息倍率、副指标（D-01～D-08） ==========

/** D-01：中后期 = day≥10 或 contract.progress≥50%（先到先进入） */
export function isMidLatePhase(g: GameState): boolean {
  return g.school.day >= 10 || g.contract.progress >= 50
}

/**
 * D-02：冲突加压阶梯（Claude discretion：与 7 日周节律对齐）。
 * 非中后期为 0；中后期为 (week-1) 基线 + 周结算日抬 1 档，随周次单调不减。
 */
export function getConflictPressureTier(g: GameState): number {
  if (!isMidLatePhase(g)) return 0
  const weekIdx = Math.max(0, g.school.week - 1)
  const settlementBoost = isWeeklySettlementDay(g) ? 1 : 0
  return weekIdx + settlementBoost
}

/**
 * D-03：可测复合压力分数（契约缠绕 + 疲劳/道心/专注等），不引入第二套无关资源条。
 */
export function computePsychologicalPressureScore(g: GameState): number {
  const c = g.contract
  const contractPart = (c.active ? c.progress : 0) * 0.38 + (c.active ? c.vigilance : 0) * 0.22
  const statsPart = g.stats.fatigue * 0.32 + (100 - g.stats.focus) * 0.14 + Math.max(0, g.stats.daoXin - 1) * 1.8
  return contractPart + statsPart
}

/**
 * D-07：契约缠绕越高，休息恢复效率越低（同一公式，D-04 无前期软保护分支）。
 */
export function restRecoveryMultiplier(g: GameState): number {
  if (!g.contract.active) return 1
  const entanglement = clamp(g.contract.progress + g.contract.vigilance * 0.18, 0, 100)
  return clamp(1 - (entanglement / 100) * 0.58, 0.22, 1)
}

export type RestRecoveryOpts = {
  rand: () => number
  /** 测试/强制：走麻木分支 */
  forceNumb?: boolean
  /** act 内已判定过麻木时，跳过后续麻木随机（避免二次麻木） */
  skipNumbCheck?: boolean
}

export type RestRecoveryResult = {
  focusDelta: number
  fatigueDelta: number
  isNumbRest: boolean
  multiplier: number
}

/**
 * D-06～D-07：休息结算（专注增量）；麻木分支几乎不回状态。
 * 疲劳在行动管线中统一结算，此处 fatigueDelta 恒为 0。
 */
export function computeRestRecovery(g: GameState, opts: RestRecoveryOpts): RestRecoveryResult {
  const mult = restRecoveryMultiplier(g)
  const baseFocus = 6

  if (opts.forceNumb) {
    return { focusDelta: 0, fatigueDelta: 0, isNumbRest: true, multiplier: mult }
  }

  if (opts.skipNumbCheck) {
    const focusDelta = Math.round(baseFocus * mult * 10) / 10
    return { focusDelta, fatigueDelta: 0, isNumbRest: false, multiplier: mult }
  }

  const pNumb = numbRestProbability(g)
  if (g.contract.active && isMidLatePhase(g) && opts.rand() < pNumb) {
    return { focusDelta: 0, fatigueDelta: 0, isNumbRest: true, multiplier: mult }
  }

  const focusDelta = Math.round(baseFocus * mult * 10) / 10
  return { focusDelta, fatigueDelta: 0, isNumbRest: false, multiplier: mult }
}

/** D-06：中后期签约下麻木休息基础概率（Claude discretion） */
export function numbRestProbability(g: GameState): number {
  if (!g.contract.active || !isMidLatePhase(g)) return 0
  return clamp(0.07 + (g.contract.progress / 100) * 0.45, 0, 0.55)
}

/**
 * 单次 roll∈[0,1) 是否进入麻木休息（与 act 内第一随机点一致）。
 */
export function shouldTakeNumbRest(g: GameState, roll: number): boolean {
  return roll >= 0 && roll < numbRestProbability(g)
}

/**
 * D-05：契约 progress / vigilance 上升时同步驯化副指标（非递减增量）。
 */
export function syncDomesticationWithContractProgress(
  g: GameState,
  prevProgress: number,
  prevVigilance?: number
): void {
  if (!g.contract.active) return
  const prevV = prevVigilance ?? g.contract.vigilance
  const dp = g.contract.progress - prevProgress
  const dv = g.contract.vigilance - prevV
  let add = 0
  if (dp > 0) add += dp * 0.28
  if (dv > 0) add += dv * 0.12
  if (add <= 0) return
  g.domestication = clamp((g.domestication ?? 0) + add, 0, 100)
}

/** D-08：契约 Pill 旁单行副指标文案 */
export function formatPsySubsidiaryLine(g: GameState): string {
  if (!g.contract.active) return ''
  const d = Math.round(g.domestication ?? 0)
  const n = Math.round(g.numbness ?? 0)
  return `驯化 ${d} · 麻木 ${n}`
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
