import type { ChapterOutcomeId } from '~/types/chapter'
import type {
  ChapterCollapseTriggerId,
  InstitutionalTagId,
  PlayRunState,
  PlayRunStatus,
  PrimaryFate,
  TagRecord
} from '~/types/play'
import { STAGE_M0_PRE, STAGE_M1_CONTRACT } from '~/logic/play/stageDefs'

/** 可继续 tick 周的状态（D-18） */
export function isPlayableRunStatus(status: PlayRunStatus): boolean {
  return status === 'active' || status === 'fated'
}

/**
 * pre / 无 chapter → M0；chapter 进行中 → M1。
 * week 边界：lifeStage pre 或缺少 chapter 视为 M0。
 */
export function deriveStageIdFromRun(run: PlayRunState): string {
  if (run.lifeStage === 'pre' || !run.chapter) {
    return STAGE_M0_PRE.id
  }
  return STAGE_M1_CONTRACT.id
}

export function defaultFateFieldsForRun(
  run: PlayRunState
): Pick<PlayRunState, 'primaryFate' | 'institutionalTags' | 'stageId'> {
  return {
    primaryFate: 'human',
    institutionalTags: [],
    stageId: deriveStageIdFromRun(run)
  }
}

/** 同 id 刷新 appliedAtWeek / expiry；incoming 字段覆盖 existing */
export function mergeTagRecords(existing: TagRecord[], incoming: TagRecord[]): TagRecord[] {
  const byId = new Map<InstitutionalTagId, TagRecord>()
  for (const tag of existing) {
    byId.set(tag.id, tag)
  }
  for (const tag of incoming) {
    const prev = byId.get(tag.id)
    byId.set(tag.id, prev ? { ...prev, ...tag, id: tag.id } : tag)
  }
  return [...byId.values()]
}

function tagRecord(id: InstitutionalTagId, appliedAtWeek?: number, source?: string): TagRecord {
  return { id, appliedAtWeek, source }
}

export function mapCollapseTriggerToFate(
  triggerId: ChapterCollapseTriggerId | undefined,
  outcomeId?: ChapterOutcomeId
): { primaryFate: PrimaryFate; tags: TagRecord[] } {
  if (
    triggerId === 'body_integrity' ||
    triggerId === 'body_exhaustion' ||
    outcomeId === 'collapse_body'
  ) {
    return { primaryFate: 'mortgaged', tags: [] }
  }
  if (triggerId === 'debt_delinquency' || outcomeId === 'collapse_debt') {
    return {
      primaryFate: 'human',
      tags: [tagRecord('credit_blacklist'), tagRecord('supply_cut')]
    }
  }
  if (triggerId === 'debt_stress_ratio') {
    return { primaryFate: 'human', tags: [tagRecord('credit_blacklist')] }
  }
  if (triggerId === 'review_gate' || outcomeId === 'collapse_review') {
    return { primaryFate: 'human', tags: [tagRecord('exam_probation')] }
  }
  return { primaryFate: 'human', tags: [tagRecord('credit_blacklist')] }
}

/** legacy collapsed chapter 档 → 可续玩 fated（D-10） */
export function migrateCollapsedToFated(run: PlayRunState): PlayRunState {
  if (run.runStatus !== 'collapsed') return run

  const triggerId = run.archive?.failurePostMortem?.triggerId
  const outcomeId = run.chapter?.outcomeId
  const week = run.chapter?.chapterWeekIndex
  const mapped = mapCollapseTriggerToFate(triggerId, outcomeId)
  const tags = mapped.tags.map((t) => ({
    ...t,
    appliedAtWeek: t.appliedAtWeek ?? week,
    source: t.source ?? 'continuity'
  }))

  const continuityLog =
    '灵籍续存：契约未归档，制度已将本档标记为命运态，你可继续推进周程。'

  return {
    ...run,
    runStatus: 'fated',
    primaryFate: mapped.primaryFate,
    institutionalTags: mergeTagRecords(run.institutionalTags ?? [], tags),
    stageId: run.stageId || deriveStageIdFromRun(run),
    logs: [continuityLog, ...run.logs].slice(0, 80)
  }
}

export function upgradeRunToSchemaV5(run: PlayRunState): PlayRunState {
  const defaults = defaultFateFieldsForRun(run)
  let next: PlayRunState = {
    ...run,
    schemaVersion: 5,
    primaryFate: run.primaryFate ?? defaults.primaryFate,
    institutionalTags: run.institutionalTags ?? defaults.institutionalTags,
    stageId: run.stageId ?? defaults.stageId
  }
  if (next.runStatus === 'collapsed' && next.runMode === 'chapter') {
    next = migrateCollapsedToFated(next)
  }
  return next
}
