import type {
  ActionId,
  EventEffect,
  GameState,
  PendingEvent,
  StartConfig
} from '~/types/game'
import { computed } from 'vue'
import { clamp, mulberry32, round1, uid } from '~/utils/rng'
import { ALL_EVENTS, getEventsByPhase } from '~/utils/events'
import { buildInstitutionalEventLogDetail } from '~/logic/eventInstitutionalLog'
import * as Engine from '~/logic/gameEngine'
import { useGameState, defaultState } from './useGameState'
import { useGameStorage, type SaveSlotId } from './useGameStorage'

// ========================================
// 模块级行动子函数（非 export，仅供 act() 调用）
// ========================================

type AddLog = (title: string, detail: string, tone?: 'info' | 'warn' | 'danger' | 'ok') => void

type ActionSnapshot = {
  cash: number
  fatigue: number
  focus: number
  faLi: number
  rouTi: number
}

function pickActionSummaryItems(action: ActionId, before: ActionSnapshot, after: ActionSnapshot): string[] {
  const deltaCash = after.cash - before.cash
  const deltaFatigue = after.fatigue - before.fatigue
  const deltaFocus = after.focus - before.focus
  const deltaFaLi = after.faLi - before.faLi
  const deltaRouTi = after.rouTi - before.rouTi
  const withSign = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  if (action === 'study') {
    return [`法力${withSign(round1(deltaFaLi))}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  if (action === 'tuna') {
    return [`法力${withSign(round1(deltaFaLi))}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  if (action === 'train') {
    return [`肉体${withSign(round1(deltaRouTi))}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  if (action === 'parttime') {
    return [`现金${withSign(deltaCash)}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  if (action === 'buy') {
    return [`现金${withSign(deltaCash)}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  return [`专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`, `法力${withSign(round1(deltaFaLi))}`]
}

function mergeNarrativeAndSummary(narrative: string, summaryItems: string[]): string {
  return `${narrative} 摘要：${summaryItems.join('｜')}`
}

function remainingSlotsFor(slot: GameState['school']['slot']): number {
  if (slot === 'morning') return 3
  if (slot === 'afternoon') return 2
  return 1
}

function applyStudyAction(g: GameState, integrity: number, addLog: AddLog): void {
  const focusFactor = (g.stats.focus + g.school.perks.focusBonus) / 100
  const palmPenalty = (g.bodyPartRepayment?.LeftPalm || g.bodyPartRepayment?.RightPalm) ? 0.95 : 1.0
  const classStudyMultiplier = Engine.debtProfileForTier(g.school.classTier).studyGainMultiplier
  const imb = Engine.studyGainImbalanceMultiplier(g)
  let faLiGain = (0.05 + focusFactor * 0.06) * integrity * palmPenalty * classStudyMultiplier * imb
  faLiGain = Engine.applyCollapseModifierToAction(g, 'study', faLiGain)
  g.stats.faLi = round1(g.stats.faLi + faLiGain)
  g.stats.focus = clamp(g.stats.focus + 2, 0, 100)
  addLog('上课/刷题', `你把时间换成了0.1点不到的优势。对别人来说，这足够决定命运。`, 'info')
}

function applyTunaAction(g: GameState, addLog: AddLog): void {
  let delta = 0.12 + (g.stats.daoXin - 1) * 0.02
  delta = Engine.applyCollapseModifierToAction(g, 'tuna', delta)
  g.stats.faLi = round1(g.stats.faLi + delta)
  g.stats.focus = clamp(g.stats.focus - 1, 0, 100)
  addLog('吐纳', '你把呼吸拧成一条线。法力像细流汇入气海。', 'ok')
}

function applyTrainAction(g: GameState, integrity: number, rand: () => number, addLog: AddLog): void {
  const risk = clamp((g.stats.fatigue - 60) / 120, 0, 0.25)
  const baseGain = 0.06 + (g.stats.rouTi < 1.2 ? 0.02 : 0)
  const armPenalty = (g.bodyPartRepayment?.LeftArm || g.bodyPartRepayment?.RightArm) ? 0.90 : 1.0
  let rouTiGain = baseGain * integrity * armPenalty
  rouTiGain = Engine.applyCollapseModifierToAction(g, 'train', rouTiGain)
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
  const payMult = Engine.parttimePayImbalanceMultiplier(g)
  let pay = Math.floor(basePay * integrity * legPenalty * payMult)
  pay = Math.floor(Engine.applyCollapseModifierToAction(g, 'parttime', pay))
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

/**
 * PSY-01 D-06～D-07：休息先经 Engine 倍率/麻木分支，再写回 focus。
 * 状态机：act 内先判麻木（与反噬分流）→ 再判 contractWouldTrigger → 此处 skipNumbCheck 避免二次麻木随机。
 */
function applyRestAction(
  g: GameState,
  addLog: AddLog,
  opts: { mode: 'numb' } | { mode: 'recover'; rand: () => number }
) {
  if (opts.mode === 'numb') {
    const rest = Engine.computeRestRecovery(g, { rand: () => 0, forceNumb: true })
    g.stats.focus = clamp(g.stats.focus + rest.focusDelta, 0, 100)
    g.numbness = clamp((g.numbness ?? 0) + 4, 0, 100)
    addLog('休息', '制度记录：麻木休息。你几乎没拿回状态，时间照样推进。', 'warn')
    return
  }
  const rest = Engine.computeRestRecovery(g, { rand: opts.rand, skipNumbCheck: true })
  g.stats.focus = clamp(g.stats.focus + rest.focusDelta, 0, 100)
  addLog('休息', '你偷回了一点人味。', 'info')
}
function finalizeDayRouteStreak(g: GameState, addLog: AddLog): void {
  const kind = Engine.classifyDayRoute(g.daySlotActions ?? {})
  Engine.updateRouteStreaks(g, kind)
  const maxStreak = Math.max(g.scoreDayStreak ?? 0, g.cashDayStreak ?? 0)
  if (maxStreak >= 2) {
    const day = g.school.day
    const last = g.lastConflictNoticeDay ?? -999
    if (day - last >= 2) {
      g.lastConflictNoticeDay = day
      const label = (g.scoreDayStreak ?? 0) >= 2 ? '刷分' : '打工'
      addLog(
        '制度记录：路线失衡',
        `系统记录到${label}路线连续偏科。相关边际与现金链参数已调整。不提供策略建议。`,
        'warn'
      )
    }
  }
  g.daySlotActions = {}
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
  const prevLevel = Engine.normalizeDelinquencyLevel(g.econ.delinquency)
  const nextLevel = Engine.nextWeeklyDelinquencyLevel(prevLevel, daysSincePay)
  if (nextLevel <= prevLevel) return
  g.econ.delinquency = nextLevel

  if (g.econ.delinquency === 1) {
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day - 1,
      title: '逾期警告',
      detail: '系统记录到首次逾期。当前仅发出警告，后续周结算将持续提高制度压力。',
      tone: 'warn'
    })
  } else if (g.econ.delinquency >= 3) {
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day - 1,
      title: '严重逾期',
      detail: `系统将你标记为高风险账户（${g.econ.delinquency}级）。催收频次、最低周还款与利率上浮将继续执行。`,
      tone: 'danger'
    })
  }

  if (g.econ.delinquency >= 2) {
    const policy = Engine.delinquencyPolicy(g.econ.delinquency)
    const tierDebtProfile = Engine.debtProfileForTier(g.school.classTier)
    const beforeRate = g.econ.dailyRate
    const afterRate = Math.min(0.05, Number((beforeRate * policy.rateStepMultiplier * tierDebtProfile.dailyRateMultiplier).toFixed(4)))
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

  const interestPaid = Math.min(remaining, Math.max(0, g.econ.debtInterestAccrued))
  g.econ.debtInterestAccrued = Math.max(0, g.econ.debtInterestAccrued - interestPaid)
  remaining -= interestPaid

  const feePaid = Math.min(remaining, Math.max(0, g.econ.collectionFee))
  g.econ.collectionFee = Math.max(0, g.econ.collectionFee - feePaid)
  remaining -= feePaid

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
  executeImmediatePayment,
  buildInstitutionalEventLogDetail
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
  return {
    title,
    body,
    options,
    mandatory,
    /** D-16：非强制时 ESC/遮罩等价拒绝 */
    defaultOptionId: mandatory ? undefined : 'refuse',
    tier: 'critical',
    systemSummary: '身体部位偿还按动态估值冲减滚动债；核心债不因日常路径直接清零。',
    systemDetails: '具体冲减分项以结算执行结果为准；本区不提供策略建议。'
  }
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
    return Engine.calculateTierAdjustedMinPayment(totalDebt.value, game.value.econ.delinquency, game.value.school.classTier)
  })

  const nextLabel = computed(() => Engine.describeSlot(game.value.school.slot))
  const remainingSlots = computed(() => remainingSlotsFor(game.value.school.slot))

  const accumulatedMinPayment = computed(() => Engine.calculateAccumulatedMinPayment(game.value))

  const classPressureDigest = computed(() => {
    const g = game.value
    const latestWeeklyReport = g.logs.find((log: GameState['logs'][number]) => log.title.includes('周结算通报'))
    const tierDebtProfile = Engine.debtProfileForTier(g.school.classTier)
    const weeklyChangeMatch = latestWeeklyReport?.detail.match(/分班变化：([^；]+)；/)
    return {
      weeklyClassChange: weeklyChangeMatch?.[1] ?? '等待首轮周结算',
      nextWeekPerks: `餐补¥${g.school.perks.mealSubsidy}/天，专注加成${g.school.perks.focusBonus >= 0 ? '+' : ''}${g.school.perks.focusBonus}`,
      riskShiftSummary: `利率×${tierDebtProfile.dailyRateMultiplier.toFixed(2)}，最低周还款×${tierDebtProfile.minWeeklyPaymentMultiplier.toFixed(2)}，催收权重×${tierDebtProfile.collectionRiskWeight.toFixed(2)}`
    }
  })

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
    g.daySlotActions = {}
    g.scoreDayStreak = 0
    g.cashDayStreak = 0
    g.lastConflictNoticeDay = undefined
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
      g.logs.unshift({ id: uid('log'), day: g.school.day, title: '还款未记账', detail: '当前仅剩核心债。核心债不会被日常还款直接冲减，系统将在周结算中执行重估。', tone: 'warn' })
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
      detail: `系统已记账：¥${repayment.totalPaid.toLocaleString()}（利息¥${repayment.interestPaid.toLocaleString()}、费用¥${repayment.feePaid.toLocaleString()}、本金¥${repayment.principalPaid.toLocaleString()}）。${delinquencyNote}核心债维持¥${g.econ.coreDebt.toLocaleString()}。`,
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
          addLog('还款记账完成', `系统已扣款¥${result.paid.toLocaleString()}，并将逾期等级下调 1 级。`, 'ok')
        }
      } else {
        addLog('还款失败', '余额不足。', 'danger')
      }
    } else if (optionId === 'forced_tuna') {
      const prevP = g.contract.progress
      const prevV = g.contract.vigilance
      const fatigueUp = Math.round(3 * fatigueMult)
      g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)
      g.stats.faLi = round1(g.stats.faLi + 0.12 + (g.stats.daoXin - 1) * 0.02)
      g.stats.focus = clamp(g.stats.focus - 1, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 1, 0, 100)
      Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
      addLog('契约反噬·被迫吐纳', '你被迫把呼吸压成细线。法力涨了一点，但你更像一台被驱动的机器。', 'warn')
    } else if (optionId === 'forced_study') {
      const prevP = g.contract.progress
      const prevV = g.contract.vigilance
      const fatigueUp = Math.round(5 * fatigueMult)
      g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)
      const focusFactor = (g.stats.focus + g.school.perks.focusBonus) / 100
      const palmPenalty = (g.bodyPartRepayment?.LeftPalm || g.bodyPartRepayment?.RightPalm) ? 0.95 : 1.0
      const imb = Engine.studyGainImbalanceMultiplier(g)
      const faLiGain = (0.05 + focusFactor * 0.06) * integrity * palmPenalty * imb
      g.stats.faLi = round1(g.stats.faLi + faLiGain)
      g.stats.focus = clamp(g.stats.focus + 2, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 1, 0, 100)
      Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
      addLog('契约反噬·被迫刷题', '你被迫低头做题。分数可能会救你一次，但它也把锁链拧得更紧。', 'warn')
    } else if (optionId === 'defy') {
      const prevP = g.contract.progress
      const prevV = g.contract.vigilance
      g.stats.focus = clamp(g.stats.focus - 16, 0, 100)
      g.stats.fatigue = clamp(g.stats.fatigue + 12, 0, 100)
      g.contract.vigilance = clamp(g.contract.vigilance + 10, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 4, 0, 100)
      Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
      g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + 120)
      addLog('契约反噬·硬抗代价', '你硬扛了这次命令。代价马上到账：更累、更乱、更贵。', 'danger')
    } else if (optionId === 'ending_continue') {
      addLog('情节结局：麻木化时刻', '你没有被强制结束。你只是把麻木当成了新的日常，然后继续推进下一天。', 'warn')
    } else if (event.eventId) {
      const definition = ALL_EVENTS.find(def => def.id === event.eventId)
      if (!definition) {
        addLog('事件配置异常', `未找到事件定义：${event.eventId}。`, 'warn')
      } else {
        const option = definition.options.find(opt => opt.id === optionId)
        if (!option) addLog('事件配置异常', `事件 ${event.eventId} 未找到选项 ${optionId}。`, 'warn')
        else {
          // EVT-02：弹窗正文不进主日志；主通道仅一条冷制度摘要（D-06）。log 类 effect 合并进 suppress，避免叙事重复刷屏。
          applyEventEffects(g, option.effects, { suppressLogEffects: true })
          const t = definition.tone
          const logTone = t === 'danger' ? 'danger' : t === 'warn' ? 'warn' : t === 'ok' ? 'ok' : 'info'
          addLog(`制度记录：${definition.title}`, buildInstitutionalEventLogDetail(option.effects), logTone)
        }
      }
    }

    g.pendingEvent = undefined
    saveToSlot(activeSlot.value)
  }

  const applyEventEffects = (
    g: GameState,
    effects: EventEffect[],
    opts?: { suppressLogEffects?: boolean }
  ) => {
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
          const prevP = g.contract.progress
          const prevV = g.contract.vigilance
          if (effect.target === 'active' && effect.value !== undefined) g.contract.active = effect.value
          else if (effect.target === 'progress' && effect.delta !== undefined) g.contract.progress = clamp(g.contract.progress + effect.delta, 0, 100)
          else if (effect.target === 'vigilance' && effect.delta !== undefined) g.contract.vigilance = clamp(g.contract.vigilance + effect.delta, 0, 100)
          Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
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
          if (opts?.suppressLogEffects) break
          addLog(effect.title, effect.detail, effect.tone)
          break
        }
        default:
          break
      }
    }
  }

  /** afterAction 随机池（不含还款强制、不含 collapse deck；collapse 由 tryEmitStrongCollapse 单独处理） */
  const randomPoolAfterAction = (g: GameState, rand: () => number): PendingEvent | undefined => {
    const imbBoost = Engine.imbalanceEventProbabilityBoost(g)
    let baseP = clamp(0.04 + g.econ.delinquency * 0.04 + imbBoost, 0, 0.42)
    // D-04：周结算游玩日仅对非强制随机门降权（还款抢先已 return；此处为 afterAction 池）
    baseP = Engine.applyWeeklyRandomDownweightToProbability(baseP, g)
    if (rand() > baseP) return undefined

    const pool = getEventsByPhase('afterAction')
    const candidates = pool.filter((event) => {
      if (event.type === 'collapse') return false
      if (!Engine.eventMatchesTrigger(event, g)) return false
      if (Engine.isEventOnCooldown(g, event)) return false
      if (Engine.isFamilyOnCooldown(g, event)) return false
      if (Engine.hasEventReachedMaxTimes(g, event)) return false
      return true
    })

    const picked = Engine.pickWeightedEvent(candidates, rand)
    if (!picked) return undefined

    Engine.recordEventTrigger(g, picked)

    return Engine.toPendingEvent(picked)
  }

  const act = (action: ActionId) => {
      const g = game.value
      if (!g.started || g.pendingEvent) return

      const slotAtStart = g.school.slot
      const rand = mulberry32(g.seed + g.school.day * 31 + Engine.slotOrder().indexOf(g.school.slot) * 997)
      const beforeAction: ActionSnapshot = {
        cash: g.econ.cash,
        fatigue: g.stats.fatigue,
        focus: g.stats.focus,
        faLi: g.stats.faLi,
        rouTi: g.stats.rouTi
      }
      const beforeLogLen = g.logs.length

      /** PSY-01：rest + 签约 → 先抽麻木（D-06），再判反噬；麻木成功则不弹反噬窗 */
      let numbRestTaken = false
      if (action === 'rest' && g.contract.active) {
        const rNumb = rand()
        numbRestTaken = Engine.shouldTakeNumbRest(g, rNumb)
      }

      if (!numbRestTaken && Engine.contractWouldTrigger(g, action, rand)) {
        const prevP = g.contract.progress
        const prevV = g.contract.vigilance
        g.contract.lastTriggerDay = g.school.day
        g.contract.lastTriggerSlot = g.school.slot
        g.contract.progress = clamp(g.contract.progress + 2, 0, 100)
        g.contract.vigilance = clamp(g.contract.vigilance + (action === 'rest' ? 6 : 2), 0, 100)
        Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
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
      else if (action === 'rest') {
        if (numbRestTaken) applyRestAction(g, addLog, { mode: 'numb' })
        else applyRestAction(g, addLog, { mode: 'recover', rand })
      }

      if (!g.daySlotActions) g.daySlotActions = {}
      g.daySlotActions[slotAtStart] = action

      const insertedCount = Math.max(0, g.logs.length - beforeLogLen)
      const actionLogs = insertedCount > 0 ? g.logs.slice(0, insertedCount) : []
      if (insertedCount > 0) g.logs.splice(0, insertedCount)
      const primaryActionLog = actionLogs[0] ?? {
        title: '行动执行',
        detail: '系统已记录你的本时段行动结果。',
        tone: 'info' as const
      }
      const afterAction: ActionSnapshot = {
        cash: g.econ.cash,
        fatigue: g.stats.fatigue,
        focus: g.stats.focus,
        faLi: g.stats.faLi,
        rouTi: g.stats.rouTi
      }
      const summaryItems = pickActionSummaryItems(action, beforeAction, afterAction)
      addLog(
        primaryActionLog.title,
        mergeNarrativeAndSummary(primaryActionLog.detail, summaryItems),
        primaryActionLog.tone
      )

      if ((action === 'study' || action === 'tuna') && (g.scoreDayStreak ?? 0) >= 2) {
        const feeRand = mulberry32(g.seed + g.school.day * 401 + Engine.slotOrder().indexOf(slotAtStart) * 31)
        if (feeRand() < 0.26) {
          const bite = Math.floor(45 + feeRand() * 110)
          g.econ.collectionFee = (g.econ.collectionFee ?? 0) + bite
          addLog(
            '制度抽检（费用）',
            `系统记录到刷分路线偏科下的现金链承压。费用池增加¥${bite}。不形成建议。`,
            'warn'
          )
        }
      }

      if (totalDebt.value > 0) {
        const daily = g.econ.dailyRate
        const segmentRate = daily / 3
        const interestBase = g.econ.coreDebt + g.econ.debtPrincipal + g.econ.debtInterestAccrued
        g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + interestBase * segmentRate)
      }

      if (g.school.slot === 'morning') g.econ.cash += g.school.perks.mealSubsidy

      const endingAlreadySeen = g.logs.some((log: GameState['logs'][number]) => log.title === '情节结局：麻木化时刻')
      const shouldShowEnding = !endingAlreadySeen && Engine.shouldTriggerNarrativeEnding(g)
      const repaymentCheck = Engine.shouldTriggerRepaymentEvent(g, rand)
      if (repaymentCheck.trigger) {
        g.pendingEvent = buildRepaymentEvent(g, BODY_PART_PREREQS, rand)
      } else if (shouldShowEnding) {
        g.pendingEvent = Engine.makeNarrativeEndingEvent()
      } else {
        const collapse = Engine.tryEmitStrongCollapse(
          g,
          rand,
          ALL_EVENTS.filter((e) => e.type === 'collapse')
        )
        if (collapse?.kind === 'full') {
          g.pendingEvent = collapse.pending
        } else {
          if (collapse?.kind === 'echo') {
            g.logs.unshift({
              id: uid('log'),
              day: g.school.day,
              title: collapse.title,
              detail: collapse.detail,
              tone: 'warn'
            })
            if (g.logs.length > 120) g.logs.pop()
          }
          g.pendingEvent = randomPoolAfterAction(g, rand)
        }
      }

      const idx = Engine.slotOrder().indexOf(g.school.slot)
      const nextSlot = Engine.slotOrder()[idx + 1]
      if (idx < Engine.slotOrder().length - 1 && nextSlot) g.school.slot = nextSlot
      else endDay()

      saveToSlot(activeSlot.value)
    }

  const endDay = () => {
    const g = game.value
    const addDayLog: AddLog = (title, detail, tone = 'info') => {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
      if (g.logs.length > 120) g.logs.pop()
    }
    finalizeDayRouteStreak(g, addDayLog)
    g.buyDebasement = Math.max(0, (g.buyDebasement ?? 0) - 0.2)
    g.school.day += 1
    g.school.slot = 'morning'
    g.stats.fatigue = clamp(g.stats.fatigue - 6, 0, 100)
    g.stats.focus = clamp(g.stats.focus + 1, 0, 100)

    applyNarrativeDelays(g)

    if ((g.school.day - 1) % 7 === 0) {
      Engine.clearCollapseModifierOnWeeklySettlement(g)
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

      const debtPressure = Engine.describeDebtPressure(g.econ.delinquency)
      const tierChange = previousTier === g.school.classTier ? '维持不变' : `${previousTier}→${g.school.classTier}`
      const perkChange = Engine.describePerkChange(previousPerks, g.school.perks)
      const tierDebtProfile = Engine.debtProfileForTier(g.school.classTier)
      const riskSummary = `风险倍率：利率×${tierDebtProfile.dailyRateMultiplier.toFixed(2)}，最低周还款×${tierDebtProfile.minWeeklyPaymentMultiplier.toFixed(2)}，催收权重×${tierDebtProfile.collectionRiskWeight.toFixed(2)}`
      g.logs.unshift({
        id: uid('log'),
        day: settledDay,
        title: `周结算通报（第${g.school.week}周）`,
        detail: `分数：${g.school.lastExamScore}；分班变化：${tierChange}；债务压力：${debtPressure}；${perkChange}；${riskSummary}。本通报已归档，系统将继续执行下一日流程。`,
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
      if (legacyState.scoreDayStreak === undefined) legacyState.scoreDayStreak = 0
      if (legacyState.cashDayStreak === undefined) legacyState.cashDayStreak = 0
      if (legacyState.daySlotActions === undefined) legacyState.daySlotActions = {}
      if (legacyState.familyHistory === undefined) legacyState.familyHistory = {}
      if (typeof legacyState.domestication !== 'number' || legacyState.domestication < 0) legacyState.domestication = 0
      if (typeof legacyState.numbness !== 'number' || legacyState.numbness < 0) legacyState.numbness = 0
      if (legacyState.collapseModifierActive === undefined) legacyState.collapseModifierActive = false
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
    classPressureDigest,
    creditLimit,
    nextLabel,
    remainingSlots,
    actionTrendLabel: (action: ActionId) => Engine.actionTrendLabel(game.value, action),
    act,
    borrow,
    repay,
    resolveEvent
  }
}
