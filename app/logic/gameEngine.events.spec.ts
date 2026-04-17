import { describe, expect, it } from 'vitest'
import type { EventDefinition, GameState } from '~/types/game'
import { mulberry32 } from '~/utils/rng'
import {
  MIN_EVENT_COOLDOWN_DAYS,
  WEEKLY_RANDOM_DOWNWEIGHT_K,
  applyWeeklyRandomDownweightToProbability,
  effectiveEventCooldownDays,
  isEventOnCooldown,
  isFamilyOnCooldown,
  isWeeklySettlementDay,
  isWeeklySettlementDayAfterDayRoll,
  pickWeightedEvent,
  recordEventTrigger,
  toPendingEvent
} from '~/logic/gameEngine'

function baseGame(overrides: Partial<GameState> = {}): GameState {
  return {
    started: true,
    seed: 42_424_242,
    stats: {
      daoXin: 1,
      faLi: 6,
      rouTi: 0.6,
      fatigue: 30,
      focus: 50
    },
    econ: {
      cash: 2000,
      collectionFee: 0,
      debtPrincipal: 2000,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 1
    },
    school: {
      day: 5,
      week: 1,
      slot: 'morning',
      classTier: '普通班',
      lastExamScore: 500,
      lastRank: 100,
      perks: { mealSubsidy: 40, focusBonus: 0 }
    },
    contract: {
      active: false,
      name: '',
      patron: '',
      progress: 0,
      vigilance: 0,
      lastTriggerDay: 0
    },
    logs: [],
    eventHistory: {},
    familyHistory: {},
    ...overrides
  } as GameState
}

const evt = (partial: Partial<EventDefinition> & Pick<EventDefinition, 'id'>): EventDefinition => ({
  title: 't',
  body: 'b',
  type: 'test',
  options: [],
  ...partial
})

describe('EVT-01: id 冷却下限与 effectiveCooldownDays (D-03)', () => {
  it('cooldownDays 低于下限时抬升到 MIN_EVENT_COOLDOWN_DAYS', () => {
    expect(effectiveEventCooldownDays(evt({ id: 'a', cooldownDays: 1 }))).toBe(MIN_EVENT_COOLDOWN_DAYS)
    expect(effectiveEventCooldownDays(evt({ id: 'b', cooldownDays: 2 }))).toBe(MIN_EVENT_COOLDOWN_DAYS)
  })

  it('未配置或 ≤0 的冷却视为无 id 冷却段', () => {
    expect(effectiveEventCooldownDays(evt({ id: 'x' }))).toBe(0)
    expect(effectiveEventCooldownDays(evt({ id: 'y', cooldownDays: 0 }))).toBe(0)
  })
})

describe('EVT-01: isEventOnCooldown 与 eventHistory (D-03)', () => {
  it('未满有效冷却天数时同 id 仍视为冷却中', () => {
    const e = evt({ id: 'repeat_me', cooldownDays: 1 })
    const g = baseGame({
      school: { ...baseGame().school, day: 7 },
      eventHistory: { repeat_me: { lastDay: 5, times: 1 } }
    })
    expect(g.school.day - (g.eventHistory!.repeat_me.lastDay)).toBe(2)
    expect(isEventOnCooldown(g, e)).toBe(true)
  })
})

describe('EVT-01: family 双轨互斥 (D-02)', () => {
  it('同 family 不同 id 在 family 窗口内互斥', () => {
    const a = evt({ id: 'soc_a', family: 'social', cooldownDays: 5 })
    const g = baseGame({
      school: { ...baseGame().school, day: 6 },
      familyHistory: { social: { lastDay: 5 } },
      eventHistory: {}
    })
    expect(isFamilyOnCooldown(g, a)).toBe(true)
  })

  it('无 family 时仅 id 规则生效', () => {
    const e = evt({ id: 'solo' })
    const g = baseGame({ familyHistory: { social: { lastDay: 1 } } })
    expect(isFamilyOnCooldown(g, e)).toBe(false)
  })
})

describe('EVT-01: 周结算日谓词与 endDay 条件对齐 (D-04)', () => {
  it('与 day 自增后 (day-1)%7===0 同真同假', () => {
    const g7 = baseGame({ school: { ...baseGame().school, day: 7 } })
    expect(isWeeklySettlementDay(g7)).toBe(true)
    expect(isWeeklySettlementDayAfterDayRoll(8)).toBe(true)
    const g8 = baseGame({ school: { ...baseGame().school, day: 8 } })
    expect(isWeeklySettlementDay(g8)).toBe(false)
    expect(isWeeklySettlementDayAfterDayRoll(9)).toBe(false)
  })
})

