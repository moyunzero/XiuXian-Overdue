import type {
  StartConfig,
  SaveSlotId,
  EconomyState,
  PlayerStats,
  SchoolState,
  ClassTier
} from '~/types/game'
import type { Act1State, Act1Carryover, Act1PermanentModifiers, FamilyOutcome } from '~/types/act1'

/** v3 起仅 endless；旧存档读取后会在 parseV4Save 中归一化为 endless */
export type RunMode = 'endless'

/** 人生阶段 */
export type LifeStage = 'pre' | 'hs' | 'uni' | 'work'

/** 境界层级（无尽模式扩展） */
export type RealmTierId = 'mortal' | 'qi' | 'foundation' | 'purple' | 'core' | 'nascent' | 'deity' | 'void'

export type PlayRunStatus = 'active' | 'paused' | 'ended' | 'collapsed' | 'archived'

export type BodyPartId =
  | 'LeftPalm'
  | 'RightPalm'
  | 'LeftArm'
  | 'RightArm'
  | 'LeftLeg'
  | 'RightLeg'

export type BodyMortgageType = 'debt_reduction' | 'access_grant' | 'cultivation_boost'

export interface BodyMortgageOffer {
  partId: BodyPartId
  label: string
  repaymentValue: number
  lockedDebtAdded: number
  mortgageType: BodyMortgageType
  narrative: string
  irreversible: true
}

export interface BodyMortgageDecision {
  partId: BodyPartId
  acceptedAtDay: number
  lienId: string
}

export interface BodyMortgagePending {
  offers: BodyMortgageOffer[]
  mandatory: boolean
}

export type RunArchivePhase = 'pre-enrollment' | 'sprint-finale'

/** 短局 / 阶段终章制度档案（M4） */
export interface RunArchive {
  runId: string
  runMode: RunMode
  /** 入学前夜检查点 vs 短局终章 */
  archivePhase: RunArchivePhase
  lifeStagesVisited: LifeStage[]
  totalDebtAtEnd: number
  /** 玩家能复述的三条「欠了什么」 */
  debtOwedSummary: [string, string, string]
  topTags: string[]
  familyOutcome?: FamilyOutcome
  bodyLiens: string[]
  oneLineVerdict: string
  nextStageTeaser?: string
  epilogue: string[]
  fullReportLines?: string[]
  /** 短局崩盘原因（collapsed） */
  collapseReason?: string
  examSummary?: {
    score: number
    rank: number
    tierBefore: string
    tierAfter: string
    week: number
  }
}

export type InboxThreadKind = 'family' | 'loan' | 'system' | 'sect' | 'employer'

export interface InboxMessage {
  id: string
  threadId: string
  sender: string
  /** 消息标题（模板驱动） */
  title?: string
  preview: string
  body: string
  day: number
  read: boolean
  required: boolean
}

export interface InboxThread {
  id: string
  kind: InboxThreadKind
  title: string
  unreadCount: number
  messages: InboxMessage[]
}

export type PlayEffectKind = 'stat' | 'econ' | 'school' | 'log' | 'tag'

export interface PlayEffect {
  kind: PlayEffectKind
  payload: Record<string, unknown>
}

export interface PressureCardDef {
  id: string
  title: string
  description: string
  lifeStages: LifeStage[]
  /** 无尽境：仅列出的境界可发此牌；缺省表示不限境界 */
  realmTiers?: RealmTierId[]
  tags: string[]
  effectsOnPlay: PlayEffect[]
  effectsOnSkip?: PlayEffect[]
  requires?: { minCash?: number; maxDelinquency?: number; tags?: string[] }
  excludesCardIds?: string[]
}

export interface PressureRoundState {
  round: number
  offeredCardIds: [string, string, string, string]
  playedCardIds: string[]
  resolved: boolean
}

export interface ExamBossResult {
  score: number
  rank: number
  classTier: ClassTier
  tierBefore: ClassTier
  tierAfter: ClassTier
  perksDelta: { mealSubsidy: number; focusBonus: number }
  week: number
  perkSummary: string
}

/** 短局 S1 升学关口（庆典 + 账单打脸，非月考节拍） */
export interface HsPromotionGatePending {
  examsCompleted: number
  celebrationLine: string
  billLines: [string, string, string]
  totalDebt: number
  maintenanceBumpLabel: string
}

export type UniRankCohort = 'elite' | 'normal' | 'tail'

export interface UniSubscription {
  id: string
  label: string
  monthlyCost: number
  active: boolean
}

