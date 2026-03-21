import { EVT03_EVENT_FAMILIES, type EventDefinition, type Evt03EventFamily } from '~/types/game'
import rawEvents from '../../data/events.json'

// 统一在这里做一次类型断言，避免在业务代码中频繁断言
export const ALL_EVENTS = rawEvents as EventDefinition[]

export function getEventsByPhase(phase: EventDefinition['phase'] | undefined) {
  if (!phase) return ALL_EVENTS
  return ALL_EVENTS.filter(event => (event.phase ?? 'afterAction') === phase)
}

/** 按 family 筛选（冷却同族键、EVT-03 内容统计等） */
export function getEventsByFamily(family: string) {
  return ALL_EVENTS.filter((e) => e.family === family)
}

/** PSY-02 D-12：可配置崩溃卡组（与「麻木化时刻」等叙事节点并存，由管线单独调度） */
export function getCollapseEventDeck() {
  return ALL_EVENTS.filter((e) => e.type === 'collapse')
}

/** EVT-03：三类内嵌事件（family ∈ 社交|试功|法赛） */
export function getEvt03Events() {
  const set = new Set<string>(EVT03_EVENT_FAMILIES)
  return ALL_EVENTS.filter((e) => e.family !== undefined && set.has(e.family))
}

export function isEvt03Family(f: string | undefined): f is Evt03EventFamily {
  return f !== undefined && (EVT03_EVENT_FAMILIES as readonly string[]).includes(f)
}

