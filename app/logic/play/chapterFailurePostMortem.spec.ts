import { describe, expect, it } from 'vitest'
import {
  analyzeChapterCollapse,
  applyChapterCollapse,
  CHAPTER_BODY_COLLAPSE_THRESHOLD,
  CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY,
  CHAPTER_BODY_EXHAUSTION_THRESHOLD,
  CHAPTER_DEBT_DELINQUENCY_COLLAPSE,
  CHAPTER_DEBT_STRESS_RATIO
} from '~/logic/play/chapterCollapse'
import {
  buildChapterFailurePostMortem,
  chapterCollapseEpilogue
} from '~/logic/play/chapterFailurePostMortem'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'
import { buildChapterFinaleArchive } from '~/logic/play/buildRunArchive'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'

describe('chapterFailurePostMortem', () => {
  it('debt_delinquency：逾期档触线触发复盘', () => {
    let run = settledChapterRun()
    run.econ!.delinquency = CHAPTER_DEBT_DELINQUENCY_COLLAPSE
    run = applyChapterCollapse(run)
    const pm = buildChapterFailurePostMortem(run)

    expect(pm?.triggerId).toBe('debt_delinquency')
    expect(pm?.headline).toContain(`逾期档 ${CHAPTER_DEBT_DELINQUENCY_COLLAPSE}`)
    expect(pm?.ruleLine).toContain(String(CHAPTER_DEBT_DELINQUENCY_COLLAPSE))
    expect(pm?.progressHint).toContain('收束线')
    expect(pm?.timeline.length).toBeGreaterThanOrEqual(2)
    expect(chapterCollapseEpilogue('debt_delinquency')[0]).toContain('收束线')
    expect(chapterCollapseEpilogue('debt_delinquency')[0]).not.toContain('触顶')
  })

  it('debt_stress_ratio：负债远超现金缓冲触发复盘', () => {
    let run = settledChapterRun()
    run.chapter!.chapterWeekIndex = 14
    run.econ!.delinquency = 3
    run.econ!.cash = 1000
    const debt = fullDebtFromRun(run)
    expect(debt).toBeGreaterThanOrEqual(run.econ!.cash * CHAPTER_DEBT_STRESS_RATIO)
    run = applyChapterCollapse(run)

    expect(analyzeChapterCollapse(run)?.triggerId).toBe('debt_stress_ratio')
    const pm = buildChapterFailurePostMortem(run)
    expect(pm?.triggerId).toBe('debt_stress_ratio')
    expect(pm?.headline).toContain('现金缓冲')
    expect(pm?.ruleLine).toContain('不可续贷')
    expect(pm?.progressHint).toContain('收束线')
    expect(chapterCollapseEpilogue('debt_stress_ratio')[1]).toContain('缓冲耗尽')
  })

  it('body_integrity：完整度跌破底线', () => {
    let run = settledChapterRun()
    run.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    run = applyChapterCollapse(run)
    const pm = buildChapterFailurePostMortem(run)

    expect(pm?.triggerId).toBe('body_integrity')
    expect(pm?.headline).toContain('完整度')
    expect(pm?.nearMiss).toContain('完整度')
  })

  it('body_exhaustion：逾期叠过劳双轨清盘', () => {
    let run = settledChapterRun()
    run.econ!.delinquency = CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY
    run.bodyIntegrity = CHAPTER_BODY_EXHAUSTION_THRESHOLD - 0.01
    run = applyChapterCollapse(run)
    const pm = buildChapterFailurePostMortem(run)

    expect(pm?.triggerId).toBe('body_exhaustion')
    expect(pm?.headline).toContain('双轨清盘')
    expect(pm?.ruleLine).toContain('双轨清盘')
  })

  it('review_gate：审查崩盘 outcome', () => {
    let run = settledChapterRun()
    run.runStatus = 'collapsed'
    run.chapter!.outcomeId = 'collapse_review'
    run.chapter!.pendingGateId = 'gate-w16-foundation'
    const pm = buildChapterFailurePostMortem(run)

    expect(pm?.triggerId).toBe('review_gate')
    expect(pm?.headline).toContain('审判关')
    expect(chapterCollapseEpilogue('review_gate')[0]).toContain('审判关')
  })

  it('断供链写入时间线', () => {
    let run = settledChapterRun()
    run.mandate!.supplyCutStreak = 2
    run.econ!.delinquency = 3
    run.econ!.cash = 500
    run = applyChapterCollapse(run)
    const pm = buildChapterFailurePostMortem(run)

    expect(pm?.timeline.some((l) => l.includes('断供'))).toBe(true)
  })

  it('buildChapterFinaleArchive 挂载 failurePostMortem 与 collapseReason', () => {
    let run = settledChapterRun()
    run.econ!.delinquency = 6
    run = applyChapterCollapse(run)
    const act1 = run.act1 ?? createInitialAct1State(run.start)
    const archive = buildChapterFinaleArchive({
      run,
      act1,
      startConfig: run.start,
      metaUnlocks: [],
      permanentModifiers: {}
    })

    expect(archive.failurePostMortem?.triggerId).toBe('debt_delinquency')
    expect(archive.collapseReason).toBe(archive.failurePostMortem?.headline)
    expect(archive.epilogue[0]).not.toContain('触顶')
    expect(archive.epilogue[0]).toContain('收束线')
  })
})
