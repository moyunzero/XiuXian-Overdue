import type { GameState } from '~/types/game'
import {
  rollCalendarDay,
  finalizeDayRouteStreak,
  applyNarrativeDelays,
  applyWeeklyExam,
  applyDelinquencyCheck,
  __test__dayCycle
} from '~/logic/gameDayCycle'

export {
  finalizeDayRouteStreak,
  applyNarrativeDelays,
  applyWeeklyExam,
  applyDelinquencyCheck,
  __test__dayCycle
}

export function endDay(
  g: GameState,
  minPayment: number,
  applyWeeklyCollectionFeeFn: (g: GameState) => number
): void {
  rollCalendarDay(g, minPayment, applyWeeklyCollectionFeeFn, {})
}
