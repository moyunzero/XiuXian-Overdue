import type { LifeStage } from '~/types/play'

/** 开放 union：新章节只加 id + json */
export type ChapterId = 'ch0-forty-week-contract' | (string & {})

export type EmploymentTrack = 'company' | 'gig' | 'startup'

export type ChapterOutcomeId =
  | 'fulfilled'
  | 'breach'
  | 'collapse_debt'
  | 'collapse_body'
  | 'collapse_review'
  | 'degraded_uni'
  | 'degraded_work'

export type WeekActionId =
  | 'repay'
  | 'study'
  | 'tuna'
  | 'parttime'
  | 'work'
  | 'rest'
  | 'borrow'
  | 'inbox'

/** head_jar 维生档位（周末结算扣费，开本周仅预览） */
export type MaintenanceTier = 'sustain' | 'austerity'

/** head_jar 委托指令（双槽排程） */
export type DelegationJobId = 'yang_patrol' | 'collection_escort' | 'penalty_register'

export type BeatKind =
  | 'monthly_exam'
  | 'hs_graduation'
  | 'sect_choice'
  | 'quota_audit'
  | 'uni_graduation'
  | 'employment_choice'
  | 'work_review'
  | 'contract_finale'
  | string

export interface SegmentDef {
  id: string
  lifeStage: LifeStage
  weekFrom: number
  weekTo: number
  label: string
  allowedActions?: WeekActionId[]
}

export interface BeatDef {
  week: number
  kind: BeatKind
  handler: string
  gateId?: string
  blocking?: boolean
}

export interface GatePassEffect {
  setLifeStage?: LifeStage
  tags?: string[]
  requires?: string[]
  outcomeHint?: ChapterOutcomeId
}

export interface GateDef {
  id: string
  onPass?: GatePassEffect
  onFailDefault?: GatePassEffect
}

export interface ChapterConfig {
  id: ChapterId
  title: string
  weekBudget: number
  entryLifeStage: LifeStage
  segments: SegmentDef[]
  beats: BeatDef[]
  gates: GateDef[]
  mandatePools: { routine: string; nodeBonus?: string; family?: string }
  outcomes: ChapterOutcomeId[]
  weekActions: WeekActionId[]
  carryoverFrom?: 'act1' | 'prior-chapter'
  metaEffectsArchive?: boolean
}

export interface ChapterState {
  chapterId: ChapterId
  weekBudget: number
  chapterWeekIndex: number
  weeksRemaining: number
  segmentWeek?: number
  outcomeId?: ChapterOutcomeId
  segmentId?: string
  /** 待玩家确认的闸门 id（setpiece 完成后调用 openSegmentGate） */
  pendingGateId?: string
  /** 已完成 setpiece 确认的节拍周（避免同周重复触发 beat） */
  resolvedBeatWeeks?: number[]
}

export interface MandateState {
  numbness: number
  domestication: number
  pendingDeliveryIds: string[]
  supplyCutStreak: number
  /** head_jar 维生费连续不足次数（≥2 可触发器藏升级） */
  maintenanceFailureStreak?: number
}

export type MandatePoolKey = 'routine' | 'nodeBonus' | 'family'

export type MandateEffectKind =
  | 'cash'
  | 'delinquency'
  | 'domestication'
  | 'numbness'
  | 'supplyCutStreak'
  | 'log'
  | 'institutionalTag'
  | 'queueMandate'
  | 'primaryFateTransition'

export interface MandateEffect {
  kind: MandateEffectKind
  value?: number
  message?: string
  tagId?: string
  expiryWeek?: number
  /** queueMandate: 追加队列的来文 id */
  mandateId?: string
  /** primaryFateTransition: 目标主命运态 id */
  toFate?: string
}

export interface MandateResponseDef {
  id: string
  label: string
  /** 麻木时仍保留的劣质出路（拖、借、硬扛） */
  grit?: boolean
  effects: MandateEffect[]
  /** UI cost hint (灵石± / 压力±) */
  costHint?: string
  /** instant = 选后立即生效；weekend = 本周末入账 */
  effectTiming?: 'instant' | 'weekend'
}

export interface MandateDeliveryDef {
  id: string
  title: string
  body: string
  lifeStages: LifeStage[]
  minWeek?: number
  maxWeek?: number
  requiresTags?: string[]
  minDelinquency?: number
  pool?: MandatePoolKey
  responses: MandateResponseDef[]
  /** LOOP-04: stage ladder filter (empty = any) */
  stageIds?: string[]
  /** LOOP-04: primary fate filter */
  primaryFates?: string[]
  /** LOOP-04: required institutional tags */
  requiresInstitutionalTags?: string[]
  /** Weight for weighted pick (default 1) */
  weight?: number
  /** Min effects count on responses to avoid pure narrative */
  minEffectCount?: number
  /** Display issuer tag for UI */
  issuerTag?: string
}

export interface WeekPlan {
  repay: 'min' | 'partial' | 'extra' | 'skip'
  studyHours: number
  tunaHours: number
  parttimeHours: number
  workHours: number
  rest: boolean
  repeatLastWeek?: boolean
  /** head_jar：维生档位（开本周必填，周末扣费） */
  maintenanceTier?: MaintenanceTier
  /** head_jar：委托指令（开本周必填） */
  delegationJob?: DelegationJobId
}

export const DEFAULT_CHAPTER_ID: ChapterId = 'ch0-forty-week-contract'
