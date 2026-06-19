import type { ChapterId, WeekActionId, WeekPlan } from '~/types/chapter'
import { DEFAULT_CHAPTER_ID } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import { advanceRunToHs } from '~/logic/play/createHsPlayState'
import {
  beatsForWeek,
  getChapterConfig,
  segmentForWeek,
  weeksRemaining as calcWeeksRemaining
} from '~/logic/play/chapterRegistry'
import { runBeatsForWeek } from '~/logic/play/beatRunner'
import { chapterSetpieceBlocksWeek } from '~/logic/play/segmentGate'
import { advancePlayRunCalendarDay, shouldSkipWeeklyExamForPlay } from '~/logic/play/playDayCycle'
import {
  mandateQueueBlocksWeekAdvance,
  rollMandatesForWeek
} from '~/logic/play/mandateDelivery'
import { minPaymentForRun } from '~/logic/play/debtDashboard'
import { applyChapterBodyDecay } from '~/logic/play/chapterBodyDecay'
import { applyChapterCollapse } from '~/logic/play/chapterCollapse'
import { applyChapterWeekPlanEffects } from '~/logic/play/chapterWeekPlanEffects'

export const DEFAULT_WEEK_PLAN: WeekPlan = {
  repay: 'min',
  studyHours: 8,
  tunaHours: 0,
  parttimeHours: 0,
  workHours: 0,
  rest: false
}

export function initChapter(run: PlayRunState, chapterId: ChapterId = DEFAULT_CHAPTER_ID): PlayRunState {
  const config = getChapterConfig(chapterId)
  let base = run
  if (!run.econ || !run.stats || !run.school) {
    base = advanceRunToHs(run, run.carryoverFromAct1, run.act1)
  }

  const segment = segmentForWeek(config, 1)
  return {
    ...base,
    bodyIntegrity: base.bodyIntegrity ?? 1,
    runMode: 'chapter',
    lifeStage: config.entryLifeStage,
    chapter: {
      chapterId,
      weekBudget: config.weekBudget,
      chapterWeekIndex: 1,
      weeksRemaining: calcWeeksRemaining(config, 1),
      segmentId: segment?.id
    },
    mandate: run.mandate ?? {
      numbness: 0,
      domestication: 0,
      pendingDeliveryIds: [],
      supplyCutStreak: 0
    },
    work: run.work ?? {
      jobId: null,
      educationTags: [],
      monthlyTarget: 0,
      kpiScore: 0,
      shameEvents: 0,
      employmentTrack: null
    },
    school: base.school ? { ...base.school, week: 1, day: Math.max(1, base.school.day) } : base.school,
    logs: [`${config.title}：第 1 / ${config.weekBudget} 周。`, ...base.logs].slice(0, 80)
  }
}

export function isWeekActionAllowed(run: PlayRunState, actionId: WeekActionId): boolean {
  if (run.runMode !== 'chapter' || !run.chapter) return false
  const config = getChapterConfig(run.chapter.chapterId)
  const segment = segmentForWeek(config, run.chapter.chapterWeekIndex)
  const allowed = segment?.allowedActions ?? config.weekActions
  return allowed.includes(actionId)
}

/** 清除当前段不允许的周计划字段（在 psy clamp 之后调用） */
export function clampWeekPlanToSegment(run: PlayRunState, plan: WeekPlan): WeekPlan {
  if (run.runMode !== 'chapter' || !run.chapter) return plan

  let next: WeekPlan = { ...plan }

  if (!isWeekActionAllowed(run, 'study')) next.studyHours = 0
  if (!isWeekActionAllowed(run, 'tuna')) next.tunaHours = 0
  if (!isWeekActionAllowed(run, 'parttime')) next.parttimeHours = 0
  if (!isWeekActionAllowed(run, 'work')) next.workHours = 0

  if (next.rest && !isWeekActionAllowed(run, 'rest')) {
    next = { ...next, rest: false }
  }

  if (next.rest) {
    next = { ...next, studyHours: 0, tunaHours: 0, parttimeHours: 0, workHours: 0 }
  }

  return next
}

function advancePlayRunOneWeek(run: PlayRunState): PlayRunState {
  let next = run
  for (let i = 0; i < 7; i++) {
    next = advancePlayRunCalendarDay(next)
  }
  return next
}

