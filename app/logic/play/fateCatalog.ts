import humanFate from '../../../data/fates/human.json'
import indenturedFate from '../../../data/fates/indentured.json'
import mortgagedFate from '../../../data/fates/mortgaged.json'
import ghostVoluntaryFate from '../../../data/fates/ghost_voluntary.json'
import headJarFate from '../../../data/fates/head_jar.json'
import ghostBoundFate from '../../../data/fates/ghost_bound.json'
import shatteredFate from '../../../data/fates/shattered.json'
import collapseBodyToMortgaged from '../../../data/fate-transitions/collapse-body-to-mortgaged.json'
import collapseDebtBlacklist from '../../../data/fate-transitions/collapse-debt-blacklist.json'
import collapseDebtStress from '../../../data/fate-transitions/collapse-debt-stress.json'
import collapseReviewProbation from '../../../data/fate-transitions/collapse-review-probation.json'
import mortgagedToHeadJarIntegrity from '../../../data/fate-transitions/mortgaged-to-head-jar-integrity.json'
import mortgagedToHeadJarMaintenance from '../../../data/fate-transitions/mortgaged-to-head-jar-maintenance.json'
import {
  analyzeChapterCollapseMetrics,
  type ChapterCollapseCheck
} from '~/logic/play/chapterCollapse'
import {
  HEAD_JAR_INTEGRITY,
  HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD,
  headJarTransitionEligible
} from '~/logic/play/headJarWeekPlan'
import type {
  FateDefJson,
  FateTransitionResult,
  FateTransitionRule
} from '~/types/fate'
import type { ChapterCollapseTriggerId, FateShell, PlayRunState, PrimaryFate } from '~/types/play'

const FATE_DEFS: FateDefJson[] = [
  humanFate,
  indenturedFate,
  mortgagedFate,
  ghostVoluntaryFate,
  headJarFate,
  ghostBoundFate,
  shatteredFate
] as FateDefJson[]

const TRANSITION_RULES: FateTransitionRule[] = [
  collapseBodyToMortgaged,
  collapseDebtBlacklist,
  collapseDebtStress,
  collapseReviewProbation,
  mortgagedToHeadJarIntegrity,
  mortgagedToHeadJarMaintenance
] as FateTransitionRule[]

const FATES_BY_ID = new Map<PrimaryFate, FateDefJson>(
  FATE_DEFS.map((f) => [f.id, f])
)

function triggerIds(rule: FateTransitionRule): string[] {
  const t = rule.trigger
  if (t.kind !== 'collapse_metric') return []
  if (t.triggerIds?.length) return t.triggerIds
  return t.triggerId ? [t.triggerId] : []
}

function tagsFromRule(rule: FateTransitionRule): FateTransitionResult['tags'] {
  return (rule.institutionalTags ?? []).map((id) => ({ id: id as FateTransitionResult['tags'][0]['id'] }))
}

export function getFateDef(id: PrimaryFate): FateDefJson {
  const def = FATES_BY_ID.get(id)
  if (!def) throw new Error(`Unknown fate catalog entry: ${id}`)
  return def
}

export function listFateDefs(): FateDefJson[] {
  return [...FATES_BY_ID.values()]
}

export function getFateShellFromCatalog(fateId: PrimaryFate): FateShell {
  return getFateDef(fateId).shell
}

export function listTransitionsForFate(fromFate: PrimaryFate): FateTransitionRule[] {
  return TRANSITION_RULES.filter((r) => r.fromFates.includes(fromFate))
}

export function findCollapseRule(triggerId: ChapterCollapseTriggerId): FateTransitionRule | undefined {
  return TRANSITION_RULES.find(
    (r) => r.trigger.kind === 'collapse_metric' && triggerIds(r).includes(triggerId)
  )
}

export function mapTriggerFromCatalog(triggerId: ChapterCollapseTriggerId): {
  primaryFate: PrimaryFate
  tags: FateTransitionResult['tags']
} {
  const rule = findCollapseRule(triggerId)
  if (!rule) {
    return { primaryFate: 'human', tags: [{ id: 'credit_blacklist' }] }
  }
  return {
    primaryFate: rule.toFate,
    tags: tagsFromRule(rule)
  }
}

