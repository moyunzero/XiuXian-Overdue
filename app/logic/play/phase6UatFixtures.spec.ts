import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildPhase6UatFixtures,
  ghostBoundAfterWeek,
  ghostBoundPlayable,
  ghostBoundTransitionOverlay,
  ghostSummonPending,
  writePhase6UatFixturesToDisk
} from '~/logic/play/phase6UatFixtures'
import { buildWeekSettlementSummary } from '~/logic/play/scheduleMandateFlow'

describe('phase6UatFixtures', () => {
  it('exports playwright seed JSON for Phase 6 ghost dual-ledger UAT', () => {
    const fixtures = buildPhase6UatFixtures()
    expect(fixtures).toHaveLength(4)

    const summon = fixtures.find((f) => f.id === 'phase6-ghost-summon-pending')!
    const summonRun = Object.values(summon.saveV5.runs)[0]
    expect(summonRun.primaryFate).toBe('head_jar')
    expect(summonRun.mandate?.pendingDeliveryIds[0]).toBe('ch0-ghost-bound-summon')

    const overlay = fixtures.find((f) => f.id === 'phase6-ghost-bound-overlay')!
    const overlayRun = Object.values(overlay.saveV5.runs)[0]
    expect(overlayRun.primaryFate).toBe('ghost_bound')
    expect(overlayRun.setpiece?.fateUpdatePending?.to).toBe('ghost_bound')

    const playable = fixtures.find((f) => f.id === 'phase6-ghost-bound-playable')!
    const playableRun = Object.values(playable.saveV5.runs)[0]
    expect(playableRun.primaryFate).toBe('ghost_bound')
    expect(playableRun.setpiece?.fateUpdatePending).toBeUndefined()
    expect(playableRun.ghostLedger?.yangDebtCarried).toBeGreaterThan(0)

    const afterWeekRun = ghostBoundAfterWeek()
    const summary = buildWeekSettlementSummary(afterWeekRun)
    expect(summary.ledgerLines?.yang).toContain('人账')
    expect(summary.ledgerLines?.ming).toContain('鬼账')

    const pending = ghostSummonPending()
    expect(pending.mandate?.pendingDeliveryIds.length).toBeGreaterThan(0)

    const transition = ghostBoundTransitionOverlay()
    expect(transition.setpiece?.fateUpdatePending?.from).toBe('head_jar')

    const ready = ghostBoundPlayable()
    expect(ready.setpiece?.fateUpdatePending).toBeUndefined()

    const outDir = path.join(process.cwd(), 'e2e/fixtures/phase6-uat')
    const files = writePhase6UatFixturesToDisk(outDir)
    expect(files.length).toBe(fixtures.length)
  })
})
