import { describe, expect, it } from 'vitest'
import { settledFateRun } from '~/logic/play/chapterTestHelpers'
import { compoundWeekSettlement } from '~/logic/play/compoundWeekSettlement'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'

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
})