function metricThresholdMet(run: PlayRunState, rule: FateTransitionRule): boolean {
  if (rule.trigger.kind !== 'metric_threshold') return false
  const { field, op, valueRef } = rule.trigger
  let threshold = 0
  if (valueRef === 'HEAD_JAR_INTEGRITY') threshold = HEAD_JAR_INTEGRITY
  if (valueRef === 'HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD') {
    threshold = HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD
  }
  const integrity = run.bodyIntegrity ?? 1
  const streak = run.mandate?.maintenanceFailureStreak ?? 0
  const value = field === 'bodyIntegrity' ? integrity : field === 'maintenanceFailureStreak' ? streak : 0
  return op === 'lt' ? value < threshold : value >= threshold
}

export function findHeadJarUpgradeRule(run: PlayRunState): FateTransitionRule | null {
  if (run.runMode !== 'fate_run') return null
  if (run.primaryFate !== 'mortgaged') return null
  if (run.runStatus !== 'fated') return null
  if (run.setpiece?.fateUpdatePending?.to === 'head_jar') return null
  if (!headJarTransitionEligible(run)) return null

  const candidates = listTransitionsForFate('mortgaged').filter(
    (r) => r.toFate === 'head_jar' && r.trigger.kind === 'metric_threshold'
  )
  for (const rule of candidates) {
    if (rule.requiresRunStatus?.length && !rule.requiresRunStatus.includes(run.runStatus)) {
      continue
    }
    if (metricThresholdMet(run, rule)) return rule
  }
  return null
}

export function detectHeadJarUpgradeFromCatalog(run: PlayRunState): {
  trigger: string
  logLine: string
  rule: FateTransitionRule
} | null {
  const rule = findHeadJarUpgradeRule(run)
  if (!rule) return null
  const trigger =
    rule.trigger.kind === 'metric_threshold' && rule.trigger.field === 'bodyIntegrity'
      ? 'integrity_threshold'
      : 'maintenance_failure'
  return {
    trigger,
    logLine: rule.logLine ?? rule.overlay?.bodyLine ?? '维生容器登记启动。',
    rule
  }
}

export function resolveOverlayCopy(
  trigger: string | undefined,
  toFate: PrimaryFate
): string | undefined {
  if (toFate === 'ghost_bound') {
    return '阳债未清，阴司将你编入绑定幽影档——双账并行结算。'
  }
  for (const rule of TRANSITION_RULES) {
    if (rule.toFate !== toFate) continue
    if (rule.trigger.kind === 'collapse_metric') {
      const ids = triggerIds(rule)
      if (trigger && ids.includes(trigger)) {
        return rule.overlay?.bodyLine
      }
    }
    if (rule.trigger.kind === 'metric_threshold') {
      const mapped =
        rule.trigger.field === 'bodyIntegrity' ? 'integrity_threshold' : 'maintenance_failure'
      if (trigger === mapped) return rule.overlay?.bodyLine
    }
  }
  return undefined
}

export function evaluateCollapseTransition(run: PlayRunState): ChapterCollapseCheck | null {
  if (run.chapter?.outcomeId === 'collapse_review') {
    const rule = findCollapseRule('review_gate')
    return {
      outcomeId: 'collapse_review',
      triggerId: 'review_gate',
      logLine:
        rule?.logLine ??
        '关键审判关未过且无降级路——征信灵籍写入审查挂科档，命运态续存。'
    }
  }
  return analyzeChapterCollapseMetrics(run)
}

export function buildTransitionResult(
  run: PlayRunState,
  hit: ChapterCollapseCheck
): FateTransitionResult {
  const rule = findCollapseRule(hit.triggerId)
  const mapped = mapTriggerFromCatalog(hit.triggerId)
  return {
    primaryFate: mapped.primaryFate,
    tags: mapped.tags,
    logLine: rule?.logLine ?? hit.logLine,
    overlayBodyLine: rule?.overlay?.bodyLine,
    setFated: rule?.setFated ?? true,
    trigger: hit.triggerId,
    fromFate: run.primaryFate
  }
}
