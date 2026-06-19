import type { WeekPlan } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import { applyChapterCollapse } from '~/logic/play/chapterCollapse'
import {
  getChapterConfig,
  segmentForWeek,
  weeksRemaining as calcWeeksRemaining
} from '~/logic/play/chapterRegistry'
import {
  tickChapterWeek,
  type TickChapterWeekResult
} from '~/logic/play/chapterWeekFlow'
import { compoundWeekSettlement } from '~/logic/play/compoundWeekSettlement'
import { applyFateTransition } from '~/logic/play/fateTransition'
import {
  advanceStageIfNeeded,
  isPlayableRunStatus
} from '~/logic/play/playRunFateDefaults'

const WEEK40_CONTINUITY_LOG =
  '契约账期已满，制度登记续行——下一学籍段待接入。'

export function ensureFateRunMode(run: PlayRunState): PlayRunState {
  if (run.runMode !== 'chapter') return run
  if (!run.chapter) return run
  if (!isPlayableRunStatus(run.runStatus)) return run
  return { ...run, runMode: 'fate_run' }
}

export function resolveWeekEnd(run: PlayRunState): PlayRunState {
  let next = compoundWeekSettlement(run)
  if (run.runMode === 'fate_run') {
    next = applyFateTransition(next)
  } else {
    next = applyChapterCollapse(next)
  }
  next = advanceStageIfNeeded(next)
  return next
}

function clearFateW40Gate(run: PlayRunState): PlayRunState {
  if (run.runMode !== 'fate_run' || !run.chapter) return run
  if (run.chapter.pendingGateId !== 'gate-w40-finale') return run
  return {
    ...run,
    chapter: { ...run.chapter, pendingGateId: undefined }
  }
}

function appendWeek40ContinuityLog(run: PlayRunState): PlayRunState {
  if (run.logs.includes(WEEK40_CONTINUITY_LOG)) return run
  return { ...run, logs: [WEEK40_CONTINUITY_LOG, ...run.logs].slice(0, 80) }
}

function bumpChapterWeekPastBudgetIfNeeded(
  run: PlayRunState,
  weekBefore?: number
): PlayRunState {
  if (run.runMode !== 'fate_run' || !run.chapter) return run
  const config = getChapterConfig(run.chapter.chapterId)
  const weekIndex = run.chapter.chapterWeekIndex
  if (weekIndex < config.weekBudget) return run
  if (weekBefore !== undefined && weekIndex !== weekBefore) return run

  const nextIndex = weekIndex + 1
  const segment = segmentForWeek(config, nextIndex)
  return {
    ...run,
    chapter: {
      ...run.chapter,
      chapterWeekIndex: nextIndex,
      weeksRemaining: calcWeeksRemaining(config, nextIndex),
      segmentId: segment?.id ?? run.chapter.segmentId,
      pendingGateId: undefined
    },
    school: run.school ? { ...run.school, week: nextIndex } : run.school,
    logs: [`进入第 ${nextIndex} / ${config.weekBudget} 周。`, ...run.logs].slice(0, 80)
  }
}

/** 提交本周计划并推进周程（fate_run 可越过 weekBudget=40） */
export function advanceWeek(run: PlayRunState, plan: WeekPlan): TickChapterWeekResult {
  const weekBefore = run.chapter?.chapterWeekIndex
  const next = ensureFateRunMode(run)
  const { run: ticked, blocked } = tickChapterWeek(next, plan)
  if (blocked) return { run: ticked, blocked: true }

  let after = clearFateW40Gate(ticked)
  after = bumpChapterWeekPastBudgetIfNeeded(after, weekBefore)

  if (
    after.runMode === 'fate_run' &&
    weekBefore === 40 &&
    after.chapter?.chapterWeekIndex === 41
  ) {
    after = appendWeek40ContinuityLog(after)
  }

  after = resolveWeekEnd(after)
  return { run: after, blocked: false }
}
