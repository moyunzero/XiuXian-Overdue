import { describe, expect, it } from 'vitest'
import {
  buildGhostBoundWeekPlan,
  injectGhostBoundChain,
  settledFateRun,
  simGhostBoundWeek
} from '~/logic/play/chapterTestHelpers'
import { buildAntiPatternLines, minPaymentForRun } from '~/logic/play/debtDashboard'
import { exportMetaFateSeenFromTransition } from '~/logic/play/fateTransition'
import { getFateShell } from '~/logic/play/fateShellRegistry'
import { isPlayableRunStatus } from '~/logic/play/playRunFateDefaults'
import { emptyMetaProgress, mergeFatesFromRun, recordFateSeen } from '~/logic/play/metaProgress'
import {
  advanceScheduleWeek,
  buildWeekSettlementSummary,
  respondMandateAndMaybeFinalize
} from '~/logic/play/scheduleMandateFlow'

describe('ghostBoundFlow', () => {
  it('mandate chain reaches ghost_bound and dual ledger fields initialized', () => {
    let run = settledFateRun()
    run = injectGhostBoundChain(run)

    run = respondMandateAndMaybeFinalize(run, 'ack-summons')
    run = respondMandateAndMaybeFinalize(run, 'accept-bind')

    expect(run.primaryFate).toBe('ghost_bound')
    expect(run.ghostLedger?.yangDebtCarried).toBeGreaterThan(0)
    expect(run.ghostLedger?.mingCoin).toBeGreaterThan(0)
    expect(run.setpiece?.fateUpdatePending).toEqual({
      from: 'head_jar',
      to: 'ghost_bound',
      trigger: 'ghost_bind'
    })
    expect(run.logs.some((l) => l.includes('阳债'))).toBe(true)
  })

  it('ghost_bound delegation_two week advances without validate block', () => {
    let run = settledFateRun()
    run = injectGhostBoundChain(run)
    run = respondMandateAndMaybeFinalize(run, 'ack-summons')
    run = respondMandateAndMaybeFinalize(run, 'accept-bind')

    const plan = buildGhostBoundWeekPlan('austerity', 'yang_patrol')
    const shell = getFateShell(run)
    expect(shell.scheduleMode).toBe('delegation_two')

    run = simGhostBoundWeek(run, plan)
    expect(run.chapter?.chapterWeekIndex).toBeGreaterThan(1)
    expect(run.logs.some((l) => l.includes('阳债'))).toBe(true)
    expect(run.logs.some((l) => l.includes('冥币'))).toBe(true)

    const { blocked } = advanceScheduleWeek(run, plan)
    expect(blocked).not.toBe(true)
  })

  it('recordFateSeen idempotent for ghost_bound', () => {
    let meta = emptyMetaProgress()
    meta = recordFateSeen(meta, 'ghost_bound')
    const len = meta.unlockedFatesSeen?.length ?? 0
    meta = recordFateSeen(meta, 'ghost_bound')
    expect(meta.unlockedFatesSeen?.length).toBe(len)

    const run = settledFateRun()
    run.primaryFate = 'ghost_bound'
    run.runStatus = 'fated'
    meta = mergeFatesFromRun(meta, run)
    expect(meta.unlockedFatesSeen).toContain('ghost_bound')
  })

  it('run continues fated not collapsed', () => {
    let run = settledFateRun()
    run = injectGhostBoundChain(run)
    run = respondMandateAndMaybeFinalize(run, 'ack-summons')
    run = respondMandateAndMaybeFinalize(run, 'accept-bind')
    run = simGhostBoundWeek(run, buildGhostBoundWeekPlan())

    expect(run.runStatus).toBe('fated')
    expect(isPlayableRunStatus(run.runStatus)).toBe(true)
    expect(run.runStatus).not.toBe('collapsed')
  })

  it('exportMetaFateSeenFromTransition returns ghost_bound after mandate transition', () => {
    let run = settledFateRun()
    const prevFate = run.primaryFate
    run = injectGhostBoundChain(run)
    run = respondMandateAndMaybeFinalize(run, 'ack-summons')
    run = respondMandateAndMaybeFinalize(run, 'accept-bind')
    expect(exportMetaFateSeenFromTransition(run, prevFate)).toBe('ghost_bound')
  })

  it('LOOP-06 buildWeekSettlementSummary pairs 人账/鬼账 and headline numbers match run fields', () => {
    let run = settledFateRun()
    run = injectGhostBoundChain(run)
    run = respondMandateAndMaybeFinalize(run, 'ack-summons')
    run = respondMandateAndMaybeFinalize(run, 'accept-bind')
    run = simGhostBoundWeek(run, buildGhostBoundWeekPlan())

    const delinquency = run.econ?.delinquency ?? 0
    const anti = buildAntiPatternLines(run)
    const summary = buildWeekSettlementSummary(run)

    expect(summary.headline).toBe(anti.headline)
    if (delinquency >= 2) {
      expect(summary.headline).toContain(String(delinquency))
      expect(summary.headline).toContain(minPaymentForRun(run).toLocaleString())
    }

    expect(run.ghostLedger).toBeDefined()
    expect(summary.ledgerLines?.yang).toContain('人账')
    expect(summary.ledgerLines?.ming).toContain('鬼账')
    expect(summary.ledgerLines?.yang).toContain(
      run.ghostLedger!.yangDebtCarried.toLocaleString()
    )
    expect(summary.ledgerLines?.ming).toContain(String(run.ghostLedger!.mingCoin))

    const streak = run.ghostLedger?.mingUnderpayStreak ?? 0
    if (streak >= 1) {
      expect(summary.details.some((d) => d.includes(String(streak)))).toBe(true)
    }
  })
})
