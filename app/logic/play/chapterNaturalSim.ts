import type { EmploymentTrack, WeekPlan } from '~/types/chapter'
import type { StartConfig } from '~/types/game'
import type { PlayRunState } from '~/types/play'
import { DEFAULT_WEEK_PLAN, tickChapterWeek } from '~/logic/play/chapterWeekFlow'
import {
  advanceChapterToWeek,
  dismissCurrentSetpiece,
  settledChapterRun
} from '~/logic/play/chapterTestHelpers'
import { drainPendingMandates, respondToMandate, visibleResponsesForRun } from '~/logic/play/mandateDelivery'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { openSegmentGate } from '~/logic/play/segmentGate'
import { getMandateDef } from '~/logic/play/mandateRegistry'

export type ChapterSimProfile = 'natural' | 'reckless'

/** V4-8 natural 人格方差（seed 驱动，非全局最优还款/来文策略） */
export const NATURAL_SIM_SKIP_BASE = 3
export const NATURAL_SIM_SKIP_TIGHT = 9
export const NATURAL_SIM_TIGHT_THRESHOLD = 92
export const NATURAL_SIM_GRIND_LO = 48
export const NATURAL_SIM_GRIND_HI = 88
export const NATURAL_SIM_GRIND_PCT = 35
export const NATURAL_SIM_WORK_PARTTIME = 14
export const NATURAL_SIM_WORK_HOURS_GRIND = 56
export const NATURAL_SIM_GRIT_PCT = 6
/** 固定 fulfilled 回归用 seed（Monte Carlo 批次用 baseSeed + i*17） */
export const NATURAL_BASELINE_SEED = 20260531

const SIM_START: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 20_000,
  startingCity: '嵩阳市'
}

function naturalWeekPlan(seed: number, weekIndex: number): WeekPlan {
  const inWork = weekIndex >= 29
  const temperament = seed % 100
  const skipBias =
    temperament >= NATURAL_SIM_TIGHT_THRESHOLD ? NATURAL_SIM_SKIP_TIGHT : NATURAL_SIM_SKIP_BASE
  const repayRoll = (seed + weekIndex * 53) % 100
  const repay = repayRoll < skipBias ? 'skip' : 'min'

  const inGrindZone =
    temperament >= NATURAL_SIM_GRIND_LO && temperament < NATURAL_SIM_GRIND_HI
  const grind = inGrindZone && (seed + weekIndex * 41) % 100 < NATURAL_SIM_GRIND_PCT

  return {
    ...DEFAULT_WEEK_PLAN,
    repay,
    studyHours: inWork ? (grind ? 6 : 4) : grind ? 10 : 8,
    parttimeHours: inWork
      ? grind
        ? NATURAL_SIM_WORK_PARTTIME
        : 0
      : grind
        ? 6
        : 10,
    workHours: inWork ? (grind ? NATURAL_SIM_WORK_HOURS_GRIND : 44) : 0,
    rest: false
  }
}

export function weekPlanForProfile(
  profile: ChapterSimProfile,
  weekIndex: number,
  seed = 0
): WeekPlan {
  if (profile === 'natural') {
    return naturalWeekPlan(seed, weekIndex)
  }

  const inWork = weekIndex >= 29
  return {
    ...DEFAULT_WEEK_PLAN,
    repay: weekIndex % 6 === 0 ? 'skip' : 'min',
    studyHours: 3,
    parttimeHours: inWork ? 12 : 30,
    workHours: inWork ? 42 : 0,
    rest: false
  }
}

export interface ChapterSimResult {
  seed: number
  profile: ChapterSimProfile
  outcomeId: string | null
  collapsed: boolean
  finalWeek: number
  bodyIntegrity: number
  delinquency: number
  debt: number
}

function drainMandatesForProfile(
  run: PlayRunState,
  profile: ChapterSimProfile,
  seed: number
): PlayRunState {
  let next = run
  let guard = 0
  while ((next.mandate?.pendingDeliveryIds.length ?? 0) > 0 && guard < 20) {
    guard += 1
    const id = next.mandate!.pendingDeliveryIds[0]!
    const def = getMandateDef(id)
    if (!def) {
      next = {
        ...next,
        mandate: {
          ...next.mandate!,
          pendingDeliveryIds: next.mandate!.pendingDeliveryIds.slice(1)
        }
      }
      continue
    }
    const visible = visibleResponsesForRun(next, def)
    const grit = visible.find((r) => r.grit)
    const gritPct = profile === 'natural' ? NATURAL_SIM_GRIT_PCT : 10
    const gritMod = profile === 'natural' ? 23 : 19
    const pickGrit = Boolean(grit) && (seed + guard * gritMod) % 100 < gritPct
    const responseId = pickGrit ? grit!.id : visible[0]?.id ?? def.responses[0]?.id
    if (!responseId) break
    next = respondToMandate(next, responseId)
  }
  return next
}

function finalizeW40(run: PlayRunState): PlayRunState {
  if (run.chapter?.pendingGateId === 'gate-w40-finale') {
    return openSegmentGate(run, 'gate-w40-finale', 'pass')
  }
  return run
}

