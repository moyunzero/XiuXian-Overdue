import type { WeekPlan } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import { buildAntiPatternLines } from '~/logic/play/debtDashboard'
import { buildDualLedgerSettlementLogs } from '~/logic/play/ghostLedger'
import { type TickChapterWeekResult } from '~/logic/play/chapterWeekFlow'
import { getFateShell } from '~/logic/play/fateShellRegistry'
import { validateDelegationTwoPlan } from '~/logic/play/ghostBoundWeekPlan'
import { respondToMandate } from '~/logic/play/mandateDelivery'
import { advanceWeek, resolveWeekEnd } from '~/logic/play/milestoneWeekFlow'

const DELEGATION_PLAN_BLOCK = '须完成维生与委托选择。'

const COMPOUND_STUB = '账期复利已滚动'

export interface WeekSettlementSummary {
  headline: string
  details: string[]
  /** ghost_bound 双账明细（人账/鬼账各一行） */
  ledgerLines?: { yang: string; ming: string }
}

function prefixDualLedgerLines(run: PlayRunState): { yang: string; ming: string } | undefined {
  const raw = buildDualLedgerSettlementLogs(run)
  if (raw.length < 2) return undefined
  return {
    yang: `人账：${raw[0]}`,
    ming: `鬼账：${raw[1]}`
  }
}

export function advanceScheduleWeek(run: PlayRunState, plan: WeekPlan): TickChapterWeekResult {
  const shell = getFateShell(run)
  if (shell.scheduleMode === 'delegation_two') {
    const validation = validateDelegationTwoPlan(run, plan)
    if (!validation.ok) {
      return { run, blocked: true, blockReason: validation.reason ?? DELEGATION_PLAN_BLOCK }
    }
  }
  return advanceWeek(run, plan)
}

export function finalizeWeek(run: PlayRunState): PlayRunState {
  return resolveWeekEnd(run)
}

export function respondMandateAndMaybeFinalize(run: PlayRunState, responseId: string): PlayRunState {
  let next = respondToMandate(run, responseId)
  if ((next.mandate?.pendingDeliveryIds.length ?? 0) === 0) {
    next = finalizeWeek(next)
  }
  return next
}

export function buildWeekSettlementSummary(run: PlayRunState): WeekSettlementSummary {
  const anti = buildAntiPatternLines(run)
  const ledgerLines =
    (run.primaryFate === 'ghost_bound' || run.primaryFate === 'ghost_voluntary') && run.ghostLedger
      ? prefixDualLedgerLines(run)
      : undefined

  const details: string[] = []
  if (ledgerLines) {
    details.push(ledgerLines.yang, ledgerLines.ming)
  }
  if (anti.pressureDetail) {
    details.push(anti.pressureDetail)
  }
  details.push(...run.logs.filter((line) => line.length > 0).slice(0, 6))

  return {
    headline: anti.headline,
    details,
    ...(ledgerLines ? { ledgerLines } : {})
  }
}

export function weekSettlementAlreadyApplied(run: PlayRunState): boolean {
  return run.logs.some((line) => line.includes(COMPOUND_STUB))
}

/** 本周 tick 后尚未跑 resolveWeekEnd（队列为空且近期流水无复利 stub） */
export function weekEndFinalizePending(run: PlayRunState): boolean {
  if ((run.mandate?.pendingDeliveryIds.length ?? 0) > 0) return false
  const head = run.logs.slice(0, 4)
  return !head.some((line) => line.includes(COMPOUND_STUB))
}
