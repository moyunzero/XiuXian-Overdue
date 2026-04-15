import type { GameState, SlotId } from '~/types/game'
import { clamp, mulberry32, round1, uid } from '~/utils/rng'
import * as Engine from '~/logic/gameEngine'
import type { AddLog } from './useGame.actions'

export function finalizeDayRouteStreak(g: GameState, addLog: AddLog): void {
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

export function applyNarrativeDelays(g: GameState): void {
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

export function applyWeeklyExam(g: GameState, rand: () => number): void {
  const score = Engine.scoreForExam(g, rand)
  const tier = Engine.determineTier(score)
  g.school.lastExamScore = score
  g.school.classTier = tier
  g.school.perks = Engine.perksForTier(tier)
  const rank = clamp(201 - Math.floor((score - 480) / 1.2), 1, 200)
  g.school.lastRank = rank
  g.logs.unshift({
    id: uid('log'),
    day: g.school.day - 1,
    title: `月考结算（第${g.school.week}周）`,
    detail: `总分：${score}；排名：约第${rank}名；分班：${tier}。在这里，"约"也足够杀人。`,
    tone: tier === '示范班' ? 'ok' : tier === '末位班' ? 'danger' : 'info'
  })
  if (g.logs.length > 120) g.logs.pop()
}

export function applyDelinquencyCheck(g: GameState, minPaymentVal: number): void {
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
    const afterRate = Math.min(
      0.05,
      Number((beforeRate * policy.rateStepMultiplier * tierDebtProfile.dailyRateMultiplier).toFixed(4))
    )
    g.econ.dailyRate = afterRate
    const detail =
      afterRate > beforeRate
        ? `逾期${g.econ.delinquency}级，日利率由 ${(beforeRate * 100).toFixed(2)}% 上浮至 ${(afterRate * 100).toFixed(2)}%。`
        : `你的日利率已达到系统上限 ${(afterRate * 100).toFixed(2)}%，继续逾期只会放大其他风险。`
    g.logs.unshift({ id: uid('log'), day: g.school.day - 1, title: '利率上浮', detail, tone: 'warn' })
  }
  if (g.logs.length > 120) g.logs.pop()
}

export function endDay(
  g: GameState,
  minPayment: number,
  applyWeeklyCollectionFeeFn: (g: GameState) => number
): void {
  const addDayLog: AddLog = (title, detail, tone = 'info') => {
    g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
    if (g.logs.length > 120) g.logs.pop()
  }
  finalizeDayRouteStreak(g, addDayLog)
  g.buyDebasement = Math.max(0, (g.buyDebasement ?? 0) - 0.2)

  const totalDebt = g.econ.collectionFee + g.econ.debtPrincipal + g.econ.debtInterestAccrued
  if (totalDebt > 0) {
    const dailyRate = g.econ.dailyRate
    g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + totalDebt * dailyRate)
  }

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

    const preCompoundDebt = g.econ.collectionFee + g.econ.debtPrincipal + g.econ.debtInterestAccrued
    const weeklyCompound = Math.floor(preCompoundDebt * 0.015)
    g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + weeklyCompound)

    const weeklyFee = applyWeeklyCollectionFeeFn(g)
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day - 1,
      title: '周结算',
      detail: `制度复利¥${weeklyCompound.toLocaleString()}；学籍维护费与风控费¥${weeklyFee.toLocaleString()}。共计¥${(weeklyCompound + weeklyFee).toLocaleString()}已计入债务。`,
      tone: 'warn'
    })
    if (g.logs.length > 120) g.logs.pop()
    applyDelinquencyCheck(g, minPayment)

    const debtPressure = Engine.describeDebtPressure(g.econ.delinquency)
    const tierChange = previousTier === g.school.classTier ? '维持不变' : `${previousTier}→${g.school.classTier}`
    const perkChange = Engine.describePerkChange(previousPerks, g.school.perks)
    const tierDebtProfile = Engine.debtProfileForTier(g.school.classTier)
    const riskSummary = `风险倍率：利率×${tierDebtProfile.dailyRateMultiplier.toFixed(2)}，最低周还款×${tierDebtProfile.minWeeklyPaymentMultiplier.toFixed(2)}，催收权重×${tierDebtProfile.collectionRiskWeight.toFixed(2)}`
    const currentTotalDebt = g.econ.collectionFee + g.econ.debtPrincipal + g.econ.debtInterestAccrued
    g.logs.unshift({
      id: uid('log'),
      day: settledDay,
      title: `周结算通报（第${g.school.week}周）`,
      detail: `分数：${g.school.lastExamScore}；分班变化：${tierChange}；债务压力：${debtPressure}；当前总债务：¥${currentTotalDebt.toLocaleString()}；${riskSummary}。`,
      tone: debtPressure === '高' || debtPressure === '极高' ? 'warn' : 'info'
    })
    if (g.logs.length > 120) g.logs.pop()
    g.school.week += 1
  }
}

export const __test__dayCycle = {
  finalizeDayRouteStreak,
  applyNarrativeDelays,
  applyWeeklyExam,
  applyDelinquencyCheck
}