export interface UniFoundationKpi {
  daoXin: number
  faLi: number
  rouTi: number
}

export interface SectChoiceOption {
  id: string
  name: string
  harvestRateCap: number
  cohortBias: UniRankCohort
  deckBiasLabel: string
}

export interface SectChoicePending {
  prompt: string
  options: SectChoiceOption[]
}

export interface UniState {
  majorId: string
  sectId: string
  foundationKpi: UniFoundationKpi
  foundationProgress: UniFoundationKpi
  subscriptions: UniSubscription[]
  rankCohort: UniRankCohort
  rankingLabel: string
}

/** 战役终局分支（M7） */
export type CampaignEndingId = 'exit' | 'hold' | 'asset'

export interface CampaignProgress {
  completedStages: LifeStage[]
  stageDebtSnapshot: Partial<Record<LifeStage, number>>
  stageHarvestRate: Partial<Record<LifeStage, number>>
  stageMaintenanceCoeff?: Partial<Record<LifeStage, number>>
  chosenEnding?: CampaignEndingId
}

export interface HarvestLedgerStageRow {
  stage: LifeStage
  label: string
  realmOrRankPeak: string
  debtAtExit: number
  maintenancePaid: number
  harvestTaken: number
  netWorthDelta: number
}

export interface CampaignEndingOption {
  id: CampaignEndingId
  label: string
  blurb: string
}

export interface HarvestLedger {
  stages: HarvestLedgerStageRow[]
  verdict: string
  playableQuote: string
  endings: CampaignEndingOption[]
  totalHarvestTaken: number
  totalDebtAtEnd: number
}

/** 战役 → 无尽境 handoff（M7 接口，M9 完整规则） */
export interface CampaignToEndlessHandoff {
  inheritedDebt: number
  inheritedLiens: string[]
  startRealmTier: RealmTierId
  maintenanceStack: number
  harvestRate: number
}

export interface LienRecord {
  id: string
  kind: 'body' | 'contract' | 'system'
  label: string
  createdAtDay: number
  cannotRemove: true
}

/** 无尽境（M9） */
export interface EndlessState {
  maintenanceStack: number
  harvestRate: number
  daysInCurrentRealm: number
  breakthroughsCount: number
  irreversibleLiens: LienRecord[]
  /** 连续选择躺平压力牌的回合数；未选躺平则归零 */
  lieFlatStreak?: number
}

/** 破境关口（庆典 + 账单，不可还清胜利） */
export interface BreakthroughPending {
  currentRealmId: RealmTierId
  nextRealmId: RealmTierId
  currentRealmLabel: string
  nextRealmLabel: string
  celebrationLine: string
  billLines: [string, string, string]
  totalDebt: number
  maintenanceBumpLabel: string
  billRevealSeconds?: number
}

/** 职场阶（M6） */
export interface WorkState {
  jobId: string | null
  /** 学历/阶段标签，影响可选岗位 */
  educationTags: string[]
  monthlyTarget: number
  kpiScore: number
  /** 兼职羞辱类事件计数 */
  shameEvents: number
}

export interface SetpieceState {
  interview?: { phase: 'quiz' | 'result' | 'done'; score: number }
  loanPopup?: { dismissed: boolean; signed: boolean }
  examBoss?: {
    lastScore: number
    lastRank: number
    tierBefore: ClassTier
    tierAfter: ClassTier
  }
  /** 本局已完成的月考次数（每次 dismiss 月考 +1） */
  examsCompleted?: number
  /** 待玩家确认的月考 Boss 屏 */
  examBossPending?: ExamBossResult
  /** 待玩家确认的身体抵押单屏（M4） */
  bodyMortgagePending?: BodyMortgagePending
  /** 短局：第二次月考后的升学关口（确认后才可终章） */
  hsPromotionGatePending?: HsPromotionGatePending
  /** 玩家已确认升学关口，可写入 sprint-finale 档案 */
  hsPromotionGateResolved?: boolean
  /** 战役：高中毕业后择宗/择专业 */
  sectChoicePending?: SectChoicePending
  /** 战役：预科筑基 KPI 达标后的段末关口 */
  uniFoundationGatePending?: HsPromotionGatePending
  uniFoundationGateResolved?: boolean
  /** 战役：预科毕业后进入职场 */
  workPromotionGatePending?: HsPromotionGatePending
  workPromotionGateResolved?: boolean
  /** 战役 S3 终局：收割总账屏 */
  harvestLedgerPending?: HarvestLedger
  /** 无尽境：破境关口 */
  breakthroughPending?: BreakthroughPending
  collectionLadder?: { stage: 0 | 1 | 2 | 3 }
}

