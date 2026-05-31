import { describe, expect, it } from 'vitest'
import type { StartConfig } from '~/types/game'
import { NUMBNESS_MUTE_THRESHOLD } from '~/logic/play/mandatePsy'
import {
  applyChapterWeekPlanEffects,
  CHAPTER_REST_FOCUS_RECOVER_NUMBED
} from '~/logic/play/chapterWeekPlanEffects'
import { DEFAULT_WEEK_PLAN, tickChapterWeek } from '~/logic/play/chapterWeekFlow'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'

const start: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 20_000,
  startingCity: '嵩阳市'
}

describe('chapterWeekPlanEffects', () => {
  it('刷题小时提升道心与法力', () => {
    const run = settledChapterRun(start)
    const dao0 = run.stats!.daoXin
    const fa0 = run.stats!.faLi
    const next = applyChapterWeekPlanEffects(run, {
      ...DEFAULT_WEEK_PLAN,
      studyHours: 20,
      tunaHours: 0
    })
    expect(next.stats!.daoXin).toBeGreaterThan(dao0)
    expect(next.stats!.faLi).toBeGreaterThan(fa0)
    expect(next.stats!.fatigue).toBeGreaterThan(run.stats!.fatigue)
  })

  it('吐纳小时提升法力且不受 bodyIntegrity 惩罚', () => {
    const run = settledChapterRun(start)
    run.bodyIntegrity = 0.35
    const lowBody = applyChapterWeekPlanEffects(run, {
      ...DEFAULT_WEEK_PLAN,
      studyHours: 0,
      tunaHours: 20
    })
    const highBody = applyChapterWeekPlanEffects(
      { ...run, bodyIntegrity: 1 },
      { ...DEFAULT_WEEK_PLAN, studyHours: 0, tunaHours: 20 }
    )
    expect(lowBody.stats!.faLi).toBe(highBody.stats!.faLi)
    expect(lowBody.stats!.faLi).toBeGreaterThan(run.stats!.faLi)
  })

  it('休息周降低疲劳；高麻木时专注几乎不涨', () => {
    const run = settledChapterRun(start)
    run.stats!.fatigue = 70
    run.stats!.focus = 20
    run.mandate = {
      numbness: NUMBNESS_MUTE_THRESHOLD,
      domestication: 0,
      pendingDeliveryIds: [],
      supplyCutStreak: 0
    }
    const next = applyChapterWeekPlanEffects(run, { ...DEFAULT_WEEK_PLAN, rest: true })
    expect(next.stats!.fatigue).toBeLessThan(70)
    expect(next.stats!.focus).toBe(20 + CHAPTER_REST_FOCUS_RECOVER_NUMBED)
  })

  it('tickChapterWeek 集成：刷题后道心上升', () => {
    const run = settledChapterRun(start)
    const dao0 = run.stats!.daoXin
    const { run: next } = tickChapterWeek(run, {
      ...DEFAULT_WEEK_PLAN,
      repay: 'skip',
      studyHours: 16,
      tunaHours: 0
    })
    expect(next.stats!.daoXin).toBeGreaterThan(dao0)
  })
})
