import { describe, expect, it } from 'vitest'
import {
  applyHeadJarMaintenanceSettlement,
  buildMaintenanceBillPreview,
  delegationJobCostHint,
  delegationJobToPlanEffects,
  HEAD_JAR_INTEGRITY,
  HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD,
  validateHeadJarPlan
} from '~/logic/play/headJarWeekPlan'
import { settledFateRun } from '~/logic/play/chapterTestHelpers'
import type { WeekPlan } from '~/types/chapter'

describe('headJarWeekPlan', () => {
  it('buildMaintenanceBillPreview rolls min debt service into total (D-66)', () => {
    const run = settledFateRun()
    run.primaryFate = 'head_jar'
    const preview = buildMaintenanceBillPreview(run, 'sustain')
    expect(preview.debtService).toBeGreaterThan(0)
    expect(preview.total).toBe(preview.maintenanceBase + preview.debtService + preview.interest)
    expect(preview.tier).toBe('sustain')
  })

  it('sustain tier costs more than austerity', () => {
    const run = settledFateRun()
    run.primaryFate = 'head_jar'
    const sustain = buildMaintenanceBillPreview(run, 'sustain')
    const austerity = buildMaintenanceBillPreview(run, 'austerity')
    expect(sustain.maintenanceBase).toBeGreaterThan(austerity.maintenanceBase)
    expect(sustain.total).toBeGreaterThan(austerity.total)
  })

  it('validateHeadJarPlan rejects advance when slots missing', () => {
    const run = settledFateRun()
    run.primaryFate = 'head_jar'
    const incomplete: WeekPlan = {
      repay: 'min',
      studyHours: 0,
      tunaHours: 0,
      parttimeHours: 0,
      workHours: 0,
      rest: false
    }
    expect(validateHeadJarPlan(run, incomplete).ok).toBe(false)
    const withTier = { ...incomplete, maintenanceTier: 'sustain' as const }
    expect(validateHeadJarPlan(run, withTier).ok).toBe(false)
    const complete = {
      ...withTier,
      delegationJob: 'yang_patrol' as const
    }
    expect(validateHeadJarPlan(run, complete).ok).toBe(true)
  })

  it('delegationJobToPlanEffects maps three jobs to pressure skew', () => {
    expect(delegationJobToPlanEffects('yang_patrol').workHours).toBe(32)
    expect(delegationJobToPlanEffects('collection_escort').parttimeHours).toBe(8)
    expect(delegationJobToPlanEffects('penalty_register').studyHours).toBe(8)
  })

  it('delegationJobCostHint returns clamped hint strings', () => {
    expect(delegationJobCostHint('yang_patrol')).toMatch(/压力/)
    expect(delegationJobCostHint('collection_escort')).toMatch(/灵石/)
  })

  it('applyHeadJarMaintenanceSettlement deducts cash at weekend only when solvent', () => {
    const run = settledFateRun()
    run.primaryFate = 'head_jar'
    run.econ!.cash = 50_000
    run.lastWeekPlan = {
      repay: 'min',
      studyHours: 0,
      tunaHours: 0,
      parttimeHours: 0,
      workHours: 32,
      rest: false,
      maintenanceTier: 'austerity',
      delegationJob: 'yang_patrol'
    }
    const cashBefore = run.econ!.cash
    const next = applyHeadJarMaintenanceSettlement(run)
    expect(next.econ!.cash).toBeLessThan(cashBefore)
    expect(next.mandate?.maintenanceFailureStreak).toBe(0)
    expect(next.runStatus).not.toBe('collapsed')
  })

  it('applyHeadJarMaintenanceSettlement increments streak when cash insufficient (no collapse)', () => {
    const run = settledFateRun()
    run.primaryFate = 'head_jar'
    run.econ!.cash = 0
    run.lastWeekPlan = {
      repay: 'skip',
      studyHours: 0,
      tunaHours: 0,
      parttimeHours: 0,
      workHours: 32,
      rest: false,
      maintenanceTier: 'sustain',
      delegationJob: 'yang_patrol'
    }
    const next = applyHeadJarMaintenanceSettlement(run)
    expect(next.mandate?.maintenanceFailureStreak).toBe(1)
    expect(next.runStatus).not.toBe('collapsed')
  })

  it('exports HEAD_JAR_INTEGRITY threshold for transition specs', () => {
    expect(HEAD_JAR_INTEGRITY).toBe(0.12)
    expect(HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD).toBe(2)
  })
})
