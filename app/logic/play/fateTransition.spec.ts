import { describe, expect, it } from 'vitest'
import {
  applyChapterCollapse,
  CHAPTER_BODY_COLLAPSE_THRESHOLD,
  CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY,
  CHAPTER_BODY_EXHAUSTION_THRESHOLD,
  detectChapterCollapse
} from '~/logic/play/chapterCollapse'
import { applyFateTransition, detectFateTransition } from '~/logic/play/fateTransition'
import { settledChapterRun, settledFateRun } from '~/logic/play/chapterTestHelpers'

function tagIds(run: ReturnType<typeof settledFateRun>) {
  return run.institutionalTags.map((t) => t.id)
}

describe('fateTransition', () => {
  it('fate_run + body_integrity → mortgaged, fated, log 追加', () => {
    const run = settledFateRun()
    run.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    expect(detectFateTransition(run)?.triggerId).toBe('body_integrity')
    const next = applyFateTransition(run)
    expect(next.runStatus).toBe('fated')
    expect(next.primaryFate).toBe('mortgaged')
    expect(next.chapter?.outcomeId).toBeUndefined()
    expect(next.logs.length).toBeGreaterThan(run.logs.length)
  })

  it('fate_run + body_exhaustion → mortgaged, fated', () => {
    const run = settledFateRun()
    run.econ!.delinquency = CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY
    run.bodyIntegrity = CHAPTER_BODY_EXHAUSTION_THRESHOLD - 0.01
    const next = applyFateTransition(run)
    expect(next.runStatus).toBe('fated')
    expect(next.primaryFate).toBe('mortgaged')
  })

  it('fate_run + debt_delinquency → human + blacklist + supply_cut, fated', () => {
    const run = settledFateRun()
    run.econ!.delinquency = 6
    const next = applyFateTransition(run)
    expect(next.runStatus).toBe('fated')
    expect(next.primaryFate).toBe('human')
    expect(tagIds(next)).toEqual(expect.arrayContaining(['credit_blacklist', 'supply_cut']))
  })

  it('fate_run + debt_stress_ratio → human + credit_blacklist, fated', () => {
    const run = settledFateRun()
    run.econ!.delinquency = 3
    run.econ!.cash = 800
    const next = applyFateTransition(run)
    expect(next.runStatus).toBe('fated')
    expect(next.primaryFate).toBe('human')
    expect(tagIds(next)).toContain('credit_blacklist')
    expect(tagIds(next)).not.toContain('supply_cut')
  })

  it('fate_run + review_gate outcome → human + exam_probation, fated', () => {
    const run = settledFateRun()
    run.chapter!.outcomeId = 'collapse_review'
    const next = applyFateTransition(run)
    expect(next.runStatus).toBe('fated')
    expect(next.primaryFate).toBe('human')
    expect(tagIds(next)).toContain('exam_probation')
  })

  it('chapter run 同条件仍走 collapse，fateTransition no-op', () => {
    const run = settledChapterRun()
    run.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    expect(detectFateTransition(run)).toBeNull()
    expect(applyFateTransition(run)).toEqual(run)
    const collapsed = applyChapterCollapse(run)
    expect(collapsed.runStatus).toBe('collapsed')
    expect(collapsed.chapter?.outcomeId).toBe('collapse_body')
    expect(detectChapterCollapse(run)).not.toBeNull()
  })

  it('已 fated 不重复 transition', () => {
    const run = settledFateRun()
    run.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    const once = applyFateTransition(run)
    expect(once.runStatus).toBe('fated')
    const logsAfterFirst = once.logs.length
    const twice = applyFateTransition(once)
    expect(twice).toEqual(once)
    expect(detectFateTransition(once)).toBeNull()
    expect(twice.logs.length).toBe(logsAfterFirst)
  })

  it('run ended/archived 不 transition', () => {
    const base = settledFateRun()
    base.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    const ended = { ...base, runStatus: 'ended' as const }
    const archived = { ...base, runStatus: 'archived' as const }
    expect(detectFateTransition(ended)).toBeNull()
    expect(detectFateTransition(archived)).toBeNull()
    expect(applyFateTransition(ended)).toEqual(ended)
    expect(applyFateTransition(archived)).toEqual(archived)
  })
})
