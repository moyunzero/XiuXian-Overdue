// 事件系统类型定义
export interface GameEvent {
  id: string
  title: string
  type: EventType
  trigger: EventTrigger
  body: string
  tone: 'info' | 'warn' | 'danger' | 'ok'
  options: EventOption[]
}

export type EventType =
  | 'collection'      // 催收事件
  | 'teacher_offer'   // 老师推销
  | 'school_event'    // 学校事件
  | 'school_social'   // 学校社交
  | 'classmate'       // 同学关系
  | 'work'            // 打工
  | 'work_special'    // 特殊工作
  | 'health'          // 健康
  | 'exam'            // 考试
  | 'ritual'          // 仪式
  | 'special'         // 特殊
  | 'random'          // 随机

export interface EventTrigger {
  // 债务相关
  delinquency?: number
  debt_total?: number
  
  // 成绩相关
  rank?: string | number
  previous_tier?: string
  
  // 状态相关
  health?: string | number
  fatigue?: string | number
  focus?: string | number
  cash?: string | number
  
  // 行为相关
  action?: string
  drug_refusal_count?: number
  drug_usage?: number
  
  // 时间相关
  day?: number
  day_mod_7?: number
  
  // 条件相关
  teacher_knows?: boolean
  contract_active?: boolean
  first_time?: boolean
  random?: number
  
  // 其他
  [key: string]: any
}

export interface EventOption {
  id: string
  label: string
  cost?: number
  effect: EventEffect
  description: string
}

export interface EventEffect {
  // 经济
  cash?: number
  debt_principal?: number
  debt_interest?: number
  delinquency?: number
  delinquency_grace?: number
  
  // 属性
  daoXin?: number
  faLi?: number
  rouTi?: number
  health?: number
  fatigue?: number
  focus?: number
  stress?: number
  
  // 社交
  teacher_favor?: number
  friendship_bzz?: number
  friendship_zty?: number
  reputation?: number
  
  // 状态
  isolation?: boolean
  collection_level?: number
  tier?: string
  tier_update?: boolean
  
  // 特殊
  contract_active?: boolean
  vigilance?: number
  yushu_active?: boolean
  potential_unlocked?: boolean
  learn_zhoutian?: boolean
  
  // 风险
  injury_risk?: number
  conflict?: boolean
  time_lost?: number
  time_wasted?: boolean
  
  // 其他
  [key: string]: any
}