export interface InboxTemplateTrigger {
  lifeStage?: LifeStage
  chapterIndex?: number
  minDay?: number
  maxDay?: number
  minDelinquency?: number
  classTierIn?: ClassTier[]
  tags?: string[]
}

export interface InboxTemplate {
  id: string
  threadId: string
  threadKind: InboxThreadKind
  threadTitle: string
  sender: string
  preview?: string
  trigger: InboxTemplateTrigger
  title: string
  body: string
  required: boolean
  choices?: { id: string; label: string; effects: PlayEffect[] }[]
}

export interface DebtDashboardVM {
  principal: number
  interestAccrued: number
  totalDue: number
  nextPaymentDay: number
  daysUntilPayment: number
  delinquencyLevel: number
  dailyRate: number
  collectionFee: number
  cash: number
  minPayment: number
  /** 大学预科：宗门显示名（已择宗时） */
  sectDisplayName?: string
  subscriptionMonthly?: number
  maintenanceCoeff?: number
  /** 职场：五险一金池在明细中的标签 */
  collectionFeeLabel?: string
  /** 职场：预估本周复利（本金×日利率×7） */
  projectedWeeklyInterest?: number
  /** 职场：显性「还不完」提示 */
  compoundWarning?: string
  /** 职场催收档位 */
  workCollectionTitle?: string
  workCollectionBody?: string
}

export interface PlayRunState {
  schemaVersion: 4
  runId: string
  runMode: RunMode
  createdAt: string
  updatedAt: string
  lifeStage: LifeStage
  chapterIndex: number
  realmTier: RealmTierId
  realmIndex: number
  start: StartConfig
  slotId: SaveSlotId
  runStatus: PlayRunStatus
  logs: string[]
  profileTags: string[]
  inbox: InboxThread[]
  /** 高中及以后主循环 RNG 种子 */
  seed?: number
  /** 经济 / 属性 / 学校（M2 hs 起用） */
  econ?: EconomyState
  stats?: PlayerStats
  school?: SchoolState
  /** 压力牌回合（M2） */
  pressure?: PressureRoundState
  /** 名场面 / 月考等（M3） */
  setpiece?: SetpieceState
  carryoverFromAct1?: Act1Carryover
  /** 可选嵌入 act1 快照（M1 仍以 act1BySlot 为主存） */
  act1?: Act1State
  /** 阶段终章档案（入学前夜 / 短局终局） */
  archive?: RunArchive
  bodyIntegrity?: number
  bodyReputation?: 'clean' | 'marked'
  bodyPartRepayment?: Partial<Record<BodyPartId, boolean>>
  bodyLiens?: string[]
  lastBodyPartRepaymentDay?: number
  buyDebasement?: number
  /** 维护费累乘系数（跨阶段结转，M5+） */
  maintenanceCoeff?: number
  /** 大学阶状态（M5） */
  uni?: UniState
  /** 职场阶状态（M6） */
  work?: WorkState
  /** 战役跨阶段进度（M7） */
  campaign?: CampaignProgress
  /** 无尽境（M7 handoff 占位，M9 扩展） */
  endless?: EndlessState
  /** M8：本局已触发的 AI/模板 瞬间（每 trigger 至多一次） */
  aiMomentsFired?: PlayAiTrigger[]
}

/** M8：轻量 AI 瞬间触发点 */
export type PlayAiTrigger = 'post-exam' | 'delinquency-spike' | 'breakthrough'

/** M8：跨 run 元进度（`kunxu_sim_save_v4.meta`） */
export interface PlayMeta {
  priorMetaUnlocks: string[]
  hiddenStandardsRevealed: string[]
  realmNotesUnlocked: Partial<Record<RealmTierId, string[]>>
  campaignCompletions: number
  endlessMaxRealmIndex: number
  /** 默认 true；关闭后仅用模板且不请求 Groq */
  aiEventsEnabled: boolean
}

export interface KunxuSaveV4 {
  saveSchemaVersion: 4
  activeRunId: string | null
  runs: Record<string, PlayRunState>
  meta: PlayMeta
}

export interface PlayStatusBarModel {
  day: number
  cash: number
  debt: number
  rankLabel: string
  delinquency: number
  realmLabel: string
  lifeStageLabel: string
}
