import type {
  ActionId,
  EventDefinition,
  EventEffect,
  GameState,
  PendingEvent,
  SlotId,
  StartConfig
} from '~/types/game'
import { clamp, mulberry32, round1, uid } from '~/utils/rng'
import { ALL_EVENTS, getEventsByPhase } from '~/utils/events'

const STORAGE_KEY = 'kunxu_sim_save_v2'
const LEGACY_STORAGE_KEY = 'kunxu_sim_save_v1'

type SaveSlotId = 'autosave' | 'slot1' | 'slot2' | 'slot3'

interface SaveSlotMeta {
  id: SaveSlotId
  label: string
  updatedAt: number
  started: boolean
  day: number
  week: number
  tier: GameState['school']['classTier']
  cash: number
  debt: number
}

interface SaveContainer {
  activeSlot: SaveSlotId
  slots: Partial<Record<SaveSlotId, { meta: SaveSlotMeta; state: GameState }>>
}

function defaultState(): GameState {
  return {
    started: false,
    seed: Math.floor(Math.random() * 1_000_000_000),
    stats: {
      daoXin: 1,
      faLi: 6.8,
      rouTi: 0.6,
      fatigue: 25,
      focus: 55
    },
    econ: {
      cash: 1200,
      debtPrincipal: 0,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 0
    },
    school: {
      day: 1,
      week: 1,
      slot: 'morning',
      classTier: '普通班',
      lastExamScore: 0,
      lastRank: 999,
      perks: {
        mealSubsidy: 0,
        focusBonus: 0
      }
    },
    contract: {
      active: false,
      name: '请神契约',
      patron: '布娃娃（邪神代理）',
      progress: 0,
      vigilance: 35,
      lastTriggerDay: 0
    },
    logs: [],
    eventHistory: {},
    bodyPartRepayment: {},
    bodyIntegrity: 1.0,
    bodyReputation: 'clean',
    buyDebasement: 0
  }
}

function slotOrder(): SlotId[] {
  return ['morning', 'afternoon', 'night']
}

function describeSlot(slot: SlotId) {
  if (slot === 'morning') return '清晨'
  if (slot === 'afternoon') return '午后'
  return '深夜'
}

