import type { PlayRunState, WorkState } from '~/types/play'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'

export function deriveEducationTags(run: PlayRunState): string[] {
  const tags = new Set<string>()
  if (run.profileTags.includes('hs-graduated')) tags.add('hs-graduated')
  if (
    run.lifeStage === 'uni' ||
    run.lifeStage === 'work' ||
    (run.chapter?.chapterWeekIndex ?? 0) >= 17
  ) {
    tags.add('hs-graduated')
  }
  if (run.profileTags.includes('uni-enrolled')) tags.add('uni-enrolled')
  if (
    run.profileTags.some((t) =>
      ['uni-foundation', 'uni-foundation-pass', 'sect-chosen'].includes(t)
    ) ||
    run.lifeStage === 'work'
  ) {
    tags.add('uni-enrolled')
  }
  const tier = run.school?.classTier
  if (tier === '示范班') tags.add('tier-elite')
  else if (tier === '普通班') tags.add('tier-normal')
  else if (tier === '末位班') tags.add('tier-tail')
  return [...tags]
}

export function createWorkStateFromUni(run: PlayRunState): WorkState {
  const debt = fullDebtFromRun(run)
  const monthlyTarget = Math.max(8000, Math.round(debt * 0.04))
  return {
    jobId: null,
    educationTags: deriveEducationTags(run),
    monthlyTarget,
    kpiScore: 0,
    shameEvents: 0,
    employmentTrack: null
  }
}
