import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { defaultState } from './useGameState'
import { __test__, useGame } from './useGame'

vi.mock('~/utils/events', () => ({
  ALL_EVENTS: [],
  getEventsByPhase: () => []
}))

function seedPlayableDebtState() {
  const g = defaultState()
  g.started = true
  g.bodyPartRepayment = {
    LeftPalm: true,
    RightPalm: true,
    LeftArm: true,
    RightArm: true,
    LeftLeg: true,
    RightLeg: true
  }
  g.econ.cash = 40_000
  g.econ.collectionFee = 400
  g.econ.debtInterestAccrued = 800
  g.econ.debtPrincipal = 12_000
  g.econ.lastPaymentDay = 0
  g.school.day = 1
  g.school.slot = 'morning'
  return g
}

function advanceDaysByNightRest(days: number, act: (id: 'rest') => void, gameRef: { value: ReturnType<typeof defaultState> }) {
  for (let i = 0; i < days; i += 1) {
    gameRef.value.school.slot = 'night'
    act('rest')
  }
}

describe('DEBT-01~DEBT-03 Wave 0 回归', () => {
  beforeEach(() => {
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
  })

  it('D-01/DEBT-01: 还款按利息->罚金->本金固定顺序结算，且结果可断言', () => {
    const g = seedPlayableDebtState()
    const r = __test__.applyRepaymentByPriority(g, 1_000)

    expect(r.interestPaid).toBe(800)
    expect(r.feePaid).toBe(200)
    expect(r.principalPaid).toBe(0)
    expect(r.totalPaid).toBe(1_000)
    expect(g.econ.collectionFee).toBe(200)
    expect(g.econ.debtPrincipal).toBe(12_000)
  })

  it('D-03/DEBT-02: 首次逾期仅警告缓冲，不立即上浮利率', () => {
    const { game, act } = useGame()
    game.value = seedPlayableDebtState()
    const baseRate = game.value.econ.dailyRate

    advanceDaysByNightRest(14, act, game)

    expect(game.value.econ.delinquency).toBe(1)
    expect(game.value.econ.dailyRate).toBe(baseRate)
    expect(game.value.logs.some((log) => log.title.includes('逾期警告'))).toBe(true)
  })

  it('D-01/D-02/DEBT-02: 逾期仅按每周节律升级，且上限锁定为 5 级', () => {
    const { game, act } = useGame()
    game.value = seedPlayableDebtState()

    advanceDaysByNightRest(84, act, game)

    expect(game.value.econ.delinquency).toBe(5)
  })

  it('D-04/DEBT-03: 达到高逾期后仍可继续 act/endDay（无硬失败）', () => {
    const { game, act } = useGame()
    game.value = seedPlayableDebtState()
    game.value.econ.delinquency = 5
    game.value.school.day = 50
    game.value.school.slot = 'night'

    act('rest')

    expect(game.value.school.day).toBe(51)
    expect(game.value.school.slot).toBe('morning')
    expect(game.value.started).toBe(true)
  })

  it('D-06/D-08/DEBT-01: 还款日志需记录分项与制度化说明（单通道日志）', () => {
    const { game, repay } = useGame()
    game.value = seedPlayableDebtState()
    game.value.econ.cash = 10_000

    repay(2_500)

    const top = game.value.logs[0]
    expect(top.title).toBe('还款')
    expect(top.detail).toContain('费用¥')
    expect(top.detail).toContain('利息¥')
    expect(top.detail).toContain('本金¥')
    expect(top.detail).toContain('剩余债务')
  })
})