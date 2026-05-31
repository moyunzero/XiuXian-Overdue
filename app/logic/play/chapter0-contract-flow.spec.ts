import { describe, expect, it } from 'vitest'
import type { StartConfig } from '~/types/game'
import { tickChapterWeek, DEFAULT_WEEK_PLAN, markBeatResolvedForWeek } from '~/logic/play/chapterWeekFlow'
import { dismissExamBoss } from '~/logic/play/examBoss'
import { resolvePlayScreen } from '~/logic/play/resolvePlayScreen'
import { openSegmentGate } from '~/logic/play/segmentGate'
import { needsJobChoice, needsTrackChoice } from '~/logic/play/workFlow'
import {
  settledChapterRun,
  advanceChapterToWeek,
  dismissCurrentSetpiece
} from '~/logic/play/chapterTestHelpers'
import { drainPendingMandates } from '~/logic/play/mandateDelivery'

const start: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 20_000,
  startingCity: '嵩阳市'
}

function settledHsRun(familyOutcome: 'left' | 'cutoff' = 'left') {
  return settledChapterRun(start, familyOutcome)
}

describe('chapter0-contract-flow', () => {
  it('Act1 结算后 initChapter 进入第 1 周 week-dashboard', () => {
    const ready = settledHsRun()
    expect(ready.runMode).toBe('chapter')
    expect(ready.chapter?.chapterWeekIndex).toBe(1)
    expect(ready.chapter?.weekBudget).toBe(40)
    expect(ready.lifeStage).toBe('hs')
    expect(ready.school?.week).toBe(1)
    expect(resolvePlayScreen(ready)).toBe('week-dashboard')
  })

  it('第 4 周 tick 触发月考屏（配置 beat，非硬编码 week）', () => {
    let run = settledHsRun()
    for (let w = 1; w < 4; w++) {
      const { run: next, blocked } = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
      expect(blocked).toBe(false)
      run = drainPendingMandates(next)
    }
    expect(run.chapter?.chapterWeekIndex).toBe(4)
    const { run: afterPlan, blocked } = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(blocked).toBe(true)
    expect(afterPlan.setpiece?.examBossPending).toBeTruthy()
    const pending = afterPlan.setpiece!.examBossPending!
    expect(pending.score).toBeGreaterThan(0)
    expect(pending.week).toBe(4)
    expect(pending.rank).toBeGreaterThan(0)
    expect(pending.perkSummary.length).toBeGreaterThan(0)
    expect(resolvePlayScreen(afterPlan)).toBe('exam-boss')
  })

  it('月考确认后可继续推进周次', () => {
    let run = settledHsRun()
    for (let w = 1; w < 4; w++) {
      run = drainPendingMandates(tickChapterWeek(run, DEFAULT_WEEK_PLAN).run)
    }
    run = tickChapterWeek(run, DEFAULT_WEEK_PLAN).run
    run = markBeatResolvedForWeek(dismissExamBoss(run))
    const { run: next, blocked } = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(blocked).toBe(false)
    expect(next.chapter?.chapterWeekIndex).toBe(5)
  })

  it('家庭线 left 标签保留在 profileTags', () => {
    const run = settledHsRun('left')
    expect(run.profileTags.length).toBeGreaterThan(0)
  })

  it('W40 闸门可写入 fulfilled 结局', () => {
    let run = settledHsRun()
    run = {
      ...run,
      chapter: { ...run.chapter!, chapterWeekIndex: 40, weeksRemaining: 0, pendingGateId: 'gate-w40-finale' }
    }
    const ended = openSegmentGate(run, 'gate-w40-finale', 'pass')
    expect(ended.chapter?.outcomeId).toBe('fulfilled')
    expect(ended.runStatus).toBe('archived')
  })

  it('W16 筑基 dismiss 后 lifeStage 为 uni 且 W17 触发择宗', () => {
    let run = advanceChapterToWeek(settledHsRun(), 16)
    expect(run.chapter?.chapterWeekIndex).toBe(16)

    const tick16 = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(tick16.blocked).toBe(true)
    expect(tick16.run.setpiece?.breakthroughPending).toBeTruthy()
    expect(resolvePlayScreen(tick16.run)).toBe('breakthrough-gate')

    run = dismissCurrentSetpiece(tick16.run)
    expect(run.lifeStage).toBe('uni')
    expect(run.chapter?.pendingGateId).toBeUndefined()

    run = advanceChapterToWeek(run, 17)
    const tick17 = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(tick17.blocked).toBe(true)
    expect(tick17.run.setpiece?.sectChoicePending).toBeTruthy()
    expect(resolvePlayScreen(tick17.run)).toBe('sect-choice')
  })

  it('W28 预科结业 dismiss 后 W29 先择轨再择岗', () => {
    let run = advanceChapterToWeek(settledHsRun(), 28)
    const tick28 = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(tick28.blocked).toBe(true)
    run = dismissCurrentSetpiece(tick28.run)
    expect(run.profileTags).toContain('uni-foundation')

    run = advanceChapterToWeek(run, 29)
    expect(run.chapter?.chapterWeekIndex).toBe(29)
    const tick29 = tickChapterWeek(run, DEFAULT_WEEK_PLAN)
    expect(tick29.blocked).toBe(true)
    expect(tick29.run.lifeStage).toBe('work')
    expect(tick29.run.work?.jobId).toBeNull()
    expect(tick29.run.work?.employmentTrack).toBeNull()
    expect(needsTrackChoice(tick29.run)).toBe(true)
    expect(needsJobChoice(tick29.run)).toBe(false)
    expect(resolvePlayScreen(tick29.run)).toBe('work-track-choice')

    run = dismissCurrentSetpiece(tick29.run, { employmentTrack: 'company' })
    expect(needsTrackChoice(run)).toBe(false)
    expect(needsJobChoice(run)).toBe(true)
    expect(run.work?.employmentTrack).toBe('company')
    expect(resolvePlayScreen(run)).toBe('work-job-choice')
  })
})
