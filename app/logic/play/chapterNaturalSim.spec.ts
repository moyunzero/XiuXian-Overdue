import { describe, expect, it } from 'vitest'
import {
  runChapterSimBatch,
  simulateChapterRun,
  simulateNaturalToW40
} from '~/logic/play/chapterNaturalSim'
import { applyTrackChoice } from '~/logic/play/workFlow'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'
import { getMandateDef } from '~/logic/play/mandateRegistry'

describe('chapterNaturalSim · V4-8', () => {
  it('natural 固定路径可跑满 40 周并 fulfilled', () => {
    const run = simulateNaturalToW40('company')
    expect(run.chapter?.chapterWeekIndex).toBeGreaterThanOrEqual(40)
    expect(run.chapter?.outcomeId).toBe('fulfilled')
    expect(run.runStatus).not.toBe('collapsed')
  })

  it('natural 批次无 active 悬停（500 局 Monte Carlo）', () => {
    const natural = runChapterSimBatch(500, 'natural')
    expect(natural.outcomeCounts.active ?? 0).toBe(0)
    expect(natural.fulfilledRate).toBeGreaterThan(0.5)
  })

  it('V4-8 natural 500 局崩盘率 5%～20%', () => {
    const natural = runChapterSimBatch(500, 'natural')
    expect(natural.collapseRate).toBeGreaterThanOrEqual(0.05)
    expect(natural.collapseRate).toBeLessThanOrEqual(0.2)
  })

  it('V4-8 natural 崩盘原因至少 2 类', () => {
    const natural = runChapterSimBatch(500, 'natural')
    expect(Object.keys(natural.collapseReasons).length).toBeGreaterThanOrEqual(2)
  })

  it('reckless 批次崩盘率高于 natural（Monte Carlo）', () => {
    const natural = runChapterSimBatch(80, 'natural')
    const reckless = runChapterSimBatch(80, 'reckless')
    expect(reckless.collapseRate).toBeGreaterThan(natural.collapseRate)
    expect(natural.fulfilledRate).toBeGreaterThan(0.5)
    expect(reckless.collapseRate).toBeLessThanOrEqual(0.95)
  })

  it('startup 轨择轨后带 track-startup 标签，来文可投递', () => {
    let run = settledChapterRun()
    run = {
      ...run,
      lifeStage: 'work',
      chapter: { ...run.chapter!, pendingGateId: 'gate-w29-track' },
      work: { ...run.work!, employmentTrack: null, jobId: null }
    }
    run = applyTrackChoice(run, 'startup')
    expect(run.profileTags).toContain('track-startup')
    expect(getMandateDef('ch0-startup-subsidy-audit')).toBeDefined()
    expect(getMandateDef('ch0-startup-affiliate-breach')).toBeDefined()
  })

  it('单 seed reckless 可记录 outcome', () => {
    const r = simulateChapterRun(42, 'reckless', 'company')
    expect(r.finalWeek).toBeGreaterThan(0)
    expect(typeof r.collapsed).toBe('boolean')
  })
})
