import type { EventDefinition } from '~/types/game'
import rawEvents from '../../data/events.json'

// 统一在这里做一次类型断言，避免在业务代码中频繁断言
export const ALL_EVENTS = rawEvents as EventDefinition[]

export function getEventsByPhase(phase: EventDefinition['phase'] | undefined) {
  if (!phase) return ALL_EVENTS
  return ALL_EVENTS.filter(event => (event.phase ?? 'afterAction') === phase)
}

