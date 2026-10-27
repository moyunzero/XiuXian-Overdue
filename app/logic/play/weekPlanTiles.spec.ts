import { describe, expect, it } from 'vitest'
import { settledFateRun } from '~/logic/play/chapterTestHelpers'
import { getFateShell } from '~/logic/play/fateShellRegistry'
import {
  cycleIntensity,
  INTENSITY_HOURS,
  planFromScheduleMode,
  tilesToWeekPlan,
  weekPlanToHeadJarInput,
  weekPlanToTiles,
  type HeadJarPlanInput
} from '~/logic/play/weekPlanTiles'

describe('weekPlanTiles', () => {
  it('rest clears hour fields', () => {
    const plan = tilesToWeekPlan({
      repay: 'min',
      study: 3,
      parttime: 2,
      rest: true
    })
    expect(plan.rest).toBe(true)
    expect(plan.studyHours).toBe(0)
    expect(plan.parttimeHours).toBe(0)
    expect(plan.tunaHours).toBe(0)
    expect(plan.workHours).toBe(0)
  })

  it('maps intensity tiers to hours', () => {
    const plan = tilesToWeekPlan({
      repay: 'partial',
      study: 2,
      parttime: 1,
      rest: false
    })
    expect(plan.studyHours).toBe(INTENSITY_HOURS[2])
    expect(plan.parttimeHours).toBe(INTENSITY_HOURS[1])
    expect(plan.tunaHours).toBe(0)
    expect(plan.workHours).toBe(0)
  })

  it('weekPlanToTiles round-trips clamped hours', () => {
    const tiles = weekPlanToTiles({
      repay: 'skip',
      studyHours: 20,
      tunaHours: 0,
      parttimeHours: 8,
      workHours: 0,
      rest: false
    })
    expect(tiles.study).toBe(2)
    expect(tiles.parttime).toBe(1)
    expect(tiles.repay).toBe('skip')
  })

  it('cycleIntensity wraps 0→3→0', () => {
    expect(cycleIntensity(0)).toBe(1)
    expect(cycleIntensity(3)).toBe(0)
  })

  it('planFromScheduleMode on human run delegates to tilesToWeekPlan unchanged', () => {
    const tiles = {
      repay: 'min' as const,
      study: 2 as const,
      parttime: 1 as const,
      rest: false
    }
    const run = settledFateRun()
    expect(planFromScheduleMode(run, tiles)).toEqual(tilesToWeekPlan(tiles))
  })

  it('planFromScheduleMode on head_jar maps maintenanceTier + delegationJob', () => {
    const input: HeadJarPlanInput = {
      maintenanceTier: 'sustain',
      delegationJob: 'yang_patrol'
    }
    const plan = planFromScheduleMode({ primaryFate: 'head_jar' }, input)
    expect(plan.maintenanceTier).toBe('sustain')
    expect(plan.delegationJob).toBe('yang_patrol')
    expect(plan.studyHours).toBe(0)
    expect(plan.parttimeHours).toBe(0)
    expect(plan.rest).toBe(false)
    expect(plan.workHours).toBe(32)
  })

  it('delegation job affects hours in head_jar plan', () => {
    const escort = planFromScheduleMode(
      { primaryFate: 'head_jar' },
      { maintenanceTier: 'austerity', delegationJob: 'collection_escort' }
    )
    expect(escort.parttimeHours).toBe(8)
    expect(escort.workHours).toBe(28)
    const register = planFromScheduleMode(
      { primaryFate: 'head_jar' },
      { maintenanceTier: 'austerity', delegationJob: 'penalty_register' }
    )
    expect(register.studyHours).toBe(8)
    expect(register.workHours).toBe(24)
  })

  it('weekPlanToHeadJarInput inverts for repeatLast prefill', () => {
    const plan = planFromScheduleMode(
      { primaryFate: 'head_jar' },
      { maintenanceTier: 'austerity', delegationJob: 'penalty_register' }
    )
    expect(weekPlanToHeadJarInput(plan)).toEqual({
      maintenanceTier: 'austerity',
      delegationJob: 'penalty_register'
    })
  })

  it('getFateShell delegation_two routes through head_jar mapper', () => {
    const shell = getFateShell({ primaryFate: 'head_jar' })
    expect(shell.scheduleMode).toBe('delegation_two')
    const plan = planFromScheduleMode(
      { primaryFate: 'head_jar' },
      { maintenanceTier: 'sustain', delegationJob: 'yang_patrol' }
    )
    expect(plan.delegationJob).toBe('yang_patrol')
    expect(plan.maintenanceTier).toBe('sustain')
  })
})
