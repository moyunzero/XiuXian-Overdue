import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { defaultState } from './useGameState'
import { useGame } from './useGame'
import * as Engine from '~/logic/gameEngine'

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
  g.econ.cash = 4000
  g.econ.debtPrincipal = 4000
  g.econ.debtInterestAccrued = 200
  g.econ.collectionFee = 0
  g.econ.delinquency = 0
  g.daySlotActions = {}
  g.scoreDayStreak = 0
  g.cashDayStreak = 0
  return g
}

/** 完成一个游戏日的三个时段并触发 endDay */
function runDay(
  act: (id: import('~/types/game').ActionId) => void,
  a1: import('~/types/game').ActionId,
  a2: import('~/types/game').ActionId,
  a3: import('~/types/game').ActionId
) {
  act(a1)
  act(a2)
  act(a3)
}

describe('CLASS-03 刷分 vs 打工冲突（D-13~D-16）', () => {
  beforeEach(() => {
    setupVueStateStubs()
  })

  it('D-13：连续纯刷分日达到 2 天后，系统进入偏科失衡态（边际递减可用）', () => {
    const { game, act } = useGame()
    game.value = makeSeededGame()
    runDay(act, 'study', 'study', 'tuna')
    runDay(act, 'study', 'study', 'study')
    expect(game.value.scoreDayStreak).toBeGreaterThanOrEqual(2)
    expect(Engine.studyGainImbalanceMultiplier(game.value)).toBeLessThan(1)
  })

  it('D-14：失衡后上课收益存在边际递减（相对无偏科基准）', () => {
    const { game, act } = useGame()
    game.value = makeSeededGame(91021)
    const g0 = game.value
    g0.scoreDayStreak = 0
    g0.cashDayStreak = 0
    const baseMul = Engine.studyGainImbalanceMultiplier(g0)
    expect(baseMul).toBe(1)
    g0.scoreDayStreak = 3
    const stressed = Engine.studyGainImbalanceMultiplier(g0)
    expect(stressed).toBeLessThan(baseMul)
  })

  it('D-15：日志只提示失衡与参数调整，不出现策略指引用语', () => {
    const { game, act } = useGame()
    game.value = makeSeededGame()
    runDay(act, 'study', 'study', 'tuna')
    runDay(act, 'study', 'tuna', 'study')
    const detail = game.value.logs.map((l) => `${l.title}${l.detail}`).join('\n')
    expect(detail.includes('不提供策略建议') || detail.includes('不形成建议')).toBe(true)
    expect(detail.includes('最优')).toBe(false)
  })

  it('D-16：连续偏科刷分时更可能出现现金链费用压力（费用池上升可观测）', () => {
    const { game, act } = useGame()
    game.value = makeSeededGame(777001)
    runDay(act, 'study', 'study', 'tuna')
    runDay(act, 'study', 'study', 'study')
    const feeBefore = game.value.econ.collectionFee
    let bumped = false
    for (let s = 0; s < 30; s++) {
      act('study')
      if (game.value.econ.collectionFee > feeBefore) {
        bumped = true
        break
      }
      act('tuna')
      act('tuna')
    }
    expect(bumped).toBe(true)
  })

  it('交替策略：混用路线会清零连续偏科 streak', () => {
    const { game, act } = useGame()
    game.value = makeSeededGame()
    runDay(act, 'study', 'study', 'tuna')
    expect(game.value.scoreDayStreak).toBe(1)
    runDay(act, 'parttime', 'study', 'tuna')
    expect(game.value.scoreDayStreak).toBe(0)
    expect(game.value.cashDayStreak).toBe(0)
  })

  it('无限天：偏科压力下仍可继续推进日程（无硬结束）', () => {
    const { game, act } = useGame()
    game.value = makeSeededGame()
    for (let d = 0; d < 4; d++) {
      runDay(act, 'study', 'tuna', 'study')
    }
    expect(game.value.started).toBe(true)
    expect(game.value.school.day).toBeGreaterThan(3)
  })
})
