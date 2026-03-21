import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { defaultState } from './useGameState'
import { useGame } from './useGame'

vi.mock('~/utils/events', () => ({
  ALL_EVENTS: [],
  getEventsByPhase: () => []
}))

describe('LOOP 时间循环闭环', () => {
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

  it('LOOP-01: 从 day=1 连续执行 90 次动作后，day 到达 30 且 slot 回到 morning', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true
    game.value.bodyPartRepayment = {
      LeftPalm: true,
      RightPalm: true,
      LeftArm: true,
      RightArm: true,
      LeftLeg: true,
      RightLeg: true
    }

    for (let i = 0; i < 90; i += 1) {
      act('rest')
    }

    expect(game.value.school.day).toBe(30)
    expect(game.value.school.slot).toBe('morning')
  })

  it('LOOP-02: 同一时段行动后必须推进到下一时段，且不会同时段重复记账', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true

    const beforeSlot = game.value.school.slot
    const beforeLogs = game.value.logs.length

    act('study')

    expect(beforeSlot).toBe('morning')
    expect(game.value.school.slot).toBe('afternoon')
    expect(game.value.logs.length).toBe(beforeLogs + 1)
  })

  it('LOOP-03: 在第三时段执行动作后自动 endDay，day+1 且 slot=morning（第三时段自动换日）', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true
    game.value.school.slot = 'night'
    game.value.school.day = 5

    act('tuna')

    expect(game.value.school.day).toBe(6)
    expect(game.value.school.slot).toBe('morning')
  })
})
