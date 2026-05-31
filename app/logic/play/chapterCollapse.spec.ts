import { describe, expect, it } from 'vitest'
import {
  applyChapterCollapse,
  CHAPTER_BODY_COLLAPSE_THRESHOLD,
  CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY,
  CHAPTER_BODY_EXHAUSTION_THRESHOLD,
  detectChapterCollapse
} from '~/logic/play/chapterCollapse'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'

describe('chapterCollapse', () => {
  it('bodyIntegrity 低于阈值触发 collapse_body', () => {
    const run = settledChapterRun()
    run.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    const hit = detectChapterCollapse(run)
    expect(hit?.outcomeId).toBe('collapse_body')
    const collapsed = applyChapterCollapse(run)
    expect(collapsed.runStatus).toBe('collapsed')
    expect(collapsed.chapter?.outcomeId).toBe('collapse_body')
  })

  it('delinquency >= 6 触发 collapse_debt', () => {
    const run = settledChapterRun()
    run.econ!.delinquency = 6
    const hit = detectChapterCollapse(run)
    expect(hit?.outcomeId).toBe('collapse_debt')
    expect(hit?.triggerId).toBe('debt_delinquency')
  })

  it('负债远超现金缓冲触发 debt_stress_ratio', () => {
    const run = settledChapterRun()
    run.econ!.delinquency = 3
    run.econ!.cash = 800
    const hit = detectChapterCollapse(run)
    expect(hit?.outcomeId).toBe('collapse_debt')
    expect(hit?.triggerId).toBe('debt_stress_ratio')
  })

  it('逾期叠过劳完整度触发 collapse_body', () => {
    const run = settledChapterRun()
    run.econ!.delinquency = CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY
    run.bodyIntegrity = CHAPTER_BODY_EXHAUSTION_THRESHOLD - 0.01
    const hit = detectChapterCollapse(run)
    expect(hit?.outcomeId).toBe('collapse_body')
    expect(hit?.triggerId).toBe('body_exhaustion')
  })

  it('已 collapsed 不再重复检测', () => {
    const run = settledChapterRun()
    run.runStatus = 'collapsed'
    run.bodyIntegrity = 0.1
    expect(detectChapterCollapse(run)).toBeNull()
  })
})
