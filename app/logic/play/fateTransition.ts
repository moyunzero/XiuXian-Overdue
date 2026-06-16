import type { ChapterCollapseTriggerId, PlayRunState } from '~/types/play'
import {
  analyzeChapterCollapseMetrics,
  type ChapterCollapseCheck
} from '~/logic/play/chapterCollapse'
import { mergeTagRecords } from '~/logic/play/playRunFateDefaults'

export function mapTriggerToFate(triggerId: ChapterCollapseTriggerId): {
  primaryFate: PlayRunState['primaryFate']
  tags: PlayRunState['institutionalTags']
} {
  switch (triggerId) {
    case 'body_integrity':
    case 'body_exhaustion':
      return { primaryFate: 'mortgaged', tags: [] }
    case 'debt_delinquency':
      return {
        primaryFate: 'human',
        tags: [{ id: 'credit_blacklist' }, { id: 'supply_cut' }]
      }
    case 'debt_stress_ratio':
      return { primaryFate: 'human', tags: [{ id: 'credit_blacklist' }] }
    case 'review_gate':
      return { primaryFate: 'human', tags: [{ id: 'exam_probation' }] }
    default:
      return { primaryFate: 'human', tags: [{ id: 'credit_blacklist' }] }
  }
}

function detectFateTransitionHit(run: PlayRunState): ChapterCollapseCheck | null {
  if (run.chapter?.outcomeId === 'collapse_review') {
    return {
      outcomeId: 'collapse_review',
      triggerId: 'review_gate',
      logLine: '关键审判关未过且无降级路——征信灵籍写入审查挂科档，命运态续存。'
    }
  }
  return analyzeChapterCollapseMetrics(run)
}

export function detectFateTransition(run: PlayRunState): ChapterCollapseCheck | null {
  if (run.runMode !== 'fate_run') return null
  if (run.runStatus === 'ended' || run.runStatus === 'archived' || run.runStatus === 'paused') {
    return null
  }
  if (run.runStatus === 'fated' || run.runStatus === 'collapsed') return null
  if (!run.chapter || !run.econ) return null
  return detectFateTransitionHit(run)
}

export function applyFateTransition(run: PlayRunState): PlayRunState {
  if (run.runMode !== 'fate_run') return run
  if (run.runStatus === 'fated') return run

  const hit = detectFateTransition(run)
  if (!hit) return run

  const week = run.chapter?.chapterWeekIndex
  const mapped = mapTriggerToFate(hit.triggerId)
  const incomingTags = mapped.tags.map((t) => ({
    ...t,
    appliedAtWeek: t.appliedAtWeek ?? week,
    source: t.source ?? hit.triggerId
  }))

  return {
    ...run,
    runStatus: 'fated',
    primaryFate: mapped.primaryFate,
    institutionalTags: mergeTagRecords(run.institutionalTags, incomingTags),
    logs: [hit.logLine, ...run.logs].slice(0, 80)
  }
}
