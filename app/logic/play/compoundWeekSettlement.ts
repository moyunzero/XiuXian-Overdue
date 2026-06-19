import type { PlayRunState } from '~/types/play'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { isPlayableRunStatus } from '~/logic/play/playRunFateDefaults'

const DEBT_COMPOUND_STUB_LOG = '账期复利已滚动——债务计数写入本周流水（制度 stub）。'

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

/** LOOP-05 周末复利骨架：tag expiry + 债务 log stub */
export function compoundWeekSettlement(run: PlayRunState): PlayRunState {
  if (!run.chapter || !isPlayableRunStatus(run.runStatus)) return run
  let next = tickInstitutionalTags(run)
  next = applyDebtInterestStub(next)
  return next
}
