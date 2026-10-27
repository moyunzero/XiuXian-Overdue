import type { LifeStage, PrimaryFate } from '~/types/play'
import type { MandatePoolKey } from '~/types/chapter'

export interface StageDef {
  id: string
  displayName: string
  weekRange?: [number, number]
  contentPack?: string
}

export interface StageEventFilter {
  includeLifeStages?: LifeStage[]
  includeIdPrefixes?: string[]
  includeIds?: string[]
  excludeIds?: string[]
}

export interface StageManifest extends StageDef {
  chapterId: string | null
  mandatePools: Partial<Record<MandatePoolKey, string>>
  lifeStages: LifeStage[]
  defaultFate: PrimaryFate
  tagPools: string[]
  eventPack: string
  eventFilter?: StageEventFilter
  unlockMeta: Record<string, unknown>
}
