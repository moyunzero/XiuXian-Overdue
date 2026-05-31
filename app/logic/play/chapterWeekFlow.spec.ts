import { describe, expect, it } from 'vitest'
import type { StartConfig } from '~/types/game'
import {
  DEFAULT_WEEK_PLAN,
  tickChapterWeek,
  isWeekActionAllowed,
  clampWeekPlanToSegment
} from '~/logic/play/chapterWeekFlow'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { settledChapterRun, advanceChapterToWeek } from '~/logic/play/chapterTestHelpers'

const start: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 20_000,
  startingCity: '嵩阳市'
}

describe('chapterWeekFlow · WeekPlan economics', () => {
  it('零工小时增加现金', () => {
    const run = settledChapterRun(start)
    const cash0 = run.econ!.cash
    const { run: next } = tickChapterWeek(run, {
      ...DEFAULT_WEEK_PLAN,
      repay: 'skip',
      parttimeHours: 10
    })
    expect(next.econ!.cash).toBe(cash0 + 10 * 40)
  })

  it('extra 还款比 min 还款多减负债', () => {
    const run = settledChapterRun(start)
    run.econ!.cash = 50_000

    const { run: minRun } = tickChapterWeek(run, {
      ...DEFAULT_WEEK_PLAN,
      repay: 'min',
      parttimeHours: 0
    })
    const run2 = settledChapterRun(start)
    run2.econ!.cash = 50_000
    const { run: extraRun } = tickChapterWeek(run2, {
      ...DEFAULT_WEEK_PLAN,
      repay: 'extra',
      parttimeHours: 0
    })

    expect(fullDebtFromRun(extraRun)).toBeLessThan(fullDebtFromRun(minRun))
    expect(extraRun.econ!.cash).toBeLessThan(minRun.econ!.cash)
  })

  it('休息周不计零工收入', () => {
    const run = settledChapterRun(start)
    const cash0 = run.econ!.cash
    const { run: next } = tickChapterWeek(run, {
      ...DEFAULT_WEEK_PLAN,
      repay: 'skip',
      rest: true,
      parttimeHours: 12
    })
    expect(next.econ!.cash).toBe(cash0)
  })

  it('确认计划后写入 lastWeekPlan', () => {
    const run = settledChapterRun(start)
    const plan = { ...DEFAULT_WEEK_PLAN, parttimeHours: 6, repay: 'partial' as const }
    const { run: next } = tickChapterWeek(run, plan)
    expect(next.lastWeekPlan?.parttimeHours).toBe(6)
    expect(next.lastWeekPlan?.repay).toBe('partial')
  })
})

describe('chapterWeekFlow · 断供反噬', () => {
  it('skip 还款未达 minPay 时 supplyCutStreak +1', () => {
    const run = settledChapterRun(start)
    const { run: next } = tickChapterWeek(run, { ...DEFAULT_WEEK_PLAN, repay: 'skip' })
    expect(next.mandate?.supplyCutStreak).toBe(1)
    expect(next.logs.some((l) => l.includes('断供计数'))).toBe(true)
  })

  it('连续两周 skip 第二周 delinquency +1', () => {
    let run = settledChapterRun(start)
    run = tickChapterWeek(run, { ...DEFAULT_WEEK_PLAN, repay: 'skip' }).run
    const del0 = run.econ!.delinquency
    run = tickChapterWeek(run, { ...DEFAULT_WEEK_PLAN, repay: 'skip' }).run
    expect(run.mandate?.supplyCutStreak).toBe(2)
    expect(run.econ!.delinquency).toBe(del0 + 1)
  })

  it('达 minPay 后重置 supplyCutStreak', () => {
    let run = settledChapterRun(start)
    run = tickChapterWeek(run, { ...DEFAULT_WEEK_PLAN, repay: 'skip' }).run
    expect(run.mandate?.supplyCutStreak).toBe(1)
    run.econ!.cash = 100_000
    run = tickChapterWeek(run, { ...DEFAULT_WEEK_PLAN, repay: 'min' }).run
    expect(run.mandate?.supplyCutStreak).toBe(0)
  })

  it('tick 后 bodyIntegrity 有衰减', () => {
    const run = settledChapterRun(start)
    const before = run.bodyIntegrity ?? 1
    const { run: next } = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(next.bodyIntegrity).toBeLessThan(before)
  })
})

describe('chapterWeekFlow · 段内 allowedActions', () => {
  it('职场段禁止刷题', () => {
    const run = advanceChapterToWeek(settledChapterRun(start), 30)
    expect(isWeekActionAllowed(run, 'study')).toBe(false)
    expect(isWeekActionAllowed(run, 'tuna')).toBe(true)
  })

  it('clampWeekPlanToSegment 清除职场段 studyHours', () => {
    const run = advanceChapterToWeek(settledChapterRun(start), 30)
    const clamped = clampWeekPlanToSegment(run, { ...DEFAULT_WEEK_PLAN, studyHours: 12 })
    expect(clamped.studyHours).toBe(0)
  })

  it('tickChapterWeek 忽略职场段刷题小时', () => {
    const run = advanceChapterToWeek(settledChapterRun(start), 30)
    const dao0 = run.stats?.daoXin ?? 0
    const { run: next } = tickChapterWeek(run, { ...DEFAULT_WEEK_PLAN, studyHours: 20, repay: 'skip' })
    expect(next.stats?.daoXin ?? 0).toBe(dao0)
  })
})