function completeChapterFinale(
  run: PlayRunState,
  profile: ChapterSimProfile,
  track: EmploymentTrack,
  seed: number
): PlayRunState {
  if (run.runStatus === 'collapsed' || (run.chapter?.chapterWeekIndex ?? 0) < 40) {
    return run
  }

  const plan = weekPlanForProfile(profile, 40, seed)
  let next = run
  let guard = 0

  while (!next.chapter?.outcomeId && guard < 12) {
    guard += 1

    if ((next.mandate?.pendingDeliveryIds.length ?? 0) > 0 && next.chapter?.pendingGateId !== 'gate-w40-finale') {
      next = drainMandatesForProfile(next, profile, seed)
      continue
    }

    if (next.chapter?.pendingGateId === 'gate-w40-finale') {
      next = finalizeW40(next)
      break
    }

    const tick40 = tickChapterWeek(next, plan)
    next = tick40.run
    if (tick40.blocked) {
      next = dismissCurrentSetpiece(next, { employmentTrack: track })
    }
  }

  return finalizeW40(next)
}

/** 固定种子跑满 40 周（含 setpiece dismiss）；用于 V4-8 崩盘率统计 */
export function simulateChapterRunState(
  seed: number,
  profile: ChapterSimProfile,
  track: EmploymentTrack = 'company'
): PlayRunState {
  let run: PlayRunState = {
    ...settledChapterRun(SIM_START),
    seed
  }

  let steps = 0
  const maxSteps = 900

  while ((run.chapter?.chapterWeekIndex ?? 0) < 40 && steps < maxSteps) {
    steps += 1
    if (run.runStatus === 'collapsed') break

    const week = run.chapter?.chapterWeekIndex ?? 1
    const plan = weekPlanForProfile(profile, week, seed)

    if (
      run.setpiece?.examBossPending ||
      run.setpiece?.breakthroughPending ||
      run.setpiece?.sectChoicePending ||
      run.setpiece?.uniFoundationGatePending ||
      run.chapter?.pendingGateId === 'gate-w29-track'
    ) {
      run = dismissCurrentSetpiece(run, { employmentTrack: track })
      continue
    }

    if ((run.mandate?.pendingDeliveryIds.length ?? 0) > 0) {
      run = drainMandatesForProfile(run, profile, seed)
      continue
    }

    const { run: afterTick, blocked } = tickChapterWeek(run, plan)
    run = afterTick
    if (blocked) {
      run = dismissCurrentSetpiece(run, { employmentTrack: track })
    }
  }

  return completeChapterFinale(run, profile, track, seed)
}

export function simulateChapterRun(
  seed: number,
  profile: ChapterSimProfile,
  track: EmploymentTrack = 'company'
): ChapterSimResult {
  const run = simulateChapterRunState(seed, profile, track)

  return {
    seed,
    profile,
    outcomeId: run.chapter?.outcomeId ?? null,
    collapsed: run.runStatus === 'collapsed',
    finalWeek: run.chapter?.chapterWeekIndex ?? 0,
    bodyIntegrity: run.bodyIntegrity ?? 1,
    delinquency: run.econ?.delinquency ?? 0,
    debt: fullDebtFromRun(run)
  }
}

export interface ChapterSimBatchSummary {
  runs: number
  profile: ChapterSimProfile
  collapseRate: number
  fulfilledRate: number
  outcomeCounts: Record<string, number>
  collapseReasons: Record<string, number>
}

export function summarizeChapterSimBatch(
  results: ChapterSimResult[],
  profile: ChapterSimProfile
): ChapterSimBatchSummary {
  const outcomeCounts: Record<string, number> = {}
  const collapseReasons: Record<string, number> = {}
  let collapsed = 0
  let fulfilled = 0

  for (const r of results) {
    const key = r.outcomeId ?? (r.collapsed ? 'collapsed-unknown' : 'active')
    outcomeCounts[key] = (outcomeCounts[key] ?? 0) + 1
    if (r.collapsed) {
      collapsed += 1
      if (r.outcomeId) {
        collapseReasons[r.outcomeId] = (collapseReasons[r.outcomeId] ?? 0) + 1
      }
    }
    if (r.outcomeId === 'fulfilled') fulfilled += 1
  }

  const n = results.length || 1
  return {
    runs: results.length,
    profile,
    collapseRate: collapsed / n,
    fulfilledRate: fulfilled / n,
    outcomeCounts,
    collapseReasons
  }
}

export function runChapterSimBatch(
  runs: number,
  profile: ChapterSimProfile,
  baseSeed = 20260531
): ChapterSimBatchSummary {
  const results: ChapterSimResult[] = []
  for (let i = 0; i < runs; i++) {
    results.push(simulateChapterRun(baseSeed + i * 17, profile))
  }
  return summarizeChapterSimBatch(results, profile)
}

/** 快速路径：固定 baseline seed，供 spec 对照 fulfilled */
export function simulateNaturalToW40(track: EmploymentTrack = 'company'): PlayRunState {
  return simulateChapterRunState(NATURAL_BASELINE_SEED, 'natural', track)
}
