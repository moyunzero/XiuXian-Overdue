export type Background = '贫民' | '中产' | '富户'
export type Talent = '无灵根' | '伪灵根' | '天灵根'

export type ActionId =
  | 'study'
  | 'tuna'
  | 'train'
  | 'parttime'
  | 'buy'
  | 'borrow'
  | 'repay'
  | 'rest'

export type SlotId = 'morning' | 'afternoon' | 'night'

export type BodyPartId = 'LeftPalm' | 'RightPalm' | 'LeftArm' | 'RightArm' | 'LeftLeg' | 'RightLeg'

export interface StartConfig {
  playerName: string
  background: Background
  talent: Talent
  initialDebt: number
  startingCity: string
}

export interface PlayerStats {
  daoXin: number // 道心等级（整数）
  faLi: number // 法力（可小数）
  rouTi: number // 肉体强度（0~10，炼气期）
  fatigue: number // 0~100，越高越累
  focus: number // 0~100，影响走神率
}

export interface EconomyState {
  cash: number
  collectionFee: number // 系统费用池（学籍维护费、风控费、催收服务费）
  coreDebt: number // 核心债（制度性债务，不可被常规还款直接清零）
  initialCoreDebt: number // 开局核心债快照，用于计算核心债下限
  debtPrincipal: number
  debtInterestAccrued: number
  dailyRate: number // 日利率（例如 0.008）
  delinquency: number // 逾期等级（0 起）
  lastPaymentDay: number
}

export interface SchoolState {
  day: number
  week: number
  slot: SlotId
  classTier: '示范班' | '普通班' | '末位班'
  lastExamScore: number
  lastRank: number
  perks: {
    mealSubsidy: number
    focusBonus: number
  }
}

export interface ContractState {
  active: boolean
  name: string
  patron: string
  progress: number // 0~100，象征“契约缠绕程度”
  vigilance: number // 0~100，越高越容易触发监工
  lastTriggerDay: number
  lastTriggerSlot?: SlotId
}

export interface LogEntry {
  id: string
  day: number
  title: string
  detail: string
  tone?: 'info' | 'warn' | 'danger' | 'ok'
}

export interface BodyPartConfig {
  id: BodyPartId
  label: string
  repaymentValue: number
  modelNodeName: string
}

export type EventTone = 'info' | 'warn' | 'danger' | 'ok'

/** EVT-03：内嵌「社交 / 试功 / 法赛」族名，与 data/events.json 的 family 一致 */
export const EVT03_EVENT_FAMILIES = ['社交', '试功', '法赛'] as const
export type Evt03EventFamily = (typeof EVT03_EVENT_FAMILIES)[number]

export type EventPhase = 'afterAction' | 'endOfDay'

export interface EventTrigger {
  minDay?: number
  maxDay?: number
  minDebt?: number
  maxDebt?: number
  minCash?: number
  maxCash?: number
  minDelinquency?: number
  maxDelinquency?: number
  classTierIn?: SchoolState['classTier'][]
  contractActive?: boolean
}

export type EventEffectKind = 'stat' | 'econ' | 'debt' | 'contract' | 'school' | 'log'

export interface BaseEventEffect {
  kind: EventEffectKind
}

export interface StatEventEffect extends BaseEventEffect {
  kind: 'stat'
  target: keyof PlayerStats
  delta: number
}

export interface EconEventEffect extends BaseEventEffect {
  kind: 'econ'
  target: keyof EconomyState
  delta: number
}

export interface DebtEventEffect extends BaseEventEffect {
  kind: 'debt'
  mode: 'addPrincipal' | 'addInterest'
  amount: number
}

export interface ContractEventEffect extends BaseEventEffect {
  kind: 'contract'
  target: 'active' | 'progress' | 'vigilance'
  // 对 active 使用 value，其余使用 delta
  value?: boolean
  delta?: number
}

export interface SchoolEventEffect extends BaseEventEffect {
  kind: 'school'
  target: 'classTier'
  value: SchoolState['classTier']
}

export interface LogEventEffect extends BaseEventEffect {
  kind: 'log'
  title: string
  detail: string
  tone?: LogEntry['tone']
}

export type EventEffect =
  | StatEventEffect
  | EconEventEffect
  | DebtEventEffect
  | ContractEventEffect
  | SchoolEventEffect
  | LogEventEffect

export interface EventOptionDefinition {
  id: string
  label: string
  tone?: 'normal' | 'danger' | 'primary'
  description?: string
  effects: EventEffect[]
}

