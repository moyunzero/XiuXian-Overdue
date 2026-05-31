import ch0Config from '../../../data/chapters/ch0-forty-week-contract.json'
import type {
  BeatDef,
  ChapterConfig,
  ChapterId,
  SegmentDef
} from '~/types/chapter'

const CHAPTER_CONFIGS: Record<string, ChapterConfig> = {
  [ch0Config.id]: ch0Config as ChapterConfig
}

export function listChapterIds(): ChapterId[] {
  return Object.keys(CHAPTER_CONFIGS) as ChapterId[]
}

export function getChapterConfig(id: ChapterId): ChapterConfig {
  const config = CHAPTER_CONFIGS[id]
  if (!config) {
    throw new Error(`Unknown chapter config: ${id}`)
  }
  return config
}

export function segmentForWeek(config: ChapterConfig, weekIndex: number): SegmentDef | null {
  if (weekIndex < 1) return null
  return (
    config.segments.find((s) => weekIndex >= s.weekFrom && weekIndex <= s.weekTo) ?? null
  )
}

export function beatsForWeek(config: ChapterConfig, weekIndex: number): BeatDef[] {
  return config.beats.filter((b) => b.week === weekIndex)
}

export function isNodeWeek(config: ChapterConfig, weekIndex: number): boolean {
  return config.beats.some((b) => b.week === weekIndex)
}

export function weeksRemaining(config: ChapterConfig, weekIndex: number): number {
  return Math.max(0, config.weekBudget - weekIndex)
}

export function getGateDef(config: ChapterConfig, gateId: string) {
  return config.gates.find((g) => g.id === gateId) ?? null
}
