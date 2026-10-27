import type { ChapterCollapseTriggerId, FateShell, PrimaryFate, TagRecord } from '~/types/play'

export interface FateDefJson {
  id: PrimaryFate
  displayName: string
  playable: boolean
  shell: FateShell
}

export type FateTransitionTrigger =
  | {
      kind: 'collapse_metric'
      triggerId?: string
      triggerIds?: string[]
    }
  | {
      kind: 'metric_threshold'
      field: string
      op: 'lt' | 'gte'
      valueRef: string
    }

export interface FateTransitionRule {
  id: string
  fromFates: PrimaryFate[]
  toFate: PrimaryFate
  trigger: FateTransitionTrigger
  overlay?: {
    title?: string
    bodyLine: string
  }
  logLine?: string
  setFated?: boolean
  institutionalTags?: string[]
  requiresRunStatus?: string[]
}

export interface FateTransitionResult {
  primaryFate: PrimaryFate
  tags: TagRecord[]
  logLine: string
  overlayBodyLine?: string
  setFated?: boolean
  trigger: string
  fromFate: PrimaryFate
}
