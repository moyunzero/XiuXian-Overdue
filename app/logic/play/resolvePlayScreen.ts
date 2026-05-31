import type { PlayRunState } from '~/types/play'
import { hasExamBossPending } from '~/logic/play/examBoss'
import { hsSetpieceBlocksPressure } from '~/logic/play/setpieceFlow'
import { hasSectChoiceBlocking } from '~/logic/play/uniFlow'
import { needsJobChoice, needsTrackChoice } from '~/logic/play/workFlow'
import { chapterSetpieceBlocksWeek } from '~/logic/play/segmentGate'

export type PlayScreenId =
  | 'loading'
  | 'pre-act1'
  | 'week-dashboard'
  | 'mandate-inbox'
  | 'exam-boss'
  | 'body-mortgage'
  | 'breakthrough-gate'
  | 'uni-setpiece'
  | 'sect-choice'
  | 'work-track-choice'
  | 'work-job-choice'
  | 'contract-finale'
  | 'run-archive'
  | 'hs-pressure'
  | 'endless-pressure'
  | 'endless-breakthrough'
  | 'endless-body-mortgage'
  | 'endless-job-choice'
  | 'endless-collapse'

type ScreenResolver = (run: PlayRunState) => PlayScreenId | null

const CHAPTER_RESOLVERS: Array<{ priority: number; resolve: ScreenResolver }> = [
  {
    priority: 10,
    resolve: (run) =>
      run.runStatus === 'archived' || run.runStatus === 'collapsed' || run.runStatus === 'ended'
        ? 'run-archive'
        : null
  },
  {
    priority: 20,
    resolve: (run) => (run.lifeStage === 'pre' ? 'pre-act1' : null)
  },
  {
    priority: 30,
    resolve: (run) => (hasExamBossPending(run) ? 'exam-boss' : null)
  },
  {
    priority: 31,
    resolve: (run) => (run.setpiece?.breakthroughPending ? 'breakthrough-gate' : null)
  },
  {
    priority: 32,
    resolve: (run) => (run.setpiece?.sectChoicePending ? 'sect-choice' : null)
  },
  {
    priority: 33,
    resolve: (run) => (run.setpiece?.uniFoundationGatePending ? 'uni-setpiece' : null)
  },
  {
    priority: 34,
    resolve: (run) => (run.setpiece?.bodyMortgagePending ? 'body-mortgage' : null)
  },
  {
    priority: 40,
    resolve: (run) =>
      (run.mandate?.pendingDeliveryIds.length ?? 0) > 0 ? 'mandate-inbox' : null
  },
  {
    priority: 48,
    resolve: (run) => (needsTrackChoice(run) ? 'work-track-choice' : null)
  },
  {
    priority: 50,
    resolve: (run) => (needsJobChoice(run) ? 'work-job-choice' : null)
  },
  {
    priority: 60,
    resolve: (run) =>
      run.chapter?.pendingGateId === 'gate-w40-finale' ? 'contract-finale' : null
  },
  {
    priority: 100,
    resolve: () => 'week-dashboard'
  }
]

const ENDLESS_RESOLVERS: Array<{ priority: number; resolve: ScreenResolver }> = [
  {
    priority: 10,
    resolve: (run) => (run.runStatus === 'collapsed' ? 'endless-collapse' : null)
  },
  {
    priority: 20,
    resolve: (run) => (needsJobChoice(run) ? 'endless-job-choice' : null)
  },
  {
    priority: 30,
    resolve: (run) => (run.setpiece?.bodyMortgagePending ? 'endless-body-mortgage' : null)
  },
  {
    priority: 40,
    resolve: (run) => (run.setpiece?.breakthroughPending ? 'endless-breakthrough' : null)
  },
  {
    priority: 100,
    resolve: () => 'endless-pressure'
  }
]

function resolveFromTable(run: PlayRunState, table: typeof CHAPTER_RESOLVERS): PlayScreenId {
  const sorted = [...table].sort((a, b) => a.priority - b.priority)
  for (const entry of sorted) {
    const id = entry.resolve(run)
    if (id) return id
  }
  return 'loading'
}

export function resolvePlayScreen(run: PlayRunState | null | undefined): PlayScreenId {
  if (!run) return 'loading'
  if (run.runMode === 'chapter') {
    return resolveFromTable(run, CHAPTER_RESOLVERS)
  }
  if (run.runMode === 'endless') {
    return resolveFromTable(run, ENDLESS_RESOLVERS)
  }
  return 'loading'
}

export function chapterPlayBlocked(run: PlayRunState): boolean {
  return (
    chapterSetpieceBlocksWeek(run) ||
    hsSetpieceBlocksPressure(run) ||
    hasSectChoiceBlocking(run) ||
    needsTrackChoice(run) ||
    needsJobChoice(run)
  )
}
