import { describe, expect, it } from 'vitest'
import {
  applyChapterCollapse,
  CHAPTER_BODY_COLLAPSE_THRESHOLD,
  CHAPTER_BODY_EXHAUSTION_MIN_DELINQUENCY,
  CHAPTER_BODY_EXHAUSTION_THRESHOLD,
  detectChapterCollapse
} from '~/logic/play/chapterCollapse'
import { applyBodyMortgageToRun } from '~/logic/play/bodyMortgage'
import { applyFateTransition, detectFateTransition, exportMetaFateSeenFromTransition } from '~/logic/play/fateTransition'
import {
  HEAD_JAR_INTEGRITY,
  HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD
} from '~/logic/play/headJarWeekPlan'
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

  it('mortgaged fated + integrity below HEAD_JAR → head_jar with fateUpdatePending (D-84)', () => {
    const run = settledFateRun()
    run.runStatus = 'fated'
    run.primaryFate = 'mortgaged'
    run.bodyIntegrity = HEAD_JAR_INTEGRITY - 0.01
    expect(detectFateTransition(run)).not.toBeNull()
    const next = applyFateTransition(run)
    expect(next.primaryFate).toBe('head_jar')
    expect(next.setpiece?.fateUpdatePending).toEqual({
      from: 'mortgaged',
      to: 'head_jar',
      trigger: 'integrity_threshold'
    })
    expect(next.runStatus).toBe('fated')
  })

  it('mortgaged fated + maintenanceFailureStreak≥2 → head_jar', () => {
    const run = settledFateRun()
    run.runStatus = 'fated'
    run.primaryFate = 'mortgaged'
    run.bodyIntegrity = 0.4
    run.mandate = {
      ...(run.mandate ?? {
        numbness: 0,
        domestication: 0,
        pendingDeliveryIds: [],
        supplyCutStreak: 0
      }),
      maintenanceFailureStreak: HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD
    }
    const next = applyFateTransition(run)
    expect(next.primaryFate).toBe('head_jar')
    expect(next.setpiece?.fateUpdatePending?.trigger).toBe('maintenance_failure')
  })

  it('mortgaged→head_jar does not repeat when fateUpdatePending already set', () => {
    const run = settledFateRun()
    run.runStatus = 'fated'
    run.primaryFate = 'mortgaged'
    run.bodyIntegrity = HEAD_JAR_INTEGRITY - 0.01
    const once = applyFateTransition(run)
    const twice = applyFateTransition(once)
    expect(twice.primaryFate).toBe('head_jar')
    expect(twice).toEqual(once)
  })

  it('bodyMortgage on fate_run + human sets mortgaged fated without collapse (D-81–D-82)', () => {
    const run = settledFateRun()
    expect(run.primaryFate).toBe('human')
    const next = applyBodyMortgageToRun(run, 'LeftPalm')
    expect(next.runStatus).toBe('fated')
    expect(next.primaryFate).toBe('mortgaged')
    expect(next.runStatus).not.toBe('collapsed')
    expect(next.setpiece?.fateUpdatePending).toEqual({
      from: 'human',
      to: 'mortgaged',
      trigger: 'body_mortgage'
    })
    expect(next.logs.some((l) => l.includes('抵押登记完成'))).toBe(true)
  })

  it('bodyMortgage on chapter run does not set fate fields', () => {
    const run = settledChapterRun()
    const next = applyBodyMortgageToRun(run, 'LeftPalm')
    expect(next.runStatus).toBe('active')
    expect(next.primaryFate).toBe('human')
    expect(next.setpiece?.fateUpdatePending).toBeUndefined()
  })

  it('exportMetaFateSeenFromTransition returns fate when primaryFate changes', () => {
    const run = settledFateRun()
    run.primaryFate = 'ghost_bound'
    expect(exportMetaFateSeenFromTransition(run, 'head_jar')).toBe('ghost_bound')
    expect(exportMetaFateSeenFromTransition(run, 'ghost_bound')).toBeUndefined()
  })

  it('applyFateTransition ensures ghostLedger init for ghost_bound fated run', () => {
    const run = settledFateRun()
    run.runStatus = 'fated'
    run.primaryFate = 'ghost_bound'
    expect(run.ghostLedger).toBeUndefined()
    const next = applyFateTransition(run)
    expect(next.ghostLedger?.yangDebtCarried).toBeGreaterThan(0)
  })
})