function applyDebtPayment(
  cash: number,
  debtPrincipal: number,
  debtInterestAccrued: number,
  payAmount: number
): { cash: number; debtPrincipal: number; debtInterestAccrued: number } {
  if (payAmount <= 0) {
    return { cash, debtPrincipal, debtInterestAccrued }
  }
  let nextCash = cash - payAmount
  let interest = debtInterestAccrued
  let principal = debtPrincipal
  let left = payAmount
  if (left > 0 && interest > 0) {
    const cut = Math.min(left, interest)
    interest -= cut
    left -= cut
  }
  if (left > 0) {
    principal = Math.max(0, principal - left)
  }
  return { cash: nextCash, debtPrincipal: principal, debtInterestAccrued: interest }
}

function repayAmountForPlan(
  plan: WeekPlan,
  cash: number,
  totalDue: number,
  minPay: number
): number {
  switch (plan.repay) {
    case 'min':
      return Math.min(cash, minPay)
    case 'partial':
      return Math.min(cash, Math.max(minPay * 2, Math.floor(totalDue * 0.12)))
    case 'extra':
      return Math.min(cash, Math.floor(totalDue * 0.25))
    case 'skip':
      return 0
    default:
      return 0
  }
}

function applyWeekPlanEconomics(
  run: PlayRunState,
  plan: WeekPlan
): { run: PlayRunState; amountPaid: number; minPayRequired: number } {
  if (!run.econ) {
    return { run, amountPaid: 0, minPayRequired: 0 }
  }
  const restWeek = plan.rest
  const parttimeHours = restWeek ? 0 : plan.parttimeHours
  const workHours = restWeek ? 0 : plan.workHours

  let cash = run.econ.cash
  let debtPrincipal = run.econ.debtPrincipal
  let debtInterestAccrued = run.econ.debtInterestAccrued
  const totalDue = debtPrincipal + debtInterestAccrued + (run.econ.collectionFee ?? 0)
  const minPay = minPaymentForRun(run)

  const pay = repayAmountForPlan(plan, cash, totalDue, minPay)
  const paid = applyDebtPayment(cash, debtPrincipal, debtInterestAccrued, pay)
  cash = paid.cash
  debtPrincipal = paid.debtPrincipal
  debtInterestAccrued = paid.debtInterestAccrued

  if (parttimeHours > 0) {
    cash += parttimeHours * 40
  }
  if (workHours > 0 && run.work?.jobId) {
    const jobPay = run.work.monthlyTarget / 4
    cash += Math.floor((jobPay * workHours) / 40)
  }

  const metMinPay = pay >= minPay && minPay > 0
  return {
    run: {
      ...run,
      econ: {
        ...run.econ,
        cash,
        debtPrincipal,
        debtInterestAccrued,
        ...(metMinPay && run.school ? { lastPaymentDay: run.school.day } : {})
      }
    },
    amountPaid: pay,
    minPayRequired: minPay
  }
}

/** 未达最低还款时累加断供计数；连续断供写入逾期 */
export function applySupplyCutAfterRepayment(
  run: PlayRunState,
  amountPaid: number,
  minPayRequired: number
): PlayRunState {
  if (run.runMode !== 'chapter' || !run.econ || minPayRequired <= 0) return run

  const mandate = run.mandate ?? {
    numbness: 0,
    domestication: 0,
    pendingDeliveryIds: [],
    supplyCutStreak: 0
  }

  if (amountPaid >= minPayRequired) {
    if (mandate.supplyCutStreak === 0) return run
    return {
      ...run,
      mandate: { ...mandate, supplyCutStreak: 0 },
      logs: ['本周已达最低还款，洞府灵气配额恢复登记。', ...run.logs].slice(0, 80)
    }
  }

  const streak = mandate.supplyCutStreak + 1
  let next: PlayRunState = {
    ...run,
    mandate: { ...mandate, supplyCutStreak: streak },
    logs: [`洞府灵气配额未达最低还款——断供计数 ${streak}。`, ...run.logs].slice(0, 80)
  }

  if (streak === 2 && next.econ) {
    next = {
      ...next,
      econ: { ...next.econ, delinquency: next.econ.delinquency + 1 },
      logs: ['逾期登记 +1（断供链）。', ...next.logs].slice(0, 80)
    }
  }

  return next
}

