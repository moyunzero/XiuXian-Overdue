import type { WeekPlan } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import { getFateShell } from '~/logic/play/fateShellRegistry'
import {
  headJarInputToWeekPlan,
  weekPlanToHeadJarInput,
  type HeadJarPlanInput
} from '~/logic/play/headJarWeekPlan'

export type { HeadJarPlanInput }

export type TileIntensity = 0 | 1 | 2 | 3

export const INTENSITY_HOURS: Record<TileIntensity, number> = {
  0: 0,
  1: 8,
  2: 20,
  3: 40
}

export interface TileState {
  repay: WeekPlan['repay']
  study: TileIntensity
  parttime: TileIntensity
  rest: boolean
}

export function cycleIntensity(current: TileIntensity): TileIntensity {
  return ((current + 1) % 4) as TileIntensity
}

export function tilesToWeekPlan(tiles: TileState): WeekPlan {
  if (tiles.rest) {
    return {
      repay: tiles.repay,
      studyHours: 0,
      tunaHours: 0,
      parttimeHours: 0,
      workHours: 0,
      rest: true
    }
  }
  return {
    repay: tiles.repay,
    studyHours: INTENSITY_HOURS[tiles.study],
    tunaHours: 0,
    parttimeHours: INTENSITY_HOURS[tiles.parttime],
    workHours: 0,
    rest: false
  }
}

function hoursToIntensity(hours: number): TileIntensity {
  if (hours <= 0) return 0
  if (hours <= 8) return 1
  if (hours <= 20) return 2
  return 3
}

export function weekPlanToTiles(plan: WeekPlan): TileState {
  return {
    repay: plan.repay,
    study: plan.rest ? 0 : hoursToIntensity(plan.studyHours),
    parttime: plan.rest ? 0 : hoursToIntensity(plan.parttimeHours),
    rest: plan.rest
  }
}

export function planFromScheduleMode(
  run: Pick<PlayRunState, 'primaryFate'>,
  input: TileState | HeadJarPlanInput
): WeekPlan {
  const shell = getFateShell(run)
  if (shell.scheduleMode === 'delegation_two') {
    return headJarInputToWeekPlan(input as HeadJarPlanInput)
  }
  return tilesToWeekPlan(input as TileState)
}

export { weekPlanToHeadJarInput }
