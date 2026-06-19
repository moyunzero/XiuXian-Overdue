import { describe, expect, it } from 'vitest'
import {
  applyChapterCollapse,
  CHAPTER_BODY_COLLAPSE_THRESHOLD
} from '~/logic/play/chapterCollapse'
import {
  DEFAULT_WEEK_PLAN,
  markBeatResolvedForWeek
} from '~/logic/play/chapterWeekFlow'
import {
  advanceChapterToWeek,
  dismissCurrentSetpiece,
  settledChapterRun,
  settledFateRun
} from '~/logic/play/chapterTestHelpers'
import { advanceWeek, ensureFateRunMode, resolveWeekEnd } from '~/logic/play/milestoneWeekFlow'
import { deriveStageIdFromRun } from '~/logic/play/playRunFateDefaults'
import { STAGE_M1_CONTRACT, STAGE_M2_HS } from '~/logic/play/stageDefs'
import type { PlayRunState } from '~/types/play'

function advanceFateToWeek(run: PlayRunState, targetWeek: number): PlayRunState {
  let next = ensureFateRunMode(run)
  let steps = 0
  while ((next.chapter?.chapterWeekIndex ?? 0) < targetWeek && steps < 800) {
    steps += 1
    if (next.runStatus === 'collapsed' || next.runStatus === 'archived') break
    next = dismissCurrentSetpiece(next)
    const { run: after, blocked } = advanceWeek(next, DEFAULT_WEEK_PLAN)
    next = blocked ? dismissCurrentSetpiece(after) : after
  }
  return next
}

describe('milestoneWeekFlow', () => {
  it('fate_run W39→W40→W41 不 archived，无 gate-w40-finale，有 continuity log', () => {
    let run = advanceFateToWeek(settledFateRun(), 39)
    expect(run.chapter?.chapterWeekIndex).toBe(39)
    run = dismissCurrentSetpiece(run)

    const to40 = advanceWeek(run, DEFAULT_WEEK_PLAN)
    expect(to40.blocked).toBe(false)
    expect(to40.run.chapter?.chapterWeekIndex).toBe(40)
    expect(to40.run.chapter?.pendingGateId).not.toBe('gate-w40-finale')
    expect(to40.run.runStatus).not.toBe('archived')
    expect(to40.run.runStatus).not.toBe('ended')

    const to41 = advanceWeek(dismissCurrentSetpiece(to40.run), DEFAULT_WEEK_PLAN)
    expect(to41.run.chapter?.chapterWeekIndex).toBe(41)
    expect(to41.run.chapter?.pendingGateId).not.toBe('gate-w40-finale')
    expect(to41.run.runStatus).not.toBe('archived')
    expect(to41.run.runStatus).not.toBe('ended')
    expect(to41.run.logs.some((l) => l.includes('契约账期已满'))).toBe(true)
  })

  it('fate_run body_integrity → fated + mortgaged', () => {
    let run = settledFateRun()
    run.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    run = markBeatResolvedForWeek(run)
    const { run: next } = advanceWeek(run, DEFAULT_WEEK_PLAN)
    expect(next.runStatus).toBe('fated')
    expect(next.primaryFate).toBe('mortgaged')
    expect(next.runStatus).not.toBe('collapsed')
  })

  it('resolveWeekEnd + runMode chapter（不 coerce）仍可 collapsed', () => {
    const run = settledChapterRun()
    run.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    expect(run.runMode).toBe('chapter')
    const ended = resolveWeekEnd(run)
    expect(ended.runStatus).toBe('collapsed')
    expect(applyChapterCollapse(run).runStatus).toBe('collapsed')
  })

  it('week 41 → stage M2 + 制度 log', () => {
    const run = settledFateRun()
    run.chapter!.chapterWeekIndex = 41
    run.stageId = STAGE_M1_CONTRACT.id
    const next = resolveWeekEnd(run)
    expect(next.stageId).toBe(STAGE_M2_HS.id)
    expect(deriveStageIdFromRun(next)).toBe(STAGE_M2_HS.id)
    expect(next.logs.some((l) => l.includes('学籍段切换'))).toBe(true)
  })

  it('compoundWeekSettlement 经 resolveWeekEnd 移除到期 tag', () => {
    const run = settledFateRun()
    run.chapter!.chapterWeekIndex = 10
    run.institutionalTags = [
      { id: 'credit_blacklist', appliedAtWeek: 1, expiryWeek: 10 }
    ]
    const next = resolveWeekEnd(run)
    expect(next.institutionalTags).toHaveLength(0)
  })

  it('ensureFateRunMode 将 active chapter 档 coerce 为 fate_run', () => {
    const run = settledChapterRun()
    expect(run.runMode).toBe('chapter')
    const coerced = ensureFateRunMode(run)
    expect(coerced.runMode).toBe('fate_run')
  })

  it('advanceChapterToWeek 仍可用于 chapter 路径至 W40 终局', () => {
    const run = advanceChapterToWeek(settledChapterRun(), 40, DEFAULT_WEEK_PLAN)
    expect(run.chapter?.chapterWeekIndex).toBe(40)
  })
})