export interface TickChapterWeekResult {
  run: PlayRunState
  /** 因 setpiece 阻塞未能推进到下一周 */
  blocked: boolean
}

export function markBeatResolvedForWeek(run: PlayRunState, weekIndex?: number): PlayRunState {
  if (!run.chapter) return run
  const week = weekIndex ?? run.chapter.chapterWeekIndex
  const resolved = run.chapter.resolvedBeatWeeks ?? []
  if (resolved.includes(week)) return run
  return {
    ...run,
    chapter: { ...run.chapter, resolvedBeatWeeks: [...resolved, week] }
  }
}

/** 提交本周计划并推进章节时钟（配置驱动，禁止 switch week） */
export function tickChapterWeek(run: PlayRunState, plan: WeekPlan): TickChapterWeekResult {
  const chapterLike =
    (run.runMode === 'chapter' || run.runMode === 'fate_run') && !!run.chapter
  if (!chapterLike) {
    return { run, blocked: false }
  }
  if (chapterSetpieceBlocksWeek(run)) {
    return { run, blocked: true }
  }

  const config = getChapterConfig(run.chapter.chapterId)
  const weekIndex = run.chapter.chapterWeekIndex

  // 终局周必须跑 contractFinale；满队列来文不能抢先阻塞节拍
  if (mandateQueueBlocksWeekAdvance(run) && weekIndex < config.weekBudget) {
    return { run, blocked: true }
  }
  const beatAlreadyResolved = run.chapter.resolvedBeatWeeks?.includes(weekIndex) ?? false
  const effectivePlan = clampWeekPlanToSegment(run, plan)

  let next = run
  if (!beatAlreadyResolved) {
    const settled = applyWeekPlanEconomics(run, effectivePlan)
    next = applySupplyCutAfterRepayment(
      settled.run,
      settled.amountPaid,
      settled.minPayRequired
    )
    next = { ...next, lastWeekPlan: effectivePlan }
    next = applyChapterWeekPlanEffects(next, effectivePlan)
    next = applyChapterBodyDecay(next, effectivePlan)
    if (run.runMode !== 'fate_run') {
      next = applyChapterCollapse(next)
      if (next.runStatus === 'collapsed') {
        return { run: next, blocked: false }
      }
    }
  }

  if (!beatAlreadyResolved) {
    const beatSummary = runBeatsForWeek(next, beatsForWeek(config, weekIndex))
    next = beatSummary.run

    if (beatSummary.blocked) {
      return { run: next, blocked: true }
    }
  }

  if (weekIndex >= config.weekBudget && run.runMode !== 'fate_run') {
    return { run: next, blocked: false }
  }

  next = advancePlayRunOneWeek(next)
  const nextIndex = weekIndex + 1
  const segment = segmentForWeek(config, nextIndex)

  next = {
    ...next,
    chapter: {
      ...next.chapter!,
      chapterWeekIndex: nextIndex,
      weeksRemaining: calcWeeksRemaining(config, nextIndex),
      segmentId: segment?.id ?? next.chapter!.segmentId
    },
    school: next.school
      ? { ...next.school, week: nextIndex }
      : next.school,
    logs: [`进入第 ${nextIndex} / ${config.weekBudget} 周。`, ...next.logs].slice(0, 80)
  }

  if (segment && segment.lifeStage !== next.lifeStage && !next.chapter?.pendingGateId) {
    next = { ...next, lifeStage: segment.lifeStage }
  }

  next = rollMandatesForWeek(next)
  if (run.runMode !== 'fate_run') {
    next = applyChapterCollapse(next)
  }

  return { run: next, blocked: false }
}

export function resolveRepeatWeekPlan(run: PlayRunState): WeekPlan {
  return run.lastWeekPlan ?? DEFAULT_WEEK_PLAN
}

/** chapter 模式周结算跳过 gameEngine 月考（由 beat 触发） */
export function chapterSkipsAutoExam(run: PlayRunState): boolean {
  return run.runMode === 'chapter' || shouldSkipWeeklyExamForPlay(run)
}