export interface EventDefinition {
  id: string
  title: string
  body: string
  type: string
  /** 同族互斥冷却（D-02），与 id 冷却并行 */
  family?: string
  tone?: EventTone
  phase?: EventPhase
  weight?: number
  cooldownDays?: number
  maxTimes?: number
  trigger?: EventTrigger
  /** EVT-02：关键事件双反馈层级（D-07） */
  tier?: 'critical' | 'normal'
  /** EVT-02：ESC/遮罩关闭等价选项（D-16） */
  defaultOptionId?: string
  /** 弹窗折叠区短摘要（critical 建议配置） */
  systemSummary?: string
  /** 弹窗折叠区量化明细 */
  systemDetails?: string
  /** 未在 JSON 出现则视为 false（03-RESEARCH） */
  mandatory?: boolean
  options: EventOptionDefinition[]
}

export interface PendingEvent {
  /** 对应数据事件的 ID（代码生成的临时事件可为空） */
  eventId?: string
  title: string
  body: string
  options: Array<{
    id: string
    label: string
    tone?: 'normal' | 'danger' | 'primary'
  }>
  mandatory?: boolean
  tier?: 'critical' | 'normal'
  systemSummary?: string
  systemDetails?: string
  defaultOptionId?: string
}

export interface GameState {
  started: boolean
  seed: number
  startConfig?: StartConfig
  stats: PlayerStats
  econ: EconomyState
  school: SchoolState
  contract: ContractState
  logs: LogEntry[]
  /** 事件触发历史，用于冷却与次数限制 */
  eventHistory?: Record<
    string,
    {
      lastDay: number
      times: number
    }
  >
  /** 同 family 上次触发日（D-02） */
  familyHistory?: Record<string, { lastDay: number }>
  pendingEvent?: PendingEvent
  bodyPartRepayment?: Record<string, boolean>
  /** 最近一次身体偿还的天数，用于冷却 */
  lastBodyPartRepaymentDay?: number

  /**
   * 身体完整度（0.0~1.0）
   * 每次偿还身体部位后乘以 0.8，影响所有行动增益与疲劳消耗。
   * 绝不在 UI 中以数值形式展示。
   */
  bodyIntegrity?: number

  /**
   * 社会评价
   * 'clean'：未被标记（默认）
   * 'marked'：已被标记（永久不可逆）
   * 影响借贷利率（×1.2）和补给价格（×1.15）。
   * 绝不在 UI 中以任何形式展示。
   */
  bodyReputation?: 'clean' | 'marked'

  /**
   * 补剂劣化度（非负数）
   * 每次成功购买补给 +1，每天衰减 0.2。
   * 影响动态估值（Debasement_Penalty = buyDebasement × 0.05）。
   * 绝不在 UI 中展示。
   */
  buyDebasement?: number

  /**
   * 最近一次身体部位偿还的游戏天数
   * 用于叙事延迟（偿还后第3天触发模糊日志）。
   */
  lastBodyPartDay?: number

  /**
   * 待触发的叙事延迟队列
   * 每次偿还身体部位时推入 {day, partId}，
   * endDay() 检查 day+3 时触发对应部位的模糊感受日志。
   */
  pendingNarratives?: Array<{ day: number; partId: string }>

  /** 当日各时段已执行行动（日终用于偏科/路线判定，周结后清空） */
  daySlotActions?: Partial<Record<SlotId, ActionId>>
  /** 连续「纯刷分日」天数（三时段均为 study/tuna） */
  scoreDayStreak?: number
  /** 连续「纯打工日」天数（三时段均为 parttime） */
  cashDayStreak?: number
  /** 上次输出路线失衡制度提示的游戏日（用于 2~3 日可见节律） */
  lastConflictNoticeDay?: number
}


// ========================================
// 展示层类型（UI 渲染专用，与数据层类型分离）
// ========================================

/** EventModal 展示用的选项类型（不含 effects 等游戏逻辑字段） */
export interface EventOptionDisplay {
  id: string
  label: string
  tone?: 'normal' | 'danger' | 'primary'
  consequence?: string
}

/** EventModal 展示用的事件载荷类型 */
export interface EventModalPayload {
  title: string
  body: string
  illustration?: string
  options: EventOptionDisplay[]
  mandatory?: boolean
  type?: string
  tier?: 'critical' | 'normal'
  systemSummary?: string
  systemDetails?: string
  defaultOptionId?: string
}

/** LogPanel 展示用的日志条目类型（tone 为必填，与 LogEntry 的可选 tone 区分） */
export interface LogEntryDisplay {
  id: string
  day: number
  title: string
  detail: string
  tone: 'info' | 'warn' | 'danger' | 'ok'
}
