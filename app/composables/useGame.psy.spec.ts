import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { EventDefinition, GameState, PendingEvent } from '~/types/game'
import { defaultState } from './useGameState'
import { useGame } from './useGame'

const { collapseEvt, mockEvents } = vi.hoisted(() => {
  const collapseEvt: EventDefinition = {
    id: 'psy_collapse_spec',
    title: '单测崩溃',
    body: 'body',
    type: 'collapse',
    family: '精神崩溃',
    phase: 'afterAction',
    weight: 10,
    options: [
      {
        id: 'collapse_ack',
        label: '承受',
        effects: [{ kind: 'stat', target: 'focus', delta: -3 }]
      }
    ]
  }
  const normal: EventDefinition = {
    id: 'psy_pool_fill',
    title: '池填充',
    body: 'b',
    type: 'test',
    phase: 'afterAction',
    weight: 50,
    options: [{ id: 'ok', label: 'ok', effects: [] }]
  }
  return { collapseEvt, mockEvents: [collapseEvt, normal] }
})

vi.mock('~/utils/events', () => ({
  ALL_EVENTS: mockEvents,
  getEventsByPhase: () => mockEvents
}))

function started(): GameState {
  const g = defaultState()
  g.started = true
  g.school.day = 12
  g.school.week = 2
  g.school.slot = 'morning'
  g.contract.active = true
  g.contract.progress = 60
  g.nextStrongCollapseEarliestDay = 1
  g.stats.focus = 50
  return g
}

describe('PSY-02: useGame 管线（collapse resolve / 修正）', () => {
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

  it('resolveEvent：collapse 事件走制度摘要分支并更新 focus', () => {
    const { game, resolveEvent } = useGame()
    const g = started()
    g.pendingEvent = {
      eventId: collapseEvt.id,
      title: collapseEvt.title,
      body: collapseEvt.body,
      tier: 'critical',
      systemSummary: '制度摘要',
      systemDetails: '明细',
      options: collapseEvt.options.map((o) => ({ id: o.id, label: o.label }))
    } as PendingEvent
    game.value = g
    const before = g.stats.focus
    resolveEvent('collapse_ack')
    expect(game.value.pendingEvent).toBeUndefined()
    expect(game.value.stats.focus).toBe(before - 3)
  })
})