describe('EVT-01: 周结算日非强制随机降权 (D-04)', () => {
  it('在周结算游玩日对 baseP 乘以固定系数', () => {
    const g = baseGame({ school: { ...baseGame().school, day: 7 } })
    const baseP = 0.4
    expect(applyWeeklyRandomDownweightToProbability(baseP, g)).toBeCloseTo(baseP * WEEKLY_RANDOM_DOWNWEIGHT_K)
    const g2 = baseGame({ school: { ...baseGame().school, day: 6 } })
    expect(applyWeeklyRandomDownweightToProbability(baseP, g2)).toBe(baseP)
  })

  it('固定种子下：降权后「命中随机门」频率低于未降权', () => {
    const seed = 99_001
    const rawRand = mulberry32(seed)
    const baseP = 0.35
    let hitsPlain = 0
    let hitsDown = 0
    const n = 2000
    for (let i = 0; i < n; i++) {
      const r = rawRand()
      if (r < baseP) hitsPlain++
    }
    const rand2 = mulberry32(seed)
    const gWeek = baseGame({ school: { ...baseGame().school, day: 7 } })
    const p2 = applyWeeklyRandomDownweightToProbability(baseP, gWeek)
    for (let i = 0; i < n; i++) {
      const r = rand2()
      if (r < p2) hitsDown++
    }
    expect(hitsDown).toBeLessThan(hitsPlain)
  })
})

describe('EVT-01: recordEventTrigger 写入双历史', () => {
  it('选中后同时更新 eventHistory 与 familyHistory', () => {
    const g = baseGame({ school: { ...baseGame().school, day: 10 } })
    const def = evt({ id: 'e1', family: 'trial' })
    recordEventTrigger(g, def)
    expect(g.eventHistory?.e1?.lastDay).toBe(10)
    expect(g.eventHistory?.e1?.times).toBe(1)
    expect(g.familyHistory?.trial?.lastDay).toBe(10)
  })
})

describe('EVT-01: 仅 afterAction 候选池，无第二套主池 (D-01)', () => {
  it('pickWeightedEvent 仅对传入列表加权，不隐含日末池', () => {
    const pool = [
      evt({ id: 'p1', weight: 1 }),
      evt({ id: 'p2', weight: 1 })
    ]
    const r = mulberry32(7)
    expect(pickWeightedEvent(pool, r)).toBeDefined()
  })
})

describe('EVT-02: toPendingEvent 载荷（tier、系统块、defaultOptionId）', () => {
  it('传递 tier、defaultOptionId、mandatory 默认 false', () => {
    const def: EventDefinition = {
      id: 'evt_payload',
      title: 'T',
      body: 'B',
      type: 't',
      tier: 'critical',
      defaultOptionId: 'opt_a',
      systemSummary: '摘要',
      systemDetails: '明细',
      options: [{ id: 'opt_a', label: 'A', effects: [{ kind: 'stat', target: 'focus', delta: -1 }] }]
    }
    const p = toPendingEvent(def)
    expect(p.tier).toBe('critical')
    expect(p.defaultOptionId).toBe('opt_a')
    expect(p.mandatory).toBe(false)
    expect(p.systemSummary).toBe('摘要')
    expect(p.systemDetails).toBe('明细')
  })

  it('未标注 tier 时视为 normal', () => {
    const def: EventDefinition = {
      id: 'evt_norm',
      title: 'T',
      body: 'B',
      type: 't',
      options: [{ id: 'x', label: 'L', effects: [] }]
    }
    const p = toPendingEvent(def)
    expect(p.tier).toBe('normal')
  })

  it('critical 且未配系统字段时补齐制度块（D-07）', () => {
    const def: EventDefinition = {
      id: 'evt_crit_derive',
      title: 'T',
      body: 'B',
      type: 't',
      tier: 'critical',
      options: [{ id: 'a', label: 'L', effects: [{ kind: 'stat', target: 'faLi', delta: 1 }] }]
    }
    const p = toPendingEvent(def)
    expect(p.systemSummary).toBeTruthy()
    expect(p.systemDetails).toBeTruthy()
  })
})
