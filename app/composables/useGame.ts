import type {
  ActionId,
  EventEffect,
  GameState,
  PendingEvent,
  StartConfig
} from '~/types/game'
import { clamp, mulberry32, round1, uid } from '~/utils/rng'
import { ALL_EVENTS, getEventsByPhase } from '~/utils/events'
import * as Engine from '~/logic/gameEngine'
import { useGameState, defaultState } from './useGameState'
import { useGameStorage, type SaveSlotId } from './useGameStorage'

// ========================================
// 模块级行动子函数（非 export，仅供 act() 调用）
// ========================================

type AddLog = (title: string, detail: string, tone?: 'info' | 'warn' | 'danger' | 'ok') => void

function applyStudyAction(g: GameState, integrity: number, addLog: AddLog): void {
  const focusFactor = (g.stats.focus + g.school.perks.focusBonus) / 100
  const palmPenalty = (g.bodyPartRepayment?.LeftPalm || g.bodyPartRepayment?.RightPalm) ? 0.95 : 1.0
  const faLiGain = (0.05 + focusFactor * 0.06) * integrity * palmPenalty
  g.stats.faLi = round1(g.stats.faLi + faLiGain)
  g.stats.focus = clamp(g.stats.focus + 2, 0, 100)
  addLog('上课/刷题', `你把时间换成了0.1点不到的优势。对别人来说，这足够决定命运。`, 'info')
}

function applyTunaAction(g: GameState, addLog: AddLog): void {
  g.stats.faLi = round1(g.stats.faLi + 0.12 + (g.stats.daoXin - 1) * 0.02)
  g.stats.focus = clamp(g.stats.focus - 1, 0, 100)
  addLog('吐纳', '你把呼吸拧成一条线。法力像细流汇入气海。', 'ok')
}