function scoreForExam(g: GameState, rand: () => number) {
  const { daoXin, faLi, rouTi, focus, fatigue } = g.stats
  const tier = g.school.classTier
  const tierBoost = tier === '示范班' ? 10 : tier === '普通班' ? 0 : -8
  const debtPenalty = Math.min(18, Math.log10(1 + g.econ.debtPrincipal / 1000) * 6)
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

function determineTier(score: number) {
  if (score >= 600) return '示范班' as const
  if (score >= 540) return '普通班' as const
  return '末位班' as const
}

function perksForTier(tier: GameState['school']['classTier']) {
  if (tier === '示范班') return { mealSubsidy: 160, focusBonus: 10 }
  if (tier === '普通班') return { mealSubsidy: 40, focusBonus: 0 }
  return { mealSubsidy: 0, focusBonus: -6 }
}

function eventMatchesTrigger(event: EventDefinition, g: GameState) {
  const t = event.trigger
  if (!t) return true

  const day = g.school.day
  const debt = g.econ.debtPrincipal + g.econ.debtInterestAccrued
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

function recordEventTrigger(g: GameState, eventId: string) {
  if (!g.eventHistory) g.eventHistory = {}
  const entry = g.eventHistory[eventId] || { lastDay: 0, times: 0 }
  entry.lastDay = g.school.day
  entry.times += 1
  g.eventHistory[eventId] = entry
}

function isEventOnCooldown(g: GameState, event: EventDefinition) {
  const cd = event.cooldownDays
  if (cd === undefined || cd <= 0) return false
  const hist = g.eventHistory?.[event.id]
  if (!hist) return false
  return g.school.day - hist.lastDay < cd
}

function hasEventReachedMaxTimes(g: GameState, event: EventDefinition) {
  if (!event.maxTimes) return false
  const hist = g.eventHistory?.[event.id]
  if (!hist) return false
  return hist.times >= event.maxTimes
}

function pickWeightedEvent(events: EventDefinition[], rand: () => number): EventDefinition | undefined {
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

function toPendingEvent(def: EventDefinition): PendingEvent {
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

function estimateDebtAtWeek(g: GameState, weeksAgo: number): number {
  const currentDebt = g.econ.debtPrincipal + g.econ.debtInterestAccrued
  const weeklyRate = g.econ.dailyRate * 7
  return currentDebt / Math.pow(1 + weeklyRate, weeksAgo)
}

function calculateAccumulatedMinPayment(g: GameState): number {
  const daysSincePay = g.school.day - g.econ.lastPaymentDay
  const weeksPassed = Math.floor(daysSincePay / 7)
  if (weeksPassed <= 0) return Math.max(280, Math.floor((g.econ.debtPrincipal + g.econ.debtInterestAccrued) * 0.08))
  let accumulated = 0
  for (let i = 0; i < weeksPassed; i++) {
    const debtAtWeek = estimateDebtAtWeek(g, i)
    const minPay = Math.max(280, Math.floor(debtAtWeek * 0.08))
    accumulated += minPay
  }
  return accumulated
}

function shouldTriggerRepaymentEvent(g: GameState): { trigger: boolean; mandatory: boolean } {
  // Check if all six parts are already repaid
  const allRepaid = (['LeftPalm', 'RightPalm', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'] as const)
    .every(id => g.bodyPartRepayment?.[id] === true)
  if (allRepaid) return { trigger: false, mandatory: false }

  // Cooldown: don't re-trigger within 7 days of last body part repayment
  if (g.lastBodyPartRepaymentDay !== undefined) {
    const daysSinceRepayment = g.school.day - g.lastBodyPartRepaymentDay
    if (daysSinceRepayment < 7) return { trigger: false, mandatory: false }
  }

  // Mandatory trigger: 4 weeks (28 days) without payment
  const daysSincePay = g.school.day - g.econ.lastPaymentDay
  if (daysSincePay >= 28) return { trigger: true, mandatory: true }

  // Probability trigger: delinquency >= 3
  if (g.econ.delinquency >= 3) {
    const totalDebt = g.econ.debtPrincipal + g.econ.debtInterestAccrued
    let prob = 0.25
    if (g.econ.delinquency >= 4) prob += 0.20
    if (totalDebt > 80000) prob += 0.15
    if (Math.random() < prob) return { trigger: true, mandatory: false }
  }

  return { trigger: false, mandatory: false }
}

function randomEventAfterAction(g: GameState, rand: () => number): PendingEvent | undefined {
  // Priority check: body part repayment event
  const repaymentCheck = shouldTriggerRepaymentEvent(g)
  if (repaymentCheck.trigger) {
    const repaid = g.bodyPartRepayment ?? {}
    const availableParts = (['LeftPalm', 'RightPalm', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'] as const)
      .filter(id => !repaid[id])

    const partBaseLabels: Record<string, string> = {
      LeftPalm: '左手掌',
      RightPalm: '右手掌',
      LeftArm: '左臂',
      RightArm: '右臂',
      LeftLeg: '左腿',
      RightLeg: '右腿'
    }

    // 动态估值：基于当前修为/疲劳/补剂劣化计算
    const degradationState: DegradationState = {
      faLi: g.stats.faLi,
      rouTi: g.stats.rouTi,
      fatigue: g.stats.fatigue,
      buyDebasement: g.buyDebasement ?? 0
    }

    const options: PendingEvent['options'] = []

    options.push({
      id: 'immediate_payment',
      label: '立即还款',
      tone: 'primary'
    })

    for (const partId of availableParts) {
      const prereqMap: Record<string, string> = { LeftArm: 'LeftPalm', RightArm: 'RightPalm' }
      const prereq = prereqMap[partId]
      const prereqMissing = prereq && !repaid[prereq]
      const dynamicValue = calculateDynamicValuation(partId, degradationState)
      const baseLabel = partBaseLabels[partId] ?? partId
      const prereqHint = partId === 'LeftArm' ? '需先偿还左手掌' : partId === 'RightArm' ? '需先偿还右手掌' : ''
      const label = prereqMissing
        ? `${baseLabel}（减免¥${dynamicValue.toLocaleString()}，${prereqHint}）`
        : `${baseLabel}（减免¥${dynamicValue.toLocaleString()}）`
      options.push({
        id: `repay_${partId.toLowerCase()}`,
        label,
        tone: 'danger'
      })
    }

    if (!repaymentCheck.mandatory) {
      options.push({
        id: 'refuse',
        label: '拒绝（继续承受压力）',
        tone: 'normal'
      })
    }

    const title = repaymentCheck.mandatory
      ? '\u5f3a\u5236\u6267\u884c\uff1a\u7528\u8eab\u4f53\u507f\u8fd8'
      : '\u6700\u540e\u7684\u9009\u62e9\uff1a\u7528\u8eab\u4f53\u507f\u8fd8'

    const body = repaymentCheck.mandatory
      ? '\u4f60\u5df2\u7ecf\u6ca1\u6709\u9009\u62e9\u7684\u4f59\u5730\u3002\u50ac\u6536\u4eba\u5458\u7ad9\u5728\u4f60\u9762\u524d\uff0c\u5408\u540c\u5df2\u7ecf\u7b7e\u597d\u3002\u507f\u8fd8\u540e\u7684\u8eab\u4f53\u90e8\u4f4d\u65e0\u6cd5\u6062\u590d\u3002\u8fd9\u4e0d\u662f\u6e38\u620f\u673a\u5236\uff0c\u8fd9\u662f\u4f60\u7684\u9009\u62e9\u3002'
      : '\u503a\u52a1\u538b\u57ae\u4e86\u4f60\u7684\u6700\u540e\u4e00\u9053\u9632\u7ebf\u3002\u4ed6\u4eec\u63d0\u51fa\u4e86\u4e00\u4e2a\u201c\u89e3\u51b3\u65b9\u6848\u201d\u3002\u507f\u8fd8\u540e\u7684\u8eab\u4f53\u90e8\u4f4d\u65e0\u6cd5\u6062\u590d\u3002\u8fd9\u4e0d\u662f\u6e38\u620f\u673a\u5236\uff0c\u8fd9\u662f\u4f60\u7684\u9009\u62e9\u3002'

    return {
      title,
      body,
      options,
      mandatory: repaymentCheck.mandatory
    }
  }

  // overall trigger gate: not every turn has an event
  const baseP = clamp(0.04 + g.econ.delinquency * 0.04, 0, 0.35)
  if (rand() > baseP) return undefined

  const pool = getEventsByPhase('afterAction')
  const candidates = pool.filter((event) => {
    if (!eventMatchesTrigger(event, g)) return false
    if (isEventOnCooldown(g, event)) return false
    if (hasEventReachedMaxTimes(g, event)) return false
    return true
  })

  const picked = pickWeightedEvent(candidates, rand)
  if (!picked) return undefined

  recordEventTrigger(g, picked.id)
  return toPendingEvent(picked)
}

function applyEventEffects(g: GameState, effects: EventEffect[]) {
  const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
    g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
    if (g.logs.length > 120) g.logs.pop()
  }

  for (const effect of effects) {
    switch (effect.kind) {
      case 'stat': {
        const key = effect.target
        const current = g.stats[key]
        let next = current + effect.delta
        if (key === 'fatigue' || key === 'focus') {
          next = clamp(next, 0, 100)
        } else {
          next = Math.max(0, next)
        }
        ;(g.stats as any)[key] = next
        break
      }
      case 'econ': {
        const key = effect.target
        const current = g.econ[key]
        const next = Math.max(0, current + effect.delta)
        ;(g.econ as any)[key] = next
        break
      }
      case 'debt': {
        if (effect.mode === 'addPrincipal') {
          g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal + effect.amount)
        } else if (effect.mode === 'addInterest') {
          const totalDebt = g.econ.debtPrincipal + g.econ.debtInterestAccrued
          const amount =
            effect.amount === 0 ? Math.floor(totalDebt * 0.3) : effect.amount
          g.econ.debtInterestAccrued = Math.max(0, g.econ.debtInterestAccrued + amount)
        }
        break
      }
      case 'contract': {
        if (effect.target === 'active' && effect.value !== undefined) {
          g.contract.active = effect.value
        } else if (effect.target === 'progress' && effect.delta !== undefined) {
          g.contract.progress = clamp(g.contract.progress + effect.delta, 0, 100)
        } else if (effect.target === 'vigilance' && effect.delta !== undefined) {
          g.contract.vigilance = clamp(g.contract.vigilance + effect.delta, 0, 100)
        }
        break
      }
      case 'school': {
        if (effect.target === 'classTier') {
          g.school.classTier = effect.value
          g.school.perks = perksForTier(effect.value)
        }
        break
      }
      case 'log': {
        addLog(effect.title, effect.detail, effect.tone)
        break
      }
      default:
        break
    }
  }
}

function contractWouldTrigger(g: GameState, action: ActionId) {
  if (!g.contract.active) return false
  // 监工讨厌：休息、放弃赚钱、放弃还款、以及“明显能做正事却不做”的瞬间
  if (action === 'rest') return true
  if (action === 'parttime') return false
  // 疲劳极高时稍微放你一马（但仍可能触发）
  if (g.stats.fatigue >= 88) return false
  // 债务压力越大，越不允许“散漫”
  const debt = g.econ.debtPrincipal + g.econ.debtInterestAccrued
  const strict = clamp(0.25 + g.contract.vigilance / 160 + (debt > 60_000 ? 0.12 : 0), 0.15, 0.65)
  // 对“买补给/借贷”等旁路不一定触发，对“躺平”更容易触发
  if (action === 'buy' && strict < 0.45) return false
  return Math.random() < strict
}

function makeContractBacklashEvent(g: GameState, intended: ActionId): PendingEvent {
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

interface DegradationState {
  faLi: number
  rouTi: number
  fatigue: number
  buyDebasement: number
}

const BASE_PRICES: Record<string, number> = {
  LeftPalm: 8000,
  RightPalm: 8000,
  LeftArm: 15000,
  RightArm: 15000,
  LeftLeg: 18000,
  RightLeg: 18000
}

function calculateDynamicValuation(partId: string, state: DegradationState): number {
  const basePrice = BASE_PRICES[partId] ?? 15000
  // 修为乘数
  const cultivationMultiplier = 1 + state.faLi * 0.1 + state.rouTi * 0.2
  // 疲劳惩罚（fatigue > 70 才生效）
  const fatiguePenalty = state.fatigue > 70 ? (state.fatigue - 70) * 0.01 : 0
  // 补剂劣化惩罚
  const debasementPenalty = state.buyDebasement * 0.05
  const raw = Math.floor(
    basePrice * cultivationMultiplier * (1 - fatiguePenalty) * (1 - debasementPenalty)
  )
  // 最低 20% 兜底
  const minValue = Math.floor(basePrice * 0.2)
  return Math.max(raw, minValue)
}

export function useGame() {
  const game = useState<GameState>('game', () => defaultState())
  const activeSlot = useState<SaveSlotId>('activeSlot', () => 'autosave')

  const buildMeta = (id: SaveSlotId, label: string, g: GameState): SaveSlotMeta => {
    const debt = Math.max(0, g.econ.debtPrincipal + g.econ.debtInterestAccrued)
    return {
      id,
      label,
      updatedAt: Date.now(),
      started: g.started,
      day: g.school.day,
      week: g.school.week,
      tier: g.school.classTier,
      cash: Math.floor(g.econ.cash),
      debt: Math.floor(debt)
    }
  }

  const saveContainer = (container: SaveContainer) => {
    if (import.meta.server) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(container))
    } catch {
      // ignore
    }
  }

  const loadContainer = (): SaveContainer | null => {
    if (import.meta.server) return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as SaveContainer
    } catch {
      return null
    }
  }

  const saveToSlot = (id: SaveSlotId, label?: string) => {
    const container = loadContainer() ?? { activeSlot: activeSlot.value, slots: {} }
    const slotLabel = label ?? container.slots[id]?.meta.label ?? (id === 'autosave' ? '自动存档' : `存档${id.slice(-1)}`)
    container.activeSlot = id
    activeSlot.value = id
    container.slots[id] = {
      meta: buildMeta(id, slotLabel, game.value),
      state: game.value
    }
    saveContainer(container)
  }

  const BODY_PART_LABELS: Record<string, string> = {
    LeftPalm: '左手掌',
    RightPalm: '右手掌',
    LeftArm: '左臂',
    RightArm: '右臂',
    LeftLeg: '左腿',
    RightLeg: '右腿'
  }

  const BODY_PART_VALUES: Record<string, number> = {
    LeftPalm: 8000,
    RightPalm: 8000,
    LeftArm: 15000,
    RightArm: 15000,
    LeftLeg: 18000,
    RightLeg: 18000
  }

  // 前置依赖：胳膊需要先偿还对应手掌
  const BODY_PART_PREREQS: Record<string, string> = {
    LeftArm: 'LeftPalm',
    RightArm: 'RightPalm'
  }

  const executeBodyPartRepayment = (g: GameState, partId: string) => {
    // 前置依赖检查：胳膊需要先偿还对应手掌
    const prereq = BODY_PART_PREREQS[partId]
    if (prereq && !g.bodyPartRepayment?.[prereq]) {
      g.logs.unshift({
        id: uid('log'),
        day: g.school.day,
        title: '无法偿还',
        detail: `需要先偿还${BODY_PART_LABELS[prereq]}，才能偿还${BODY_PART_LABELS[partId]}。`,
        tone: 'warn'
      })
      if (g.logs.length > 120) g.logs.pop()
      return
    }

    const rawValue = calculateDynamicValuation(partId, {
      faLi: g.stats.faLi,
      rouTi: g.stats.rouTi,
      fatigue: g.stats.fatigue,
      buyDebasement: g.buyDebasement ?? 0
    })
    const label = BODY_PART_LABELS[partId] ?? partId

    // 保底：偿还后总债务不得低于 ¥500（游戏核心循环要求玩家始终处于负债状态）
    const MINIMUM_DEBT_FLOOR = 500
    const totalDebtNow = g.econ.debtPrincipal + g.econ.debtInterestAccrued
    const maxReducible = Math.max(0, totalDebtNow - MINIMUM_DEBT_FLOOR)
    const value = Math.min(rawValue, maxReducible)

    // Reduce debt: principal first, then interest
    if (value > 0) {
      if (g.econ.debtPrincipal >= value) {
        g.econ.debtPrincipal -= value
      } else {
        const remaining = value - g.econ.debtPrincipal
        g.econ.debtPrincipal = 0
        g.econ.debtInterestAccrued = Math.max(0, g.econ.debtInterestAccrued - remaining)
      }
    }

    // Mark as repaid
    if (!g.bodyPartRepayment) g.bodyPartRepayment = {}
    g.bodyPartRepayment[partId] = true

    // Reduce delinquency
    g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)

    // Record repayment day for cooldown
    g.lastBodyPartRepaymentDay = g.school.day
    // 更新身体完整度（劣化系统）
    g.bodyIntegrity = (g.bodyIntegrity ?? 1.0) * 0.8
    // 标记社会评价（永久不可逆）
    g.bodyReputation = 'marked'
    // 记录偿还天数（用于叙事延迟）
    g.lastBodyPartDay = g.school.day
    // 推入叙事延迟队列（偿还后第3天触发部位专属感受日志）
    if (!g.pendingNarratives) g.pendingNarratives = []
    g.pendingNarratives.push({ day: g.school.day, partId })

    // Add log
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day,
      title: '\u8eab\u4f53\u90e8\u4f4d\u507f\u8fd8',
      detail: `\u4f60\u507f\u8fd8\u4e86${label}\uff0c\u51cf\u514d\u503a\u52a1\uffe5${value.toLocaleString()}\u3002\u8fd9\u4e0d\u662f\u6e38\u620f\u673a\u5236\uff0c\u8fd9\u662f\u4f60\u7684\u9009\u62e9\u3002`,
      tone: 'danger'
    })
    if (g.logs.length > 120) g.logs.pop()

    saveToSlot(activeSlot.value)
  }

  const loadFromSlot = (id: SaveSlotId) => {
    const container = loadContainer()
    const payload = container?.slots?.[id]
    if (!payload) return false
    const state = payload.state

    // Migrate legacy saves: ensure bodyPartRepayment exists and is valid
    if (!state.bodyPartRepayment || typeof state.bodyPartRepayment !== 'object') {
      state.bodyPartRepayment = {}
    } else {
      // Validate structure: keys must be valid BodyPartId, values must be boolean
      const validIds = new Set(['LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'])
      const validated: Record<string, boolean> = {}
      for (const [key, val] of Object.entries(state.bodyPartRepayment)) {
        if (validIds.has(key) && typeof val === 'boolean') {
          validated[key] = val
        } else {
          console.warn(`[loadFromSlot] Invalid bodyPartRepayment entry: ${key}=${val}, ignoring`)
        }
      }
      state.bodyPartRepayment = validated
    }

    // bodyIntegrity 迁移
    if (typeof state.bodyIntegrity !== 'number' ||
        state.bodyIntegrity < 0 || state.bodyIntegrity > 1.0) {
      console.warn('[loadFromSlot] Invalid bodyIntegrity, resetting to 1.0')
      state.bodyIntegrity = 1.0
    }

    // bodyReputation 迁移
    if (state.bodyReputation !== 'clean' && state.bodyReputation !== 'marked') {
      console.warn('[loadFromSlot] Invalid bodyReputation, resetting to clean')
      state.bodyReputation = 'clean'
    }

    // buyDebasement 迁移
    if (typeof state.buyDebasement !== 'number' || state.buyDebasement < 0) {
      console.warn('[loadFromSlot] Invalid buyDebasement, resetting to 0')
      state.buyDebasement = 0
    }

    // lastBodyPartDay 迁移（可选字段，undefined 合法）
    if (state.lastBodyPartDay !== undefined &&
        typeof state.lastBodyPartDay !== 'number') {
      state.lastBodyPartDay = undefined
    }

    // pendingNarratives 迁移
    if (!Array.isArray(state.pendingNarratives)) {
      state.pendingNarratives = []
    } else {
      state.pendingNarratives = state.pendingNarratives.filter(
        (e): e is { day: number; partId: string } =>
          typeof e === 'object' && e !== null &&
          typeof e.day === 'number' && typeof e.partId === 'string'
      )
    }

    game.value = state
    activeSlot.value = id
    return true
  }

  const listSlots = computed(() => {
    const container = loadContainer()
    const ids: SaveSlotId[] = ['autosave', 'slot1', 'slot2', 'slot3']
    return ids.map((id) => container?.slots?.[id]?.meta ?? null)
  })

  const migrateLegacy = () => {
    if (import.meta.server) return
    const already = localStorage.getItem(STORAGE_KEY)
    if (already) return
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacyRaw) return
    try {
      const legacyState = JSON.parse(legacyRaw) as GameState
      const container: SaveContainer = {
        activeSlot: 'autosave',
        slots: {
          autosave: {
            meta: buildMeta('autosave', '自动存档（迁移）', legacyState),
            state: legacyState
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(container))
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const reset = () => {
    game.value = defaultState()
    saveToSlot('autosave', '自动存档')
  }

  const startNew = (cfg: StartConfig) => {
    const g = defaultState()
    g.started = true
    g.startConfig = cfg
    g.seed = Math.floor(Math.random() * 1_000_000_000)

    const bgCash = cfg.background === '贫民' ? 800 : cfg.background === '中产' ? 3200 : 12_000
    const bgRate = cfg.background === '贫民' ? 0.008 : cfg.background === '中产' ? 0.006 : 0.007

    const tFa = cfg.talent === '无灵根' ? 6.2 : cfg.talent === '伪灵根' ? 7.4 : 9.2
    const tFocus = cfg.talent === '无灵根' ? 52 : cfg.talent === '伪灵根' ? 58 : 64

    g.econ.cash = bgCash
    g.econ.dailyRate = bgRate
    g.econ.debtPrincipal = Math.max(0, Math.floor(cfg.initialDebt))
    g.stats.faLi = round1(tFa)
    g.stats.focus = tFocus
    g.stats.daoXin = 1
    g.stats.rouTi = 0.6
    g.school.classTier = '普通班'
    g.school.perks = perksForTier('普通班')
    g.logs = [
      {
        id: uid('log'),
        day: 1,
        title: '开局',
        detail: `你叫“${cfg.playerName}”。城市：${cfg.startingCity}。出身：${cfg.background}。天赋：${cfg.talent}。债务：¥${g.econ.debtPrincipal.toLocaleString()}。`,
        tone: 'info'
      }
    ]

    game.value = g
    saveToSlot('autosave', '自动存档')
  }

  const totalDebt = computed(() => Math.max(0, game.value.econ.debtPrincipal + game.value.econ.debtInterestAccrued))

  const minPayment = computed(() => {
    const debt = totalDebt.value
    if (debt <= 0) return 0
    return Math.max(280, Math.floor(debt * 0.08))
  })

  const borrow = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    // 社会评价：marked 状态下债务本金×1.2（到账金额不变）
    const effectivePrincipal = g.bodyReputation === 'marked' ? Math.floor(a * 1.2) : a
    g.econ.debtPrincipal += effectivePrincipal
    g.econ.cash += a
    const logDetail = g.bodyReputation === 'marked'
      ? `经系统评估，您的申请已通过。到账¥${a.toLocaleString()}。`
      : `你借到¥${a.toLocaleString()}。利息不会因为你的梦想而心软。`
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day,
      title: '借贷到账',
      detail: logDetail,
      tone: 'warn'
    })
    if (g.logs.length > 120) g.logs.pop()
    saveToSlot(activeSlot.value)
  }

  const repay = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    if (g.econ.cash <= 0) return
    const pay = Math.min(a, g.econ.cash, totalDebt.value)
    g.econ.cash -= pay
    // 优先还利息
    const interestPay = Math.min(pay, g.econ.debtInterestAccrued)
    g.econ.debtInterestAccrued -= interestPay
    const remain = pay - interestPay
    g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal - remain)
    g.econ.lastPaymentDay = g.school.day
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day,
      title: '还款',
      detail: `你还了¥${pay.toLocaleString()}。债务像潮水退了一点，但海还在。`,
      tone: 'ok'
    })
    if (g.logs.length > 120) g.logs.pop()
    saveToSlot(activeSlot.value)
  }

  const act = (action: ActionId) => {
    const g = game.value
    if (!g.started) return
    if (g.pendingEvent) return

    // 契约监工：在“你想休息/散漫”的瞬间把你按回去
    if (contractWouldTrigger(g, action)) {
      g.contract.lastTriggerDay = g.school.day
      g.contract.lastTriggerSlot = g.school.slot
      g.contract.progress = clamp(g.contract.progress + 2, 0, 100)
      g.contract.vigilance = clamp(g.contract.vigilance + (action === 'rest' ? 6 : 2), 0, 100)
      g.pendingEvent = makeContractBacklashEvent(g, action)
      saveToSlot(activeSlot.value)
      return
    }

    const rand = mulberry32(g.seed + g.school.day * 31 + slotOrder().indexOf(g.school.slot) * 997)

    const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
      if (g.logs.length > 120) g.logs.pop()
    }

    // 劣化系统：身体完整度乘数
    const integrity = g.bodyIntegrity ?? 1.0
    const fatigueMult = 2 - integrity

    // 行动基础耗能（疲劳消耗乘以 fatigueMult）
    const baseFatigueUp = action === 'rest' ? -14 : action === 'tuna' ? 3 : action === 'study' ? 5 : action === 'train' ? 10 : action === 'parttime' ? 12 : 6
    const fatigueUp = baseFatigueUp < 0 ? baseFatigueUp : Math.round(baseFatigueUp * fatigueMult)
    g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)

    if (action === 'study') {
      const focusFactor = (g.stats.focus + g.school.perks.focusBonus) / 100
      // 手掌偿还惩罚 -5%
      const palmPenalty = (g.bodyPartRepayment?.LeftPalm || g.bodyPartRepayment?.RightPalm) ? 0.95 : 1.0
      const faLiGain = (0.05 + focusFactor * 0.06) * integrity * palmPenalty
      g.stats.faLi = round1(g.stats.faLi + faLiGain)
      g.stats.focus = clamp(g.stats.focus + 2, 0, 100)
      addLog('上课/刷题', `你把时间换成了0.1点不到的优势。对别人来说，这足够决定命运。`, 'info')
    }

    if (action === 'tuna') {
      g.stats.faLi = round1(g.stats.faLi + 0.12 + (g.stats.daoXin - 1) * 0.02)
      g.stats.focus = clamp(g.stats.focus - 1, 0, 100)
      addLog('吐纳', '你把呼吸拧成一条线。法力像细流汇入气海。', 'ok')
    }

    if (action === 'train') {
      const risk = clamp((g.stats.fatigue - 60) / 120, 0, 0.25)
      const baseGain = 0.06 + (g.stats.rouTi < 1.2 ? 0.02 : 0)
      // 手臂偿还惩罚 -10%
      const armPenalty = (g.bodyPartRepayment?.LeftArm || g.bodyPartRepayment?.RightArm) ? 0.90 : 1.0
      const rouTiGain = baseGain * integrity * armPenalty
      g.stats.rouTi = round1(g.stats.rouTi + rouTiGain)
      g.stats.focus = clamp(g.stats.focus - 2, 0, 100)
      if (rand() < risk) {
        g.stats.focus = clamp(g.stats.focus - 6, 0, 100)
        addLog('训练过猛', '你的胸口像被钉住。内伤不大，但足够拖慢你。', 'warn')
      } else {
        addLog('炼体', '肌肉在撕裂与修复之间学会服从。', 'ok')
      }
    }

    if (action === 'parttime') {
      const basePay = Math.floor(260 + rand() * 260) + (g.school.classTier === '示范班' ? 120 : 0)
      // 腿部偿还惩罚 -10%
      const legPenalty = (g.bodyPartRepayment?.LeftLeg || g.bodyPartRepayment?.RightLeg) ? 0.90 : 1.0
      const pay = Math.floor(basePay * integrity * legPenalty)
      g.econ.cash += pay
      g.stats.focus = clamp(g.stats.focus - 4, 0, 100)
      addLog('打工', `你赚到¥${pay}。这点钱能换来一口气，或者一针药。`, 'ok')
    }

    if (action === 'buy') {
      // 社会评价：marked 状态下价格×1.15
      const cost = g.bodyReputation === 'marked' ? Math.floor(260 * 1.15) : 260
      if (g.econ.cash >= cost) {
        g.econ.cash -= cost
        g.stats.focus = clamp(g.stats.focus + 10, 0, 100)
        g.stats.fatigue = clamp(g.stats.fatigue - 6, 0, 100)
        // 补剂劣化 +1
        g.buyDebasement = (g.buyDebasement ?? 0) + 1
        // 叙事反馈：buyDebasement >= 3 时替换日志
        const buyLogDetail = (g.buyDebasement ?? 0) >= 3
          ? `感觉没以前管用了。但你还是把它吞下去了。`
          : `花¥${cost}买到“能让你更像机器”的东西。`
        addLog('购买补给', buyLogDetail, 'warn')
      } else {
        addLog('想买补给', '余额像嘲笑。你只能把手缩回去。', 'danger')
        g.stats.focus = clamp(g.stats.focus - 3, 0, 100)
      }
    }

    if (action === 'rest') {
      g.stats.focus = clamp(g.stats.focus + 6, 0, 100)
      addLog('休息', '你偷回了一点人味。', 'info')
    }

    // 日利息滚动（每个时间段都滚一点，让压力更“实时”）
    if (totalDebt.value > 0) {
      const daily = g.econ.dailyRate
      const segmentRate = daily / 3
      g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + (g.econ.debtPrincipal + g.econ.debtInterestAccrued) * segmentRate)
    }

    // 食堂补贴（按天结算）
    if (g.school.slot === 'morning') {
      g.econ.cash += g.school.perks.mealSubsidy
    }

    // 行动后随机事件（把“系统的恶意”压回来）
    g.pendingEvent = randomEventAfterAction(g, rand)

    // 推进时间段
    const idx = slotOrder().indexOf(g.school.slot)
    if (idx < slotOrder().length - 1) {
      g.school.slot = slotOrder()[idx + 1] as SlotId
    } else {
      endDay()
    }

    saveToSlot(activeSlot.value)
  }

  const endDay = () => {
    const g = game.value
    // 补剂劣化每日衰减
    g.buyDebasement = Math.max(0, (g.buyDebasement ?? 0) - 0.2)
    // 新的一天
    g.school.day += 1
    g.school.slot = 'morning'

    // 疲劳自然回落一点（但不会自动清空）
    g.stats.fatigue = clamp(g.stats.fatigue - 6, 0, 100)
    g.stats.focus = clamp(g.stats.focus + 1, 0, 100)

    // 叙事延迟：偿还后第3天触发部位专属模糊感受日志
    if (g.pendingNarratives && g.pendingNarratives.length > 0) {
      const partNarratives: Record<string, string> = {
        LeftPalm:  '今天握笔时，左手掌隐隐发麻，像是睡着了一样。',
        RightPalm: '右手掌在翻书时有些迟钝，像是隔了一层什么。',
        LeftArm:   '左臂抬起来的时候，有一瞬间感觉不太对。可能是昨天练过头了。',
        RightArm:  '右臂在吐纳时总是跟不上节奏，气息在那里绕了个弯。',
        LeftLeg:   '走路时左腿偶尔会有一种说不清的沉重感，停下来又没事了。',
        RightLeg:  '右腿在上楼梯时比平时慢了半拍，自己都没注意到。',
      }
      const triggered: Array<{ day: number; partId: string }> = []
      const remaining: Array<{ day: number; partId: string }> = []
      for (const entry of g.pendingNarratives) {
        if (g.school.day - entry.day === 3) {
          triggered.push(entry)
        } else {
          remaining.push(entry)
        }
      }
      g.pendingNarratives = remaining
      for (const entry of triggered) {
        const detail = partNarratives[entry.partId] ?? '身体某处隐隐有些不对劲，但说不清楚在哪里。'
        g.logs.unshift({ id: uid('log'), day: g.school.day, title: '身体感受', detail, tone: 'info' })
        if (g.logs.length > 120) g.logs.pop()
      }
    }

    // 每 7 天月考/分班结算
    if ((g.school.day - 1) % 7 === 0) {
      const rand = mulberry32(g.seed + g.school.week * 777)
      const score = scoreForExam(g, rand)
      const tier = determineTier(score)
      g.school.lastExamScore = score
      g.school.classTier = tier
      g.school.perks = perksForTier(tier)

      // 粗略排名：用分数映射到 1~200
      const rank = clamp(201 - Math.floor((score - 480) / 1.2), 1, 200)
      g.school.lastRank = rank

      g.logs.unshift({
        id: uid('log'),
        day: g.school.day - 1,
        title: `月考结算（第${g.school.week}周）`,
        detail: `总分：${score}；排名：约第${rank}名；分班：${tier}。在这里，“约”也足够杀人。`,
        tone: tier === '示范班' ? 'ok' : tier === '末位班' ? 'danger' : 'info'
      })
      if (g.logs.length > 120) g.logs.pop()

      // 周期性最低还款检查
      const needPay = minPayment.value
      if (needPay > 0) {
        const daysSincePay = (g.school.day - 1) - g.econ.lastPaymentDay
        if (daysSincePay > 7) {
          const prevDelinquency = g.econ.delinquency
          g.econ.delinquency += 1
          
          // 逾期惩罚分级
          if (g.econ.delinquency === 1) {
            // 1级：警告
            g.logs.unshift({
              id: uid('log'),
              day: g.school.day - 1,
              title: '逾期警告（1级）',
              detail: `你超过一周没还款。这是第一次警告，请尽快还款。`,
              tone: 'warn'
            })
          } else if (g.econ.delinquency === 2) {
            // 2级：利率上浮20%
            const oldRate = g.econ.dailyRate
            g.econ.dailyRate = Math.round(g.econ.dailyRate * 1.2 * 10000) / 10000
            g.logs.unshift({
              id: uid('log'),
              day: g.school.day - 1,
              title: '逾期升级（2级）- 利率上浮',
              detail: `连续逾期。日利率从 ${(oldRate * 100).toFixed(2)}% 上浮至 ${(g.econ.dailyRate * 100).toFixed(2)}%。`,
              tone: 'danger'
            })
          } else if (g.econ.delinquency >= 3) {
            // 3级：强制扣款
            const forcedDeduction = Math.min(g.econ.cash, Math.floor(totalDebt.value * 0.15))
            if (forcedDeduction > 0) {
              g.econ.cash -= forcedDeduction
              // 优先还利息
              const interestPay = Math.min(forcedDeduction, g.econ.debtInterestAccrued)
              g.econ.debtInterestAccrued -= interestPay
              const remain = forcedDeduction - interestPay
              g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal - remain)
            }
            g.logs.unshift({
              id: uid('log'),
              day: g.school.day - 1,
              title: '逾期严重（3级）- 强制扣款',
              detail: `严重逾期。系统强制扣除 ¥${forcedDeduction.toLocaleString()}。`,
              tone: 'danger'
            })
          }
          if (g.logs.length > 120) g.logs.pop()
        }
      }

      g.school.week += 1
    }

    // 末位班的持续压迫：道心磨损
    if (g.school.classTier === '末位班') {
      g.stats.focus = clamp(g.stats.focus - 2, 0, 100)
    }
  }

  const resolveEvent = (choiceId: string) => {
    const e = game.value.pendingEvent
    // 先处理反噬类强制选项：它本质是一次“强行改行动”
    if (e?.title.startsWith('反噬倒计时')) {
      const g = game.value
      const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
        g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
        if (g.logs.length > 120) g.logs.pop()
      }
      if (choiceId === 'forced_tuna') {
        g.pendingEvent = undefined
        addLog('被迫吐纳', '你不是自律，你是被契约牵着走。', 'warn')
        act('tuna')
        return
      }
      if (choiceId === 'forced_study') {
        g.pendingEvent = undefined
        addLog('被迫刷题', '你把恐惧塞进题海里，希望它别再冒出来。', 'warn')
        act('study')
        return
      }
      if (choiceId === 'defy') {
        // 不做结局，但要让玩家感到“痛”
        g.pendingEvent = undefined
        g.stats.focus = clamp(g.stats.focus - 16, 0, 100)
        g.stats.fatigue = clamp(g.stats.fatigue + 12, 0, 100)
        g.contract.vigilance = clamp(g.contract.vigilance + 10, 0, 100)
        g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + 120)
        addLog('反噬惩罚', '你确实休息到了，但代价被写进了你的身体和账单里。', 'danger')
        saveToSlot(activeSlot.value)
        return
      }
    }

    // Body part repayment event handling
    if (e?.title === '\u5f3a\u5236\u6267\u884c\uff1a\u7528\u8eab\u4f53\u507f\u8fd8' || e?.title === '\u6700\u540e\u7684\u9009\u62e9\uff1a\u7528\u8eab\u4f53\u507f\u8fd8') {
      const g = game.value
      const isMandatory = e.mandatory === true

      if (choiceId === 'refuse' && !isMandatory) {
        g.pendingEvent = undefined
        saveToSlot(activeSlot.value)
        return
      }

      if (choiceId === 'immediate_payment') {
        const accumulated = calculateAccumulatedMinPayment(g)
        if (g.econ.cash >= accumulated) {
          g.econ.cash -= accumulated
          const interestPay = Math.min(accumulated, g.econ.debtInterestAccrued)
          g.econ.debtInterestAccrued -= interestPay
          const remain = accumulated - interestPay
          g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal - remain)
          g.econ.lastPaymentDay = g.school.day
          g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
          g.logs.unshift({
            id: uid('log'),
            day: g.school.day,
            title: '\u5f3a\u5236\u8fd8\u6b3e',
            detail: `\u4f60\u652f\u4ed8\u4e86\u7d2f\u79ef\u6700\u4f4e\u8fd8\u6b3e\u989d\uffe5${accumulated.toLocaleString()}\uff0c\u6682\u65f6\u5e73\u606f\u4e86\u50ac\u6536\u3002`,
            tone: 'warn'
          })
          if (g.logs.length > 120) g.logs.pop()
        }
        g.pendingEvent = undefined
        saveToSlot(activeSlot.value)
        return
      }

      const partMap: Record<string, string> = {
        repay_leftpalm: 'LeftPalm',
        repay_rightpalm: 'RightPalm',
        repay_leftarm: 'LeftArm',
        repay_rightarm: 'RightArm',
        repay_leftleg: 'LeftLeg',
        repay_rightleg: 'RightLeg'
      }

      const partId = partMap[choiceId]
      if (partId) {
        executeBodyPartRepayment(g, partId)
        g.pendingEvent = undefined
        saveToSlot(activeSlot.value)
        return
      }
    }

    // data-driven events: look up eventId in event pool and apply effects
    if (e?.eventId) {
      const g = game.value
      const def = ALL_EVENTS.find((evt) => evt.id === e.eventId)
      const opt = def?.options.find((o) => o.id === choiceId)
      if (def && opt) {
        applyEventEffects(g, opt.effects)
        g.pendingEvent = undefined
        saveToSlot(activeSlot.value)
        return
      }
    }

    // 兜底：老的硬编码事件（理论上已全部迁移，但保留以防万一）
    if (e) {
      applyEventEffects(game.value, [
        {
          kind: 'log',
          title: e.title,
          detail: `你选择了：${choiceId}。`,
          tone: 'info'
        }
      ])
      game.value.pendingEvent = undefined
    }

    saveToSlot(activeSlot.value)
  }

  const nextLabel = computed(() => {
    const g = game.value
    return `第${g.school.day}天 · ${describeSlot(g.school.slot)}`
  })

  onMounted(() => {
    migrateLegacy()
    const loaded = loadFromSlot(activeSlot.value)
    if (!loaded) {
      // 尝试从 autosave 启动
      loadFromSlot('autosave')
    }
  })

  watch(
    () => game.value,
    () => saveToSlot(activeSlot.value),
    { deep: true }
  )

  const accumulatedMinPayment = computed(() => calculateAccumulatedMinPayment(game.value))

  return {
    game,
    activeSlot,
    listSlots,
    totalDebt,
    minPayment,
    accumulatedMinPayment,
    nextLabel,
    startNew,
    reset,
    act,
    borrow,
    repay,
    resolveEvent,
    saveToSlot,
    loadFromSlot
  }
}

