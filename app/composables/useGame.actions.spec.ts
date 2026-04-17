import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { defaultState } from './useGameState'
import { useGame } from './useGame'

vi.mock('~/utils/events', () => ({
  ALL_EVENTS: [],
  getEventsByPhase: () => []
}))

describe('ACT-01~ACT-05 行为矩阵', () => {
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

  it('ACT-01: 修炼（tuna/train）应提升成长并伴随疲劳/风险代价', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true
    game.value.school.day = 31
    game.value.econ.lastPaymentDay = 31
    game.value.bodyPartRepayment = {
      LeftPalm: true,
      RightPalm: true,
      LeftArm: true,
      RightArm: true,
      LeftLeg: true,
      RightLeg: true
    }
    game.value.stats.fatigue = 80

    const faLiBefore = game.value.stats.faLi
    const rouTiBefore = game.value.stats.rouTi
    const fatigueBefore = game.value.stats.fatigue

    act('tuna')
    act('train')

    expect(game.value.stats.faLi).toBeGreaterThan(faLiBefore)
    expect(game.value.stats.rouTi).toBeGreaterThan(rouTiBefore)
    expect(game.value.stats.fatigue).toBeGreaterThanOrEqual(fatigueBefore)
  })

  it('ACT-02: 上课刷分应提升考试相关能力并影响周考结果', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true
    game.value.school.day = 35
    game.value.school.slot = 'night'

    const faLiBefore = game.value.stats.faLi
    const scoreBefore = game.value.school.lastExamScore

    act('study')

    expect(game.value.stats.faLi).toBeGreaterThan(faLiBefore)
    expect(game.value.school.day).toBe(36)
    expect(game.value.school.lastExamScore).not.toBe(scoreBefore)
  })

  it('ACT-03: 打工增加 cash，且后续 repay 可消耗该现金', () => {
    const { game, act, repay } = useGame()
    game.value = defaultState()
    game.value.started = true
    game.value.school.day = 31
    game.value.econ.cash = 0
    game.value.econ.collectionFee = 600
    game.value.econ.debtInterestAccrued = 400
    game.value.econ.debtPrincipal = 2_000

    act('parttime')
    const cashAfterParttime = game.value.econ.cash
    repay(cashAfterParttime)

    expect(cashAfterParttime).toBeGreaterThan(0)
    expect(game.value.econ.cash).toBe(0)
    expect(game.value.econ.collectionFee + game.value.econ.debtInterestAccrued + game.value.econ.debtPrincipal).toBeLessThan(3_000)
  })

  it('ACT-04: 休息恢复状态；契约激活时可触发反噬事件', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true
    game.value.seed = 0
    game.value.school.day = 31
    game.value.stats.fatigue = 75
    game.value.stats.focus = 20
    game.value.contract.active = true

    const fatigueBefore = game.value.stats.fatigue
    const focusBefore = game.value.stats.focus
    act('rest')

    expect(game.value.pendingEvent?.title).toContain('反噬')
    expect(game.value.stats.fatigue).toBe(fatigueBefore)
    expect(game.value.stats.focus).toBe(focusBefore)
  })

  it('ACT-05: 买补给带来短期恢复，同时 buyDebasement 增长', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true
    game.value.school.day = 31
    game.value.econ.cash = 1_000
    game.value.stats.fatigue = 50
    game.value.stats.focus = 40

    const focusBefore = game.value.stats.focus
    const debaseBefore = game.value.buyDebasement ?? 0
    const cashBefore = game.value.econ.cash

    act('buy')

    expect(game.value.stats.focus).toBeGreaterThan(focusBefore)
    expect(game.value.buyDebasement).toBeGreaterThan(debaseBefore)
    expect(game.value.econ.cash).toBeLessThan(cashBefore)
  })

  it('ACT-06: 开局后保持 debt > cash，避免出现可一次性还清窗口', () => {
    const { game, startNew } = useGame()
    startNew({
      playerName: '测试',
      background: '富户',
      talent: '天灵根',
      initialDebt: 5_000,
      startingCity: '天枢城'
    })

    const totalDebt =
      game.value.econ.coreDebt +
      game.value.econ.collectionFee +
      game.value.econ.debtInterestAccrued +
      game.value.econ.debtPrincipal
    expect(totalDebt).toBeGreaterThan(game.value.econ.cash)
  })
})

describe('D-13~D-16 首周压力基线', () => {
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

  it('D-13/D-14: 第3-4天出现首次明显惩罚（由行动驱动）', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true

    for (let i = 0; i < 9; i += 1) {
      act('train')
    }

    expect(game.value.school.day).toBe(4)
    expect(game.value.stats.fatigue).toBeGreaterThanOrEqual(70)
  })

  it('D-15/D-16: 首周恶性随机事件占比低于行动驱动失败', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true

    for (let i = 0; i < 15; i += 1) {
      act(i % 2 === 0 ? 'train' : 'parttime')
    }

    const randomBad = game.value.logs.filter((log) => log.title.includes('事件') && log.tone === 'danger').length
    const actionDrivenBad = (game.value.stats.fatigue >= 80 || game.value.econ.delinquency >= 1) ? 1 : 0

    expect(actionDrivenBad).toBeGreaterThan(0)
    expect(randomBad).toBeLessThanOrEqual(actionDrivenBad)
  })
})
