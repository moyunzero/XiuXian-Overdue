import { formatProfileTags } from '~/logic/act1/profileTagLabels'
import { assertPlayerFacingStringsAreLocalized } from '~/logic/play/playerFacingCopy'
import { BODY_PART_LABELS } from '~/logic/play/bodyMortgage'
import type { BodyPartId, RunArchivePhase, RunMode } from '~/types/play'

const RUN_MODE_LABELS: Record<RunMode, string> = {
  sprint: '短局',
  campaign: '人生战役',
  endless: '无尽境'
}

const ARCHIVE_PHASE_LABELS: Record<RunArchivePhase, string> = {
  'pre-enrollment': '入学前夜归档',
  'sprint-finale': '高中卷终章'
}

/** 周目模式 → 玩家可见中文 */
export function formatRunModeForArchive(mode: RunMode): string {
  return RUN_MODE_LABELS[mode] ?? mode
}

/** 档案阶段 → 玩家可见中文 */
export function formatArchivePhaseLabel(phase: RunArchivePhase): string {
  return ARCHIVE_PHASE_LABELS[phase] ?? phase
}

/** 单条身体留置 ID → 中文说明 */
export function formatBodyLienForArchive(lienId: string): string {
  const match = /^lien-([^-]+)-(\d+)$/.exec(lienId)
  if (!match) return `身体留置（${lienId}）`
  const [, partId, day] = match
  const label = BODY_PART_LABELS[partId as BodyPartId] ?? partId
  return `${label} · 第 ${day} 日写入留置`
}

export function formatBodyLiensForArchive(lienIds: string[]): string[] {
  return lienIds.map(formatBodyLienForArchive)
}

/** 档案标签 ID 列表 → 去重后的中文展示名 */
export function formatArchiveTopTags(tagIds: string[], limit = 8): string[] {
  return formatProfileTags(tagIds, limit)
}

/** @deprecated 使用 assertPlayerFacingStringsAreLocalized；保留别名供档案 spec */
export const assertArchiveDisplayStringsAreLocalized = assertPlayerFacingStringsAreLocalized
