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

export interface PendingEvent {
  title: string
  body: string
  options: Array<{
    id: string
    label: string
    tone?: 'normal' | 'danger' | 'primary'
  }>
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
  pendingEvent?: PendingEvent
}

