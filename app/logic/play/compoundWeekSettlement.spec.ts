import { describe, expect, it } from 'vitest'
import { DEFAULT_WEEK_PLAN } from '~/logic/play/chapterWeekFlow'
import { settledFateRun } from '~/logic/play/chapterTestHelpers'
import { compoundWeekSettlement } from '~/logic/play/compoundWeekSettlement'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { initGhostLedgerOnTransition } from '~/logic/play/ghostLedger'

describe('compoundWeekSettlement', () => {
  it('到期 institutional tag 在周末结算时移除', () => {
    const run = settledFateRun()
    run.chapter!.chapterWeekIndex = 10
    run.institutionalTags = [
      { id: 'credit_blacklist', appliedAtWeek: 1, expiryWeek: 10 },
      { id: 'supply_cut', appliedAtWeek: 2, expiryWeek: 12 }
    ]
    const next = compoundWeekSettlement(run)
    expect(next.institutionalTags.map((t) => t.id)).toEqual(['supply_cut'])
  })

  it('debt>0 时 append 账期复利 stub log', () => {
    const run = settledFateRun()
    expect(fullDebtFromRun(run)).toBeGreaterThan(0)
    const next = compoundWeekSettlement(run)
    expect(next.logs.some((l) => l.includes('账期复利已滚动'))).toBe(true)
  })

  it('supplyCutStreak≥2 时写入 supply_cut institutional tag', () => {
    const run = settledFateRun()
    run.mandate = {
      numbness: 0,
      domestication: 0,
      pendingDeliveryIds: [],
      supplyCutStreak: 2
    }
    const next = compoundWeekSettlement(run)
    expect(next.institutionalTags.map((t) => t.id)).toContain('supply_cut')
  })

  it('head_jar 周末结算调用维生扣款 stub', () => {
    const run = settledFateRun()
    run.primaryFate = 'head_jar'
    run.econ!.cash = 50_000
    run.lastWeekPlan = {
      ...DEFAULT_WEEK_PLAN,
      maintenanceTier: 'sustain',
      delegationJob: 'yang_patrol'
    }
    const cashBefore = run.econ!.cash
    const next = compoundWeekSettlement(run)
    expect(next.logs.some((l) => l.includes('维生账单入账'))).toBe(true)
    expect(next.econ!.cash).toBeLessThan(cashBefore)
  })

  it('ghost_bound with ghostLedger appends 阳债 and 冥币 logs without touching econ.cash', () => {
    let run = settledFateRun()
    run.primaryFate = 'ghost_bound'
    run.runStatus = 'fated'
    run = initGhostLedgerOnTransition(run)
    run.lastWeekPlan = {
      ...DEFAULT_WEEK_PLAN,
      maintenanceTier: 'austerity',
      delegationJob: 'yang_patrol'
    }
    const cashBefore = run.econ!.cash
    const next = compoundWeekSettlement(run)
    expect(next.logs.some((l) => l.includes('阳债'))).toBe(true)
    expect(next.logs.some((l) => l.includes('冥币'))).toBe(true)
    expect(next.econ!.cash).toBe(cashBefore)
    expect(next.logs.some((l) => l.includes('维生账单入账'))).toBe(false)
  })

  it('ghost_bound without ledger does not crash', () => {
    const run = settledFateRun()
    run.primaryFate = 'ghost_bound'
    run.runStatus = 'fated'
    expect(() => compoundWeekSettlement(run)).not.toThrow()
  })
})