function applyTrainAction(g: GameState, integrity: number, rand: () => number, addLog: AddLog): void {
  const risk = clamp((g.stats.fatigue - 60) / 120, 0, 0.25)
  const baseGain = 0.06 + (g.stats.rouTi < 1.2 ? 0.02 : 0)
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

function applyParttimeAction(g: GameState, integrity: number, rand: () => number, addLog: AddLog): void {
  const basePay = Math.floor(260 + rand() * 260) + (g.school.classTier === '示范班' ? 120 : 0)
  const legPenalty = (g.bodyPartRepayment?.LeftLeg || g.bodyPartRepayment?.RightLeg) ? 0.90 : 1.0
  const pay = Math.floor(basePay * integrity * legPenalty)
  g.econ.cash += pay
  g.stats.focus = clamp(g.stats.focus - 4, 0, 100)
  addLog('打工', `你赚到¥${pay}。这点钱能换来一口气，或者一针药。`, 'ok')
}

function applyBuyAction(g: GameState, addLog: AddLog): void {
  const cost = g.bodyReputation === 'marked' ? Math.floor(260 * 1.15) : 260
  if (g.econ.cash >= cost) {
    g.econ.cash -= cost
    g.stats.focus = clamp(g.stats.focus + 10, 0, 100)
    g.stats.fatigue = clamp(g.stats.fatigue - 6, 0, 100)
    g.buyDebasement = (g.buyDebasement ?? 0) + 1
    const buyLogDetail = (g.buyDebasement ?? 0) >= 3
      ? `感觉没以前管用了。但你还是把它吞下去了。`
      : `花¥${cost}买到"能让你更像机器"的东西。`
    addLog('购买补给', buyLogDetail, 'warn')
  } else {
    addLog('想买补给', '余额像嘲笑。你只能把手缩回去。', 'danger')
    g.stats.focus = clamp(g.stats.focus - 3, 0, 100)
  }
}

function applyRestAction(g: GameState, addLog: AddLog): void {
  g.stats.focus = clamp(g.stats.focus + 6, 0, 100)
  addLog('休息', '你偷回了一点人味。', 'info')
}
function applyNarrativeDelays(g: GameState): void {
  if (!g.pendingNarratives || g.pendingNarratives.length === 0) return
  const partNarratives: Record<string, string> = {
    LeftPalm: '今天握笔时，左手掌隐隐发麻，像是睡着了一样。',
    RightPalm: '右手掌在翻书时有些迟钝，像是隔了一层什么。',
    LeftArm: '左臂抬起来的时候，有一瞬间感觉不太对。可能是昨天练过头了。',
    RightArm: '右臂在吐纳时总是跟不上节奏，气息在那里绕了个弯。',
    LeftLeg: '走路时左腿偶尔会有一种说不清的沉重感，停下来又没事了。',
    RightLeg: '右腿在上楼梯时比平时慢了半拍，自己都没注意到。'
  }
  const triggered: Array<{ day: number; partId: string }> = []
  const remaining: Array<{ day: number; partId: string }> = []
  for (const entry of g.pendingNarratives) {
    if (g.school.day - entry.day === 3) triggered.push(entry)
    else remaining.push(entry)
  }
  g.pendingNarratives = remaining
  for (const entry of triggered) {
    const detail = partNarratives[entry.partId] ?? '身体某处隐隐有些不对劲，但说不清楚在哪里。'
    g.logs.unshift({ id: uid('log'), day: g.school.day, title: '身体感受', detail, tone: 'info' })
    if (g.logs.length > 120) g.logs.pop()
  }
}

function applyWeeklyExam(g: GameState, rand: () => number): void {
  const score = Engine.scoreForExam(g, rand)
  const tier = Engine.determineTier(score)
  g.school.lastExamScore = score
  g.school.classTier = tier
  g.school.perks = Engine.perksForTier(tier)
  const rank = clamp(201 - Math.floor((score - 480) / 1.2), 1, 200)
  g.school.lastRank = rank
  g.logs.unshift({ id: uid('log'), day: g.school.day - 1, title: `月考结算（第${g.school.week}周）`, detail: `总分：${score}；排名：约第${rank}名；分班：${tier}。在这里，"约"也足够杀人。`, tone: tier === '示范班' ? 'ok' : tier === '末位班' ? 'danger' : 'info' })
  if (g.logs.length > 120) g.logs.pop()
}

function applyDelinquencyCheck(g: GameState, minPaymentVal: number): void {
  if (minPaymentVal <= 0) return
  const daysSincePay = (g.school.day - 1) - g.econ.lastPaymentDay
  if (daysSincePay <= 7) return
  g.econ.delinquency += 1
  if (g.econ.delinquency === 1) {
    g.logs.unshift({ id: uid('log'), day: g.school.day - 1, title: '逾期警告', detail: '信用评级开始下滑。催收人员正在关注你。', tone: 'warn' })
  } else if (g.econ.delinquency >= 3) {
    g.logs.unshift({ id: uid('log'), day: g.school.day - 1, title: '严重逾期', detail: '催收压力正在转化为具体的身体威胁。', tone: 'danger' })
  }
  if (g.econ.delinquency >= 2) {
    const beforeRate = g.econ.dailyRate
    const multiplier = 1 + 0.1 * (g.econ.delinquency - 1)
    const afterRate = Math.min(0.05, Number((beforeRate * multiplier).toFixed(4)))
    g.econ.dailyRate = afterRate
    const detail = afterRate > beforeRate
      ? `逾期${g.econ.delinquency}级，日利率由 ${(beforeRate * 100).toFixed(2)}% 上浮至 ${(afterRate * 100).toFixed(2)}%。`
      : `你的日利率已达到系统上限 ${(afterRate * 100).toFixed(2)}%，继续逾期只会放大其他风险。`
    g.logs.unshift({ id: uid('log'), day: g.school.day - 1, title: '利率上浮', detail, tone: 'warn' })
  }
  if (g.logs.length > 120) g.logs.pop()
}

function splitInitialDebt(initialDebt: number): { core: number; principal: number } {
  const debt = Math.max(0, Math.floor(initialDebt))
  const core = Math.floor(debt * 0.7)
  const principal = debt - core
  return { core, principal }
}

function coreDebtFloor(g: GameState): number {
  return Math.max(500, Math.floor((g.econ.initialCoreDebt || 0) * 0.5))
}

function updateCoreDebtByState(g: GameState): { before: number; after: number; delta: number } {
  const before = Math.max(0, g.econ.coreDebt)
  const floor = coreDebtFloor(g)
  const delinquency = Math.max(0, g.econ.delinquency)
  const rawDaysSincePay = (g.school.day - 1) - g.econ.lastPaymentDay
  const rollingDebt = g.econ.collectionFee + g.econ.debtInterestAccrued + g.econ.debtPrincipal
  const daysSincePay = rollingDebt <= 0 ? 0 : rawDaysSincePay

  let next = before
  if (delinquency >= 3) {
    next = before + 300 + 100 * delinquency
  } else if (delinquency === 0 && daysSincePay <= 7) {
    next = Math.max(floor, before - 120)
  } else if (delinquency === 0) {
    next = before + 40
  } else {
    next = before + 100
  }

  g.econ.coreDebt = Math.max(floor, Math.floor(next))
  return {
    before,
    after: g.econ.coreDebt,
    delta: g.econ.coreDebt - before
  }
}

function weeklySystemFee(delinquency: number): number {
  return 600 + Math.max(0, delinquency) * 200
}

function applyWeeklyCollectionFee(g: GameState): number {
  const fee = weeklySystemFee(g.econ.delinquency)
  g.econ.collectionFee = Math.max(0, g.econ.collectionFee + fee)
  return fee
}

function applyRepaymentByPriority(g: GameState, budget: number): { feePaid: number; interestPaid: number; principalPaid: number; totalPaid: number } {
  let remaining = Math.max(0, Math.floor(budget))

  const feePaid = Math.min(remaining, Math.max(0, g.econ.collectionFee))
  g.econ.collectionFee = Math.max(0, g.econ.collectionFee - feePaid)
  remaining -= feePaid

  const interestPaid = Math.min(remaining, Math.max(0, g.econ.debtInterestAccrued))
  g.econ.debtInterestAccrued = Math.max(0, g.econ.debtInterestAccrued - interestPaid)
  remaining -= interestPaid

  const principalPaid = Math.min(remaining, Math.max(0, g.econ.debtPrincipal))
  g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal - principalPaid)

  return {
    feePaid,
    interestPaid,
    principalPaid,
    totalPaid: feePaid + interestPaid + principalPaid
  }
}

