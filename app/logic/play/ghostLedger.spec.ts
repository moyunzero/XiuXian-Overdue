import { describe, expect, it } from 'vitest'
import {
  buildDualLedgerSettlementLogs,
  GHOST_MING_WEEKLY_QUOTA,
  initGhostLedgerOnTransition,
  tickGhostLedgerWeek
} from '~/logic/play/ghostLedger'
import { settledFateRun } from '~/logic/play/chapterTestHelpers'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'

describe('ghostLedger', () => {
  it('init snapshots fullDebtFromRun into yangDebtCarried', () => {
    const run = settledFateRun()
    const debt = fullDebtFromRun(run)
    expect(debt).toBeGreaterThan(0)
    const next = initGhostLedgerOnTransition(run)
    expect(next.ghostLedger?.yangDebtCarried).toBe(debt)
    expect(next.ghostLedger?.mingCoin).toBe(GHOST_MING_WEEKLY_QUOTA)
  })

  it('tick increases yangDebtCarried with interest stub', () => {
    let run = settledFateRun()
    run.primaryFate = 'ghost_bound'
    run = initGhostLedgerOnTransition(run)
    const before = run.ghostLedger!.yangDebtCarried
    const { run: after, logs } = tickGhostLedgerWeek(run)
    expect(after.ghostLedger!.yangDebtCarried).toBeGreaterThan(before)
    expect(logs.some((l) => l.includes('阳债'))).toBe(true)
  })

  it('non-ghost fate is no-op for tick', () => {
    const run = settledFateRun()
    expect(run.primaryFate).toBe('human')
    const { run: after, logs } = tickGhostLedgerWeek(run)
    expect(after.ghostLedger).toBeUndefined()
    expect(logs).toEqual([])
  })

  it('init is idempotent', () => {
    let run = settledFateRun()
    run.primaryFate = 'ghost_bound'
    run = initGhostLedgerOnTransition(run)
    const ledger = run.ghostLedger!
    const again = initGhostLedgerOnTransition({ ...run, ghostLedger: { ...ledger, mingCoin: 99 } })
    expect(again.ghostLedger).toEqual({ ...ledger, mingCoin: 99 })
  })

  it('buildDualLedgerSettlementLogs contains 阳债 and 冥币', () => {
    let run = settledFateRun()
    run.primaryFate = 'ghost_bound'
    run = initGhostLedgerOnTransition(run)
    const lines = buildDualLedgerSettlementLogs(run)
    expect(lines.some((l) => l.includes('阳债'))).toBe(true)
    expect(lines.some((l) => l.includes('冥币'))).toBe(true)
  })
})
