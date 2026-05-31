import { describe, expect, it } from 'vitest'
import { DEFAULT_WEEK_PLAN } from '~/logic/play/chapterWeekFlow'
import {
  applyChapterBodyDecay,
  CHAPTER_BODY_DECAY_BASE,
  weekBodyDecayAmount
} from '~/logic/play/chapterBodyDecay'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'

describe('chapterBodyDecay', () => {
  it('chapter 模式每周有基础衰减', () => {
    const run = settledChapterRun()
    expect(weekBodyDecayAmount(run, DEFAULT_WEEK_PLAN)).toBeGreaterThanOrEqual(
      CHAPTER_BODY_DECAY_BASE
    )
  })

  it('断供链与过劳加速衰减', () => {
    const run = settledChapterRun()
    run.mandate!.supplyCutStreak = 2
    const heavy = weekBodyDecayAmount(run, {
      ...DEFAULT_WEEK_PLAN,
      parttimeHours: 24,
      workHours: 40,
      rest: false
    })
    const baseline = weekBodyDecayAmount(run, {
      ...DEFAULT_WEEK_PLAN,
      parttimeHours: 0,
      workHours: 0,
      rest: false
    })
    expect(heavy).toBeGreaterThan(baseline)
  })

  it('逾期档位叠加身体衰减', () => {
    const run = settledChapterRun()
    run.econ!.delinquency = 4
    const withDel = weekBodyDecayAmount(run, DEFAULT_WEEK_PLAN)
    run.econ!.delinquency = 0
    const baseline = weekBodyDecayAmount(run, DEFAULT_WEEK_PLAN)
    expect(withDel).toBeGreaterThan(baseline)
  })

  it('applyChapterBodyDecay 降低 bodyIntegrity 并写日志', () => {
    const run = settledChapterRun()
    const before = run.bodyIntegrity ?? 1
    const next = applyChapterBodyDecay(run, DEFAULT_WEEK_PLAN)
    expect(next.bodyIntegrity).toBeLessThan(before)
    expect(next.logs.some((l) => l.includes('身体完整度'))).toBe(true)
  })
})
