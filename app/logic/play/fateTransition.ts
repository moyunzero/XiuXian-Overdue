import type { ChapterCollapseTriggerId, PlayRunState, PrimaryFate } from '~/types/play'
import type { ChapterCollapseCheck } from '~/logic/play/chapterCollapse'
import {
  buildTransitionResult,
  detectHeadJarUpgradeFromCatalog,
  evaluateCollapseTransition,
  findHeadJarUpgradeRule,
  mapTriggerFromCatalog
} from '~/logic/play/fateCatalog'
import { initGhostLedgerOnTransition } from '~/logic/play/ghostLedger'
import { mergeTagRecords } from '~/logic/play/playRunFateDefaults'

export function mapTriggerToFate(triggerId: ChapterCollapseTriggerId): {
  primaryFate: PlayRunState['primaryFate']
  tags: PlayRunState['institutionalTags']
} {
  return mapTriggerFromCatalog(triggerId)
}

function detectInitialFateHit(run: PlayRunState): ChapterCollapseCheck | null {
  return evaluateCollapseTransition(run)
}

function detectHeadJarUpgrade(run: PlayRunState): {
  trigger: string
  logLine: string
} | null {
  const hit = detectHeadJarUpgradeFromCatalog(run)
  if (!hit) return null
  return { trigger: hit.trigger, logLine: hit.logLine }
}

export function detectFateTransition(run: PlayRunState): ChapterCollapseCheck | null {
  if (run.runMode !== 'fate_run') return null
  if (run.runStatus === 'ended' || run.runStatus === 'archived' || run.runStatus === 'paused') {
    return null
  }
  if (run.runStatus === 'collapsed') return null
  if (!run.chapter || !run.econ) return null

  if (run.runStatus === 'fated') {
    const headJar = detectHeadJarUpgrade(run)
    return headJar
      ? {
          outcomeId: 'collapse_body',
          triggerId: 'body_integrity',
          logLine: headJar.logLine
        }
      : null
  }

  return detectInitialFateHit(run)
}

function applyHeadJarUpgrade(run: PlayRunState): PlayRunState {
  const hit = detectHeadJarUpgrade(run)
  if (!hit) return run
  const rule = findHeadJarUpgradeRule(run)

  return {
    ...run,
    primaryFate: 'head_jar',
    setpiece: {
      ...run.setpiece,
      fateUpdatePending: {
        from: 'mortgaged',
        to: 'head_jar',
        trigger: hit.trigger
      }
    },
    logs: [(rule?.logLine ?? hit.logLine), ...run.logs].slice(0, 80)
  }
}

function applyGhostBoundFromWeekend(run: PlayRunState): PlayRunState {
  if (run.primaryFate !== 'ghost_bound') return run
  if (run.ghostLedger) return run
  return initGhostLedgerOnTransition(run)
}

/** 供 composable / spec：命运态变化时应 recordFateSeen 的 fate */
export function fateTransitionMetaHook(
  run: PlayRunState,
  prevFate: PrimaryFate
): PrimaryFate | null {
  if (run.primaryFate !== prevFate) return run.primaryFate
  return null
}

/** logic-only meta 突变辅助：transition apply 后应记录的 fate */
export function exportMetaFateSeenFromTransition(
  run: PlayRunState,
  prevFate: PrimaryFate
): PrimaryFate | undefined {
  return fateTransitionMetaHook(run, prevFate) ?? undefined
}

export function applyFateTransition(run: PlayRunState): PlayRunState {
  if (run.runMode !== 'fate_run') return run

  const headJarHit = detectHeadJarUpgrade(run)
  if (headJarHit) {
    return applyHeadJarUpgrade(run)
  }

  if (run.runStatus === 'fated') {
    return applyGhostBoundFromWeekend(run)
  }

  const hit = detectFateTransition(run)
  if (!hit) return run

  const week = run.chapter?.chapterWeekIndex
  const result = buildTransitionResult(run, hit)
  const incomingTags = result.tags.map((t) => ({
    ...t,
    appliedAtWeek: t.appliedAtWeek ?? week,
    source: t.source ?? hit.triggerId
  }))

  const fromFate = run.primaryFate
  const needsOverlay = result.primaryFate !== fromFate

  return {
    ...run,
    runStatus: 'fated',
    primaryFate: result.primaryFate,
    institutionalTags: mergeTagRecords(run.institutionalTags, incomingTags),
    setpiece: needsOverlay
      ? {
          ...run.setpiece,
          fateUpdatePending: {
            from: fromFate,
            to: result.primaryFate,
            trigger: hit.triggerId
          }
        }
      : run.setpiece,
    logs: [result.logLine, ...run.logs].slice(0, 80)
  }
}
