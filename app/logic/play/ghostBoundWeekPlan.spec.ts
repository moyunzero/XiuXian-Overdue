import { describe, expect, it } from 'vitest'
import {
  buildDualLedgerBillPreview,
  validateDelegationTwoPlan
} from '~/logic/play/ghostBoundWeekPlan'
import { buildHeadJarWeekPlan, settledFateRun } from '~/logic/play/chapterTestHelpers'
import { validateHeadJarPlan } from '~/logic/play/headJarWeekPlan'
import { DEFAULT_WEEK_PLAN } from '~/logic/play/chapterWeekFlow'
import { GHOST_MING_WEEKLY_QUOTA } from '~/logic/play/ghostLedger'

describe('ghostBoundWeekPlan', () => {
  it('ghost_bound delegation_two plan validates', () => {
    const run = settledFateRun()
    run.primaryFate = 'ghost_bound'
    run.runStatus = 'fated'
    const plan = buildHeadJarWeekPlan('austerity', 'yang_patrol')
    expect(validateDelegationTwoPlan(run, plan)).toEqual({ ok: true })
  })

  it('head_jar still validates via validateDelegationTwoPlan', () => {
    const run = settledFateRun()
    run.primaryFate = 'head_jar'
    run.runStatus = 'fated'
    const plan = buildHeadJarWeekPlan('austerity', 'yang_patrol')
    expect(validateDelegationTwoPlan(run, plan)).toEqual({ ok: true })
  })

  it('validateHeadJarPlan delegates and rejects non-head_jar', () => {
    const run = settledFateRun()
    run.primaryFate = 'human'
    const plan = buildHeadJarWeekPlan()
    expect(validateHeadJarPlan(run, plan).ok).toBe(false)
    run.primaryFate = 'head_jar'
    expect(validateHeadJarPlan(run, plan)).toEqual({ ok: true })
  })

  it('four_tile fates reject delegation plan', () => {
    const run = settledFateRun()
    run.primaryFate = 'human'
    expect(validateDelegationTwoPlan(run, DEFAULT_WEEK_PLAN).ok).toBe(false)
  })

  it('buildDualLedgerBillPreview exposes human + ming quota', () => {
    const run = settledFateRun()
    run.primaryFate = 'ghost_bound'
    const preview = buildDualLedgerBillPreview(run, 'austerity')
    expect(preview.humanMaintenance).toBeGreaterThan(0)
    expect(preview.mingQuota).toBe(GHOST_MING_WEEKLY_QUOTA)
  })
})
