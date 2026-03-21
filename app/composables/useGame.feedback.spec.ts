import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { defaultState } from './useGameState'
import { useGame } from './useGame'

vi.mock('~/utils/events', () => ({
  ALL_EVENTS: [],
  getEventsByPhase: () => []
}))

describe('D-05/D-06/D-07 行动反馈规范（叙事优先 + 三项摘要 + 统一日志）', () => {
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

  it('行动反馈应写入主日志，且 detail 包含“叙事 + 摘要”', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true

    const beforeLen = game.value.logs.length
    act('study')

    expect(game.value.logs.length).toBe(beforeLen + 1)
    const latest = game.value.logs[0]
    expect(latest.detail).toContain('摘要：')
    expect(latest.detail).toContain('｜')
  })

  it('摘要默认仅三项核心变化（D-06: 三项摘要）', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true

    act('parttime')

    const latest = game.value.logs[0]
    const summary = latest.detail.split('摘要：')[1] || ''
    const itemCount = summary
      .split('｜')
      .map((item) => item.trim())
      .filter(Boolean)
      .length
    expect(itemCount).toBe(3)
  })

  it('反馈全部汇入日志，不生成并行反馈容器（D-07: 统一日志）', () => {
    const { game, act } = useGame()
    game.value = defaultState()
    game.value.started = true

    act('tuna')
    act('buy')
    act('rest')

    const latestThree = game.value.logs.slice(0, 3)
    expect(latestThree.every(log => typeof log.detail === 'string' && log.detail.length > 0)).toBe(true)
    expect((game.value as unknown as { actionFeedbackQueue?: unknown[] }).actionFeedbackQueue).toBeUndefined()
  })
})
