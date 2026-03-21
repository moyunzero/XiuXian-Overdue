import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { EventDefinition, GameState, PendingEvent } from '~/types/game'
import { defaultState } from './useGameState'
import { useGame } from './useGame'

const { mockEvents, criticalEvt, normalEvt, defaultEvt, CRITICAL_NARRATIVE } = vi.hoisted(() => {
  const CRITICAL_NARRATIVE = 'NARRATIVE_LONG_UNIQUE_DO_NOT_APPEAR_IN_MAIN_LOG_9931'
  const criticalEvt: EventDefinition = {
    id: 'evt_critical_evt02',
    title: '关键制度事件',
    body: CRITICAL_NARRATIVE,
    type: 'test',
    tier: 'critical',
    systemSummary: '制度性后果将登记',
    systemDetails: '明细：法力-1（示例）',
    defaultOptionId: 'opt_yield',
    options: [
      { id: 'opt_push', label: '硬顶', effects: [{ kind: 'stat', target: 'faLi', delta: 3 }] },
      { id: 'opt_yield', label: '退让', effects: [{ kind: 'stat', target: 'fatigue', delta: 5 }] }
    ]
  }
  const normalEvt: EventDefinition = {
    id: 'evt_normal_evt02',
    title: '普通通知',
    body: 'SHORT_OK',
    type: 'test',
    tier: 'normal',
    defaultOptionId: 'n1',
    options: [{ id: 'n1', label: '知道了', effects: [{ kind: 'stat', target: 'focus', delta: -1 }] }]
  }
  const defaultEvt: EventDefinition = {
    id: 'evt_default_compare',
    title: '默认项对照',
    body: 'BODY_DEFAULT',
    type: 'test',
    defaultOptionId: 'b_passive',
    options: [
      { id: 'b_active', label: '主动', effects: [{ kind: 'stat', target: 'faLi', delta: 10 }] },
      { id: 'b_passive', label: '消极', effects: [{ kind: 'stat', target: 'faLi', delta: 0 }] }
    ]
  }
  return {
    mockEvents: [criticalEvt, normalEvt, defaultEvt],
    criticalEvt,
    normalEvt,
    defaultEvt,
    CRITICAL_NARRATIVE
  }
})

vi.mock('~/utils/events', () => ({
  ALL_EVENTS: mockEvents,
  getEventsByPhase: () => mockEvents
}))

function baseStartedGame(): GameState {
  const g = defaultState()
  g.started = true
  g.school.day = 10
  g.school.slot = 'morning'
  g.stats.faLi = 6
  g.stats.fatigue = 40
  g.stats.focus = 50
  return g
}

describe('EVT-02: tier、主日志制度摘要、defaultOptionId（Wave 0）', () => {
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

  it('critical：resolveEvent 后主日志有一条制度摘要，且不包含事件 definition.body 全文（D-06）', () => {
    const { game, resolveEvent } = useGame()
    game.value = baseStartedGame()
    game.value.pendingEvent = {
      eventId: criticalEvt.id,
      title: criticalEvt.title,
      body: criticalEvt.body,
      tier: 'critical',
      systemSummary: criticalEvt.systemSummary,
      systemDetails: criticalEvt.systemDetails,
      defaultOptionId: criticalEvt.defaultOptionId,
      options: criticalEvt.options.map((o) => ({ id: o.id, label: o.label }))
    } as PendingEvent

    resolveEvent('opt_yield')

    const top = game.value.logs[0]
    expect(top.title).toContain('制度记录')
    expect(top.detail).not.toContain(CRITICAL_NARRATIVE)
    expect(top.detail.length).toBeLessThan(CRITICAL_NARRATIVE.length)
  })

  it('normal：resolveEvent 后主日志仍为冷制度摘要，不含文学正文重复', () => {
    const { game, resolveEvent } = useGame()
    game.value = baseStartedGame()
    game.value.pendingEvent = {
      eventId: normalEvt.id,
      title: normalEvt.title,
      body: 'NORMAL_BODY_UNIQUE_7721',
      tier: 'normal',
      options: normalEvt.options.map((o) => ({ id: o.id, label: o.label }))
    } as PendingEvent

    resolveEvent('n1')
    const top = game.value.logs[0]
    expect(top.title).toContain('制度记录')
    expect(top.detail).not.toContain('NORMAL_BODY_UNIQUE_7721')
  })

  it('defaultOptionId：显式选择与 defaultOptionId 对应选项时，数值结果一致（D-16）', () => {
    const { game, resolveEvent } = useGame()
    const g1 = baseStartedGame()
    const g2 = baseStartedGame()
    const pending: PendingEvent = {
      eventId: defaultEvt.id,
      title: defaultEvt.title,
      body: defaultEvt.body,
      defaultOptionId: 'b_passive',
      options: defaultEvt.options.map((o) => ({ id: o.id, label: o.label }))
    } as PendingEvent
    g1.pendingEvent = { ...pending }
    g2.pendingEvent = { ...pending }
    game.value = g1
    resolveEvent('b_passive')
    const faLi1 = g1.stats.faLi
    game.value = g2
    resolveEvent('b_passive')
    const faLi2 = g2.stats.faLi
    expect(faLi1).toBe(faLi2)
    expect(faLi1).toBe(6)
  })
})
