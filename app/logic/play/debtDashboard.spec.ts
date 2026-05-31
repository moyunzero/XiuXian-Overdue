import { describe, expect, it } from 'vitest'
import { buildDebtDashboardVM } from './debtDashboard'
import { settledChapterRun } from './chapterTestHelpers'
import { tickChapterWeek, DEFAULT_WEEK_PLAN } from './chapterWeekFlow'
import { createPlayRunFromStartConfig } from './createPlayRun'
import { advanceRunToHs } from './createHsPlayState'

describe('buildDebtDashboardVM', () => {
  it('chapter 模式显示周账期文案，不用日倒计时', () => {
    const run = settledChapterRun()
    const vm = buildDebtDashboardVM(run)
    expect(vm?.billingPeriodLabel).toBe('第 1/40 周账期')
    expect(vm?.contractWeeksRemaining).toBe(run.chapter!.weeksRemaining)
    expect(vm?.daysUntilPayment).toBe(6)
  })

  it('chapter 推进周后账期文案随 chapterWeekIndex 更新', () => {
    let run = settledChapterRun()
    run = tickChapterWeek(run, DEFAULT_WEEK_PLAN).run
    const vm = buildDebtDashboardVM(run)
    expect(vm?.billingPeriodLabel).toBe('第 2/40 周账期')
  })

  it('Act1 结转后日志说明逾期档来源', () => {
    const run = settledChapterRun()
    expect(run.econ!.delinquency).toBeGreaterThan(0)
    expect(run.logs.some((l) => l.includes('征信结转'))).toBe(true)
    expect(run.logs.some((l) => l.includes('非契约周欠费'))).toBe(true)
  })

  it('非 chapter 模式无 billingPeriodLabel', () => {
    const run = advanceRunToHs(createPlayRunFromStartConfig(
      {
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 20_000,
        startingCity: '嵩阳市'
      },
      'slot1',
      { runMode: 'endless' }
    ))
    const vm = buildDebtDashboardVM(run)
    expect(vm?.billingPeriodLabel).toBeUndefined()
    expect(vm?.daysUntilPayment).toBeGreaterThanOrEqual(0)
  })
})
