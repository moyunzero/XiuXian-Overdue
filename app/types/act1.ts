import type { Background, StartConfig, Talent } from '~/types/game'

export type Act1Chapter = 'act1-pre-enrollment'

export type Act1ModuleId = 'interview' | 'loan' | 'family'

export type Act1WindowId = 'interview' | 'loan' | 'family' | 'messages' | 'recycle'

export type InterviewResult = 'reject' | 'conditional' | 'special'

export type FamilyOutcome = 'left' | 'saved-costly' | 'saved-false-hope'

export interface LoanContract {
  id: string
  lenderName: string
  /** 授信额度 / 合同名义本金 */
  principal: number
  /** 已动用本金 */
  drawn: number
  /** 已计提利息（动用后按日息累加） */
  accruedInterest: number
  dailyRate: number
  graceDaysLeft: number
  /** 阶段内下一还款日（展示用） */
  nextRepaymentDay?: number
  tags: string[]
}

export interface Act1InterviewState {
  completed: boolean
  result?: InterviewResult
  score: number
  answers: Record<string, string>
}

export interface Act1LoanMeta {
  adDismissCount: number
  /** 产品对比表累计阅读毫秒（≥30s 记比价标签） */
  compareViewMs: number
  comparedProducts: boolean
  popupAcknowledged: boolean
}

export interface Act1FamilyMeta {
  moneyRequests: number
  collectionStage: number
  /** 最近一次催收选项后的短反馈（供 UI 提示已生效） */
  lastChoiceFeedback?: string
}

export interface Act1Modifiers {
  familyResilienceBase: number
  loanRiskTier: 'low' | 'mid' | 'high'
  interviewBias: number
  regionRateMultiplier: number
}

export interface Act1State {
  chapter: Act1Chapter
  day: number
  cash: number
  familyResilience: number
  pressure: number
  delinquency: number
  profileTags: string[]
  interview: Act1InterviewState
  loanMeta: Act1LoanMeta
  loans: LoanContract[]
  creditLineUsed: number
  familyMeta: Act1FamilyMeta
  familyOutcome?: FamilyOutcome
  completedModules: Act1ModuleId[]
  pendingTodos: string[]
}

export interface Act1PermanentModifiers {
  interestRateMultiplier?: number
}

/** 入学前夜结算 → 周目 2 继承（不继承现金） */
export interface Act1Carryover {
  metaUnlocks: string[]
  permanentModifiers: Act1PermanentModifiers
  familyOutcome?: FamilyOutcome
}

export interface Act1Persist {
  startConfig: StartConfig
  act1: Act1State
  metaUnlocks: string[]
  permanentModifiers: Act1PermanentModifiers
  settled: boolean
}

export interface Act1Todo {
  id: string
  title: string
  tone?: 'info' | 'warn' | 'danger'
  module?: Act1ModuleId
  blocking?: boolean
}

/** 供 UI 展示的开局摘要 */
export interface Act1StartSummary {
  playerName: string
  startingCity: string
  background: Background
  talent: Talent
  initialDebt: number
}
