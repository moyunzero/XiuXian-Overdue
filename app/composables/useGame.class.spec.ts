import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { defaultState } from './useGameState'
import { useGame } from './useGame'
import { calculateWeeklyMinPayment, delinquencyPolicy } from '~/logic/gameEngine'

vi.mock('~/utils/events', () => ({
  ALL_EVENTS: [],
  getEventsByPhase: () => []
}))

function setupVueStateStubs() {
  const stateMap = new Map<string, ReturnType<typeof ref>>()

  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
    if (!stateMap.has(key)) stateMap.set(key, ref(init()))
    return stateMap.get(key)
  })

  const localStore = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => localStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStore.set(key, value)
    },
    removeItem: (key: string) => {
      localStore.delete(key)
    }
  })
}

function makeSeededGame(seed = 20260321) {
  const g = defaultState()
  g.started = true
  g.seed = seed
  g.school.day = 1
  g.school.week = 1
  g.school.slot = 'morning'
  g.econ.lastPaymentDay = 1
  g.econ.cash = 3000
  g.econ.debtPrincipal = 9000
  g.econ.debtInterestAccrued = 500
  g.econ.collectionFee = 0
  g.econ.delinquency = 0
  return g
}

function settleToWeeklyBoundary(act: (id: 'rest') => void, gameRef: { value: ReturnType<typeof defaultState> }) {
  gameRef.value.school.day = 7
  gameRef.value.school.slot = 'night'
  act('rest')
}

function setTierProfile(gameRef: { value: ReturnType<typeof defaultState> }, profile: 'demo' | 'normal' | 'bottom') {
  const g = gameRef.value
  if (profile === 'demo') {
    g.stats.daoXin = 5
    g.stats.faLi = 30
    g.stats.rouTi = 4
    g.stats.focus = 95
    g.stats.fatigue = 8
    g.econ.debtPrincipal = 500
    g.econ.debtInterestAccrued = 50
    g.econ.collectionFee = 0
  } else if (profile === 'normal') {
    g.stats.daoXin = 2
    g.stats.faLi = 10
    g.stats.rouTi = 1.4
    g.stats.focus = 55
    g.stats.fatigue = 30
    g.econ.debtPrincipal = 7000
    g.econ.debtInterestAccrued = 800
    g.econ.collectionFee = 200
  } else {
    g.stats.daoXin = 1
    g.stats.faLi = 1
    g.stats.rouTi = 0.2
    g.stats.focus = 10
    g.stats.fatigue = 95
    g.econ.debtPrincipal = 55000
    g.econ.debtInterestAccrued = 4000
    g.econ.collectionFee = 3000
  }
}

describe('CLASS-01/02 Wave 0 分班制度测试', () => {
  beforeEach(() => {
    setupVueStateStubs()
  })

  it('CLASS-02: 仅在每 7 天周结算触发考核分班，非周结算日不触发', () => {
    const { game, act } = useGame()
    game.value = makeSeededGame()
    const beforeScore = game.value.school.lastExamScore

    game.value.school.day = 2
    game.value.school.slot = 'night'
    act('rest')

    expect(game.value.school.day).toBe(3)
    expect(game.value.school.lastExamScore).toBe(beforeScore)
    expect(game.value.school.week).toBe(1)

    settleToWeeklyBoundary(act, game)

    expect(game.value.school.day).toBe(8)
    expect(game.value.school.lastExamScore).toBeGreaterThan(0)
    expect(game.value.school.week).toBe(2)
  })

  it('CLASS-01/D-10: 分班变化会同步更新可追踪字段（classTier/perks/lastExamScore）', () => {
    const { game, act } = useGame()
    game.value = makeSeededGame()
    setTierProfile(game, 'demo')

    settleToWeeklyBoundary(act, game)

    expect(game.value.school.classTier).toBe('示范班')
    expect(game.value.school.perks.mealSubsidy).toBeGreaterThanOrEqual(120)
    expect(game.value.school.perks.focusBonus).toBeGreaterThan(0)
    expect(game.value.school.lastExamScore).toBeGreaterThan(600)
    expect(game.value.logs.some((log) => log.title.includes('周结算通报'))).toBe(true)
  })

  it('D-12: 示范班收益保持封顶，不出现单周滚雪球断层', () => {
    const { game, act } = useGame()

    game.value = makeSeededGame(1001)
    setTierProfile(game, 'normal')
    game.value.school.classTier = '普通班'
    game.value.school.perks = { mealSubsidy: 40, focusBonus: 0 }
    const faLiBeforeNormal = game.value.stats.faLi
    act('study')
    const normalGain = game.value.stats.faLi - faLiBeforeNormal

    game.value = makeSeededGame(1001)
    setTierProfile(game, 'demo')
    game.value.school.classTier = '示范班'
    game.value.school.perks = { mealSubsidy: 160, focusBonus: 10 }
    const faLiBeforeDemo = game.value.stats.faLi
    act('study')
    const demoGain = game.value.stats.faLi - faLiBeforeDemo

    expect(demoGain).toBeGreaterThan(normalGain)
    expect(demoGain / Math.max(0.0001, normalGain)).toBeLessThan(1.35)
  })

  it('D-17~D-19: 末位班周结算后应额外抬升债务风险倍率（超出纯逾期基线）', () => {
    const { game, act, minPayment } = useGame()
    game.value = makeSeededGame(2222)
    setTierProfile(game, 'bottom')
    game.value.econ.delinquency = 2
    game.value.econ.lastPaymentDay = -8

    const beforeRate = game.value.econ.dailyRate
    const policyOnlyRate = Number((beforeRate * delinquencyPolicy(2).rateStepMultiplier).toFixed(4))

    settleToWeeklyBoundary(act, game)

    expect(game.value.school.classTier).toBe('末位班')
    expect(game.value.econ.dailyRate).toBeGreaterThan(policyOnlyRate)
    const policyOnlyMinPayment = calculateWeeklyMinPayment(
      game.value.econ.collectionFee + game.value.econ.debtPrincipal + game.value.econ.debtInterestAccrued,
      game.value.econ.delinquency
    )
    expect(minPayment.value).toBeGreaterThan(policyOnlyMinPayment)
    expect(game.value.logs.some((log) => log.detail.includes('风险倍率'))).toBe(true)
  })
})