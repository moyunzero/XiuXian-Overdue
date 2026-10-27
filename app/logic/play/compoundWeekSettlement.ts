import type { PlayRunState, TagRecord } from '~/types/play'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { applyGhostBoundLedgerSettlement } from '~/logic/play/ghostBoundWeekPlan'
import { applyHeadJarMaintenanceSettlement } from '~/logic/play/headJarWeekPlan'
import { tickGhostLedgerWeek } from '~/logic/play/ghostLedger'
import { isPlayableRunStatus, mergeTagRecords } from '~/logic/play/playRunFateDefaults'
import { tickStartBundlePassive } from '~/logic/play/startBundleRegistry'

const DEBT_COMPOUND_STUB_LOG = '账期复利已滚动——债务计数写入本周流水（制度 stub）。'
const SUPPLY_CUT_STREAK_THRESHOLD = 2
const FAMILY_LEVERAGE_DELINQUENCY_THRESHOLD = 3

const FAMILY_LEVERAGE_PROFILE_TAGS = new Set([
  'mother-left',
  'witness-departure',
  'family-cutoff',
  'family-saved-costly'
])

function tickInstitutionalTags(run: PlayRunState): PlayRunState {
  const week = run.chapter?.chapterWeekIndex ?? 0
  const nextTags = run.institutionalTags.filter(
    (tag) => tag.expiryWeek == null || tag.expiryWeek > week
  )
  if (nextTags.length === run.institutionalTags.length) return run
  return { ...run, institutionalTags: nextTags }
}

function applyDebtInterestStub(run: PlayRunState): PlayRunState {
  if (!run.econ) return run
  if (fullDebtFromRun(run) <= 0) return run
  if (run.logs.includes(DEBT_COMPOUND_STUB_LOG)) return run
  return { ...run, logs: [DEBT_COMPOUND_STUB_LOG, ...run.logs].slice(0, 80) }
}

function hasFamilyLeverageRisk(run: PlayRunState): boolean {
  if (run.profileTags.some((t) => FAMILY_LEVERAGE_PROFILE_TAGS.has(t))) return true
  const outcome = run.carryoverFromAct1?.familyOutcome ?? run.act1?.familyOutcome
  return outcome != null && outcome !== 'stable'
}

function applyInstitutionalTagThresholds(run: PlayRunState): PlayRunState {
  const week = run.chapter?.chapterWeekIndex
  const incoming: TagRecord[] = []

  const streak = run.mandate?.supplyCutStreak ?? 0
  if (streak >= SUPPLY_CUT_STREAK_THRESHOLD) {
    incoming.push({
      id: 'supply_cut',
      appliedAtWeek: week,
      source: 'supply_cut_streak'
    })
  }

  const delinquency = run.econ?.delinquency ?? 0
  if (delinquency >= FAMILY_LEVERAGE_DELINQUENCY_THRESHOLD && hasFamilyLeverageRisk(run)) {
    incoming.push({
      id: 'family_leverage',
      appliedAtWeek: week,
      source: 'family_delinquency_threshold'
    })
  }

  if (!incoming.length) return run
  return {
    ...run,
    institutionalTags: mergeTagRecords(run.institutionalTags, incoming)
  }
}

/** LOOP-05 周末复利骨架：tag expiry + 债务 log stub + head_jar 维生 + tag thresholds */
export function compoundWeekSettlement(run: PlayRunState): PlayRunState {
  if (!run.chapter || !isPlayableRunStatus(run.runStatus)) return run
  let next = tickInstitutionalTags(run)
  next = applyDebtInterestStub(next)
  if (next.primaryFate === 'head_jar') {
    next = applyHeadJarMaintenanceSettlement(next)
  } else if (
    next.primaryFate === 'ghost_bound' ||
    (next.primaryFate === 'ghost_voluntary' && next.ghostLedger)
  ) {
    const ticked = tickGhostLedgerWeek(next)
    next = {
      ...ticked.run,
      logs: [...ticked.logs, ...ticked.run.logs].slice(0, 80)
    }
    next = applyGhostBoundLedgerSettlement(next)
  }
  next = applyInstitutionalTagThresholds(next)
  next = tickStartBundlePassive(next)
  return next
}