function executeImmediatePayment(g: GameState, requestedAmount: number) {
  const budget = Math.max(0, Math.floor(requestedAmount))
  const repayment = applyRepaymentByPriority(g, budget)
  if (repayment.totalPaid <= 0) {
    return {
      success: false as const,
      paid: 0
    }
  }
  g.econ.cash = Math.max(0, g.econ.cash - repayment.totalPaid)
  g.econ.lastPaymentDay = g.school.day
  g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
  return {
    success: true as const,
    paid: repayment.totalPaid
  }
}

export const __test__ = {
  splitInitialDebt,
  coreDebtFloor,
  updateCoreDebtByState,
  weeklySystemFee,
  applyWeeklyCollectionFee,
  applyRepaymentByPriority,
  executeImmediatePayment
}

function buildRepaymentEvent(
  g: GameState,
  bodyPartPrereqs: Record<string, string>,
  rand: () => number
): PendingEvent {
  const repaid = g.bodyPartRepayment ?? {}
  const availableParts = (['LeftPalm', 'RightPalm', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'] as const).filter(id => !repaid[id])
  const partBaseLabels: Record<string, string> = { LeftPalm: '左手掌', RightPalm: '右手掌', LeftArm: '左臂', RightArm: '右臂', LeftLeg: '左腿', RightLeg: '右腿' }
  const mandatory = Engine.shouldTriggerRepaymentEvent(g, rand).mandatory
  const options: PendingEvent['options'] = [{ id: 'immediate_payment', label: '立即还款', tone: 'primary' }]
  for (const partId of availableParts) {
    const prereq = bodyPartPrereqs[partId]
    const prereqMissing = prereq && !repaid[prereq]
    const dynamicValue = Engine.calculateDynamicValuation(partId, { faLi: g.stats.faLi, rouTi: g.stats.rouTi, fatigue: g.stats.fatigue, buyDebasement: g.buyDebasement ?? 0 })
    const baseLabel = partBaseLabels[partId] ?? partId
    const prereqHint = partId === 'LeftArm' ? '需先偿还左手掌' : partId === 'RightArm' ? '需先偿还右手掌' : ''
    const label = prereqMissing ? `${baseLabel}（减免¥${dynamicValue.toLocaleString()}，${prereqHint}）` : `${baseLabel}（减免¥${dynamicValue.toLocaleString()}）`
    options.push({ id: `repay_${partId.toLowerCase()}`, label, tone: 'danger' })
  }
  if (!mandatory) options.push({ id: 'refuse', label: '拒绝（继续承受压力）', tone: 'normal' })
  const title = mandatory ? '强制执行：用身体偿还' : '最后的选择：用身体偿还'
  const body = mandatory
    ? '你已经没有选择的余地。催收人员站在你面前，合同已经签好。偿还后的身体部位无法恢复。这不是游戏机制，这是你的选择。'
    : '债务压垮了你的最后一道防线。他们提出了一个"解决方案"。偿还后的身体部位无法恢复。这不是游戏机制，这是你的选择。'
  return { title, body, options, mandatory }
}

export function useGame() {
  const { game } = useGameState()
  const { activeSlot, saveToSlot, loadFromSlot, listSlots, buildMeta, STORAGE_KEY, LEGACY_STORAGE_KEY } = useGameStorage()

  const BODY_PART_LABELS: Record<string, string> = {
    LeftPalm: '左手掌',
    RightPalm: '右手掌',
    LeftArm: '左臂',
    RightArm: '右臂',
    LeftLeg: '左腿',
    RightLeg: '右腿'
  }

  const BODY_PART_PREREQS: Record<string, string> = {
    LeftArm: 'LeftPalm',
    RightArm: 'RightPalm'
  }

  const totalDebt = computed(() =>
    Math.max(0, game.value.econ.coreDebt + game.value.econ.collectionFee + game.value.econ.debtPrincipal + game.value.econ.debtInterestAccrued)
  )

  const minPayment = computed(() => {
    const debt = totalDebt.value
    if (debt <= 0) return 0
    return Math.max(280, Math.floor(debt * 0.08))
  })

  const nextLabel = computed(() => Engine.describeSlot(game.value.school.slot))

  const accumulatedMinPayment = computed(() => Engine.calculateAccumulatedMinPayment(game.value))

  const reset = () => {
    game.value = defaultState()
    if (!import.meta.server) {
      localStorage.removeItem(STORAGE_KEY)
    }
    activeSlot.value = 'autosave'
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
    g.econ.collectionFee = 0
    g.econ.dailyRate = bgRate
    cfg.initialDebt = Math.max(5000, cfg.initialDebt)
    const split = splitInitialDebt(cfg.initialDebt)
    g.econ.coreDebt = split.core
    g.econ.initialCoreDebt = split.core
    g.econ.debtPrincipal = split.principal
    g.stats.faLi = round1(tFa)
    g.stats.focus = tFocus
    g.stats.daoXin = 1
    g.stats.rouTi = 0.6
    g.school.classTier = '普通班'
    g.school.perks = Engine.perksForTier('普通班')
    g.logs = [
      {
        id: uid('log'),
        day: 1,
        title: '开局',
        detail: `你叫“${cfg.playerName}”。城市：${cfg.startingCity}。出身：${cfg.background}。天赋：${cfg.talent}。核心债¥${g.econ.coreDebt.toLocaleString()}，滚动债¥${g.econ.debtPrincipal.toLocaleString()}。`,
        tone: 'info'
      }
    ]

    game.value = g
    saveToSlot('autosave', '自动存档')
  }

  const creditLimit = computed(() => Math.max(2000, 50000 - totalDebt.value))

  const borrow = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    if (a > creditLimit.value) {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title: '额度不足', detail: `当前可借额度仅¥${Math.floor(creditLimit.value).toLocaleString()}，申请被拒绝。`, tone: 'danger' })
      if (g.logs.length > 120) g.logs.pop()
      saveToSlot(activeSlot.value)
      return
    }
    const effectivePrincipal = g.bodyReputation === 'marked' ? Math.floor(a * 1.2) : a
    g.econ.debtPrincipal += effectivePrincipal
    g.econ.cash += a
    const logDetail = g.bodyReputation === 'marked'
      ? `经系统评估，您的申请已通过。到账¥${a.toLocaleString()}。`
      : `你借到¥${a.toLocaleString()}。利息不会因为你的梦想而心软。`
    g.logs.unshift({ id: uid('log'), day: g.school.day, title: '借贷到账', detail: logDetail, tone: 'warn' })
    if (g.logs.length > 120) g.logs.pop()
    saveToSlot(activeSlot.value)
  }

  const repay = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    if (g.econ.cash <= 0) return
    const budget = Math.min(a, g.econ.cash, totalDebt.value)
    const repayment = applyRepaymentByPriority(g, budget)
    if (repayment.totalPaid <= 0) {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title: '暂无可偿还滚动债', detail: '当前仅剩核心债。核心债不会被日常还款直接冲减，会在每周风控结算中按状态动态调整。', tone: 'warn' })
      if (g.logs.length > 120) g.logs.pop()
      saveToSlot(activeSlot.value)
      return
    }
    g.econ.cash -= repayment.totalPaid
    g.econ.lastPaymentDay = g.school.day
    let delinquencyNote = ''
    if (repayment.totalPaid >= minPayment.value && g.econ.delinquency > 0) {
      g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
      delinquencyNote = ` 逾期等级降低至${g.econ.delinquency}级。`
    }
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day,
      title: '还款',
      detail: `你还了¥${repayment.totalPaid.toLocaleString()}（费用¥${repayment.feePaid.toLocaleString()}、利息¥${repayment.interestPaid.toLocaleString()}、本金¥${repayment.principalPaid.toLocaleString()}）。${delinquencyNote}核心债仍为¥${g.econ.coreDebt.toLocaleString()}。`,
      tone: 'ok'
    })
    if (g.logs.length > 120) g.logs.pop()
    saveToSlot(activeSlot.value)
  }

  const executeBodyPartRepayment = (g: GameState, partId: string) => {
    const prereq = BODY_PART_PREREQS[partId]
    if (prereq && !g.bodyPartRepayment?.[prereq]) {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title: '无法偿还', detail: `需要先偿还${BODY_PART_LABELS[prereq]}，才能偿还${BODY_PART_LABELS[partId]}。`, tone: 'warn' })
      if (g.logs.length > 120) g.logs.pop()
      return
    }

    const rawValue = Engine.calculateDynamicValuation(partId, { faLi: g.stats.faLi, rouTi: g.stats.rouTi, fatigue: g.stats.fatigue, buyDebasement: g.buyDebasement ?? 0 })
    const label = BODY_PART_LABELS[partId] ?? partId
    const rollingDebtNow = g.econ.collectionFee + g.econ.debtPrincipal + g.econ.debtInterestAccrued
    const value = Math.min(rawValue, Math.max(0, rollingDebtNow))
    const repayment = applyRepaymentByPriority(g, value)

    if (!g.bodyPartRepayment) g.bodyPartRepayment = {}
    g.bodyPartRepayment[partId] = true
    g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
    g.lastBodyPartRepaymentDay = g.school.day
    g.bodyIntegrity = (g.bodyIntegrity ?? 1.0) * 0.8
    g.bodyReputation = 'marked'
    g.lastBodyPartDay = g.school.day
    if (!g.pendingNarratives) g.pendingNarratives = []
    g.pendingNarratives.push({ day: g.school.day, partId })

    g.logs.unshift({
      id: uid('log'),
      day: g.school.day,
      title: '身体部位偿还',
      detail: `你偿还了${label}，减免滚动债¥${repayment.totalPaid.toLocaleString()}（费用¥${repayment.feePaid.toLocaleString()}、利息¥${repayment.interestPaid.toLocaleString()}、本金¥${repayment.principalPaid.toLocaleString()}）。核心债仍保留。`,
      tone: 'danger'
    })
    if (g.logs.length > 120) g.logs.pop()

    saveToSlot(activeSlot.value)
  }

  const resolveEvent = (optionId: string) => {
    const g = game.value
    const event = g.pendingEvent
    if (!event) return
    const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
      if (g.logs.length > 120) g.logs.pop()
    }
    const integrity = g.bodyIntegrity ?? 1.0
    const fatigueMult = 2 - integrity

    if (optionId.startsWith('repay_')) {
      const partIdStr = optionId.split('_')[1] ?? ''
      const partIdMap: Record<string, string> = { leftpalm: 'LeftPalm', rightpalm: 'RightPalm', leftarm: 'LeftArm', rightarm: 'RightArm', leftleg: 'LeftLeg', rightleg: 'RightLeg' }
      const actualPartId = partIdMap[partIdStr]
      if (actualPartId) executeBodyPartRepayment(g, actualPartId)
    } else if (optionId === 'immediate_payment') {
      const pay = accumulatedMinPayment.value
      if (g.econ.cash >= pay) {
        const result = executeImmediatePayment(g, pay)
        if (!result.success) addLog('还款失败', '当前仅剩核心债，系统最低还款不会直接冲减核心债。', 'danger')
        else {
          addLog('还款成功', `你支付了¥${result.paid.toLocaleString()}，逾期等级下降1级。`, 'ok')
        }
      } else {
        addLog('还款失败', '余额不足。', 'danger')
      }
    } else if (optionId === 'forced_tuna') {
      const fatigueUp = Math.round(3 * fatigueMult)
      g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)
      g.stats.faLi = round1(g.stats.faLi + 0.12 + (g.stats.daoXin - 1) * 0.02)
      g.stats.focus = clamp(g.stats.focus - 1, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 1, 0, 100)
      addLog('契约反噬·被迫吐纳', '你被迫把呼吸压成细线。法力涨了一点，但你更像一台被驱动的机器。', 'warn')
    } else if (optionId === 'forced_study') {
      const fatigueUp = Math.round(5 * fatigueMult)
      g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)
      const focusFactor = (g.stats.focus + g.school.perks.focusBonus) / 100
      const palmPenalty = (g.bodyPartRepayment?.LeftPalm || g.bodyPartRepayment?.RightPalm) ? 0.95 : 1.0
      const faLiGain = (0.05 + focusFactor * 0.06) * integrity * palmPenalty
      g.stats.faLi = round1(g.stats.faLi + faLiGain)
      g.stats.focus = clamp(g.stats.focus + 2, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 1, 0, 100)
      addLog('契约反噬·被迫刷题', '你被迫低头做题。分数可能会救你一次，但它也把锁链拧得更紧。', 'warn')
    } else if (optionId === 'defy') {
      g.stats.focus = clamp(g.stats.focus - 16, 0, 100)
      g.stats.fatigue = clamp(g.stats.fatigue + 12, 0, 100)
      g.contract.vigilance = clamp(g.contract.vigilance + 10, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 4, 0, 100)
      g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + 120)
      addLog('契约反噬·硬抗代价', '你硬扛了这次命令。代价马上到账：更累、更乱、更贵。', 'danger')
    } else if (event.eventId) {
      const definition = ALL_EVENTS.find(def => def.id === event.eventId)
      if (!definition) {
        addLog('事件配置异常', `未找到事件定义：${event.eventId}。`, 'warn')
      } else {
        const option = definition.options.find(opt => opt.id === optionId)
        if (!option) addLog('事件配置异常', `事件 ${event.eventId} 未找到选项 ${optionId}。`, 'warn')
        else applyEventEffects(g, option.effects)
      }
    }

    g.pendingEvent = undefined
    saveToSlot(activeSlot.value)
  }

  const applyEventEffects = (g: GameState, effects: EventEffect[]) => {
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
          if (key === 'fatigue' || key === 'focus') next = clamp(next, 0, 100)
          else next = Math.max(0, next)
          g.stats[key] = next
          break
        }
        case 'econ': {
          const key = effect.target
          const current = g.econ[key]
          const next = Math.max(0, current + effect.delta)
          g.econ[key] = next
          break
        }
        case 'debt': {
          if (effect.mode === 'addPrincipal') g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal + effect.amount)
          else if (effect.mode === 'addInterest') {
            const totalDebtVal = g.econ.debtPrincipal + g.econ.debtInterestAccrued
            const amount = effect.amount === 0 ? Math.floor(totalDebtVal * 0.3) : effect.amount
            g.econ.debtInterestAccrued = Math.max(0, g.econ.debtInterestAccrued + amount)
          }
          break
        }
        case 'contract': {
          if (effect.target === 'active' && effect.value !== undefined) g.contract.active = effect.value
          else if (effect.target === 'progress' && effect.delta !== undefined) g.contract.progress = clamp(g.contract.progress + effect.delta, 0, 100)
          else if (effect.target === 'vigilance' && effect.delta !== undefined) g.contract.vigilance = clamp(g.contract.vigilance + effect.delta, 0, 100)
          break
        }
        case 'school': {
          if (effect.target === 'classTier') {
            g.school.classTier = effect.value
            g.school.perks = Engine.perksForTier(effect.value)
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

  const randomEventAfterAction = (g: GameState, rand: () => number): PendingEvent | undefined => {
    const repaymentCheck = Engine.shouldTriggerRepaymentEvent(g, rand)
    if (repaymentCheck.trigger) {
      return buildRepaymentEvent(g, BODY_PART_PREREQS, rand)
    }

    const baseP = clamp(0.04 + g.econ.delinquency * 0.04, 0, 0.35)
    if (rand() > baseP) return undefined

    const pool = getEventsByPhase('afterAction')
    const candidates = pool.filter((event) => {
      if (!Engine.eventMatchesTrigger(event, g)) return false
      if (Engine.isEventOnCooldown(g, event)) return false
      if (Engine.hasEventReachedMaxTimes(g, event)) return false
      return true
    })

    const picked = Engine.pickWeightedEvent(candidates, rand)
    if (!picked) return undefined

    if (!g.eventHistory) g.eventHistory = {}
    const entry = g.eventHistory[picked.id] || { lastDay: 0, times: 0 }
    entry.lastDay = g.school.day
    entry.times += 1
    g.eventHistory[picked.id] = entry

    return Engine.toPendingEvent(picked)
  }

  const act = (action: ActionId) => {
      const g = game.value
      if (!g.started || g.pendingEvent) return
      if (g.school.day >= Engine.maxGameDays()) return

      const rand = mulberry32(g.seed + g.school.day * 31 + Engine.slotOrder().indexOf(g.school.slot) * 997)

      if (Engine.contractWouldTrigger(g, action, rand)) {
        g.contract.lastTriggerDay = g.school.day
        g.contract.lastTriggerSlot = g.school.slot
        g.contract.progress = clamp(g.contract.progress + 2, 0, 100)
        g.contract.vigilance = clamp(g.contract.vigilance + (action === 'rest' ? 6 : 2), 0, 100)
        g.pendingEvent = Engine.makeContractBacklashEvent(g, action)
        saveToSlot(activeSlot.value)
        return
      }

      const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
        g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
        if (g.logs.length > 120) g.logs.pop()
      }

      const integrity = g.bodyIntegrity ?? 1.0
      const fatigueMult = 2 - integrity
      const baseFatigueUp = action === 'rest' ? -14 : action === 'tuna' ? 3 : action === 'study' ? 5 : action === 'train' ? 10 : action === 'parttime' ? 12 : 6
      const fatigueUp = baseFatigueUp < 0 ? baseFatigueUp : Math.round(baseFatigueUp * fatigueMult)
      g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)

      if (action === 'study') applyStudyAction(g, integrity, addLog)
      else if (action === 'tuna') applyTunaAction(g, addLog)
      else if (action === 'train') applyTrainAction(g, integrity, rand, addLog)
      else if (action === 'parttime') applyParttimeAction(g, integrity, rand, addLog)
      else if (action === 'buy') applyBuyAction(g, addLog)
      else if (action === 'rest') applyRestAction(g, addLog)

      if (totalDebt.value > 0) {
        const daily = g.econ.dailyRate
        const segmentRate = daily / 3
        const interestBase = g.econ.coreDebt + g.econ.debtPrincipal + g.econ.debtInterestAccrued
        g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + interestBase * segmentRate)
      }

      if (g.school.slot === 'morning') g.econ.cash += g.school.perks.mealSubsidy

      g.pendingEvent = randomEventAfterAction(g, rand)

      const idx = Engine.slotOrder().indexOf(g.school.slot)
      const nextSlot = Engine.slotOrder()[idx + 1]
      if (idx < Engine.slotOrder().length - 1 && nextSlot) g.school.slot = nextSlot
      else endDay()

      saveToSlot(activeSlot.value)
    }

  const endDay = () => {
    const g = game.value
    if (g.school.day >= Engine.maxGameDays()) {
      g.school.day = Engine.maxGameDays()
      g.school.slot = 'morning'
      return
    }
    g.buyDebasement = Math.max(0, (g.buyDebasement ?? 0) - 0.2)
    g.school.day += 1
    g.school.slot = 'morning'
    g.stats.fatigue = clamp(g.stats.fatigue - 6, 0, 100)
    g.stats.focus = clamp(g.stats.focus + 1, 0, 100)

    applyNarrativeDelays(g)

    if ((g.school.day - 1) % 7 === 0) {
      const settledDay = g.school.day - 1
      const previousTier = g.school.classTier
      const previousPerks = { ...g.school.perks }
      const rand = mulberry32(g.seed + g.school.week * 777)
      applyWeeklyExam(g, rand)
      const weeklyFee = applyWeeklyCollectionFee(g)
      g.logs.unshift({ id: uid('log'), day: g.school.day - 1, title: '系统计费', detail: `学籍维护费与风控费共计¥${weeklyFee.toLocaleString()}已计入系统费用。`, tone: 'warn' })
      if (g.logs.length > 120) g.logs.pop()
      applyDelinquencyCheck(g, minPayment.value)
      const coreDebtChange = updateCoreDebtByState(g)
      if (coreDebtChange.delta !== 0) {
        const trend = coreDebtChange.delta > 0 ? '上浮' : '下调'
        g.logs.unshift({
          id: uid('log'),
          day: g.school.day - 1,
          title: '核心债风控重估',
          detail: `本周风控重估后，核心债${trend}¥${Math.abs(coreDebtChange.delta).toLocaleString()}（¥${coreDebtChange.before.toLocaleString()} → ¥${coreDebtChange.after.toLocaleString()}）。`,
          tone: coreDebtChange.delta > 0 ? 'warn' : 'ok'
        })
        if (g.logs.length > 120) g.logs.pop()
      }

      const debtPressure = g.econ.delinquency >= 4
        ? '极高'
        : g.econ.delinquency >= 2
          ? '高'
          : g.econ.delinquency >= 1
            ? '中'
            : '低'
      const tierChange = previousTier === g.school.classTier ? '维持不变' : `${previousTier}→${g.school.classTier}`
      const perkChange = previousPerks.mealSubsidy === g.school.perks.mealSubsidy && previousPerks.focusBonus === g.school.perks.focusBonus
        ? `下周待遇变化：维持（餐补¥${g.school.perks.mealSubsidy}/日，专注加成${g.school.perks.focusBonus}）`
        : `下周待遇变化：餐补¥${previousPerks.mealSubsidy}→¥${g.school.perks.mealSubsidy}/日，专注加成${previousPerks.focusBonus}→${g.school.perks.focusBonus}`
      g.logs.unshift({
        id: uid('log'),
        day: settledDay,
        title: `周结算通报（第${g.school.week}周）`,
        detail: `分数：${g.school.lastExamScore}；分班变化：${tierChange}；债务压力：${debtPressure}；${perkChange}。本通报已归档，系统将继续执行下一日流程。`,
        tone: debtPressure === '高' || debtPressure === '极高' ? 'warn' : 'info'
      })
      if (g.logs.length > 120) g.logs.pop()
      g.school.week += 1
    }
  }

  const migrateLegacy = () => {
    if (import.meta.server) return
    const already = localStorage.getItem(STORAGE_KEY)
    if (already) return
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacyRaw) return
    try {
      const legacyState = JSON.parse(legacyRaw) as GameState
      if (typeof legacyState.econ.coreDebt !== 'number' || legacyState.econ.coreDebt < 0) legacyState.econ.coreDebt = 0
      if (typeof legacyState.econ.initialCoreDebt !== 'number' || legacyState.econ.initialCoreDebt < 0) legacyState.econ.initialCoreDebt = legacyState.econ.coreDebt
      const container = { activeSlot: 'autosave' as SaveSlotId, slots: { autosave: { meta: buildMeta('autosave', '自动存档（迁移）', legacyState), state: legacyState } } }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(container))
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch { /* ignore */ }
  }

  return {
    game,
    activeSlot,
    saveToSlot,
    loadFromSlot,
    listSlots,
    migrateLegacy,
    reset,
    startNew,
    totalDebt,
    minPayment,
    accumulatedMinPayment,
    creditLimit,
    nextLabel,
    act,
    borrow,
    repay,
    resolveEvent
  }
}
