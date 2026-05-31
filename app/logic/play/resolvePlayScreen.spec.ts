import { describe, expect, it } from 'vitest'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { initChapter } from '~/logic/play/chapterWeekFlow'
import { resolvePlayScreen } from '~/logic/play/resolvePlayScreen'
import { advanceRunToHs } from '~/logic/play/createHsPlayState'
import type { StartConfig } from '~/types/game'

const start: StartConfig = {
  playerName: '你',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

describe('resolvePlayScreen', () => {
  it('chapter 默认 week-dashboard，不出现 endless-pressure', () => {
    const base = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    const hs = advanceRunToHs(base)
    const run = initChapter(hs)
    expect(resolvePlayScreen(run)).toBe('week-dashboard')
    expect(resolvePlayScreen(run)).not.toBe('endless-pressure')
  })

  it('chapter 月考 pending 优先于 dashboard', () => {
    const base = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    const hs = advanceRunToHs(base)
    const run = initChapter({
      ...hs,
      setpiece: {
        examBossPending: {
          score: 600,
          rank: 50,
          classTier: '重点班',
          tierBefore: '普通班',
          tierAfter: '重点班',
          perksDelta: { mealSubsidy: 0, focusBonus: 0 },
          week: 4,
          perkSummary: 'test'
        }
      }
    })
    expect(resolvePlayScreen(run)).toBe('exam-boss')
  })

  it('无效 examBossPending 不进入 exam-boss 屏', () => {
    const base = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    const hs = advanceRunToHs(base)
    const run = initChapter({
      ...hs,
      setpiece: { examBossPending: {} as never }
    })
    expect(resolvePlayScreen(run)).toBe('week-dashboard')
  })

  it('chapter work 段待择轨时优先 work-track-choice', () => {
    const run = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    run.lifeStage = 'work'
    run.chapter = {
      chapterId: 'ch0-forty-week-contract',
      weekBudget: 40,
      chapterWeekIndex: 29,
      weeksRemaining: 11,
      segmentId: 'work',
      pendingGateId: 'gate-w29-track'
    }
    run.work = {
      jobId: null,
      employmentTrack: null,
      educationTags: ['hs-graduated', 'uni-enrolled'],
      monthlyTarget: 8000,
      kpiScore: 0,
      shameEvents: 0
    }
    expect(resolvePlayScreen(run)).toBe('work-track-choice')
  })

  it('chapter work 段已择轨待选岗时 work-job-choice', () => {
    const run = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    run.lifeStage = 'work'
    run.chapter = {
      chapterId: 'ch0-forty-week-contract',
      weekBudget: 40,
      chapterWeekIndex: 29,
      weeksRemaining: 11,
      segmentId: 'work',
      pendingGateId: 'gate-w29-track'
    }
    run.work = {
      jobId: null,
      employmentTrack: 'company',
      educationTags: ['hs-graduated', 'uni-enrolled'],
      monthlyTarget: 8000,
      kpiScore: 0,
      shameEvents: 0
    }
    expect(resolvePlayScreen(run)).toBe('work-job-choice')
  })

  it('chapter 有待回应来文时 mandate-inbox', () => {
    const base = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    const run = initChapter(advanceRunToHs(base))
    run.mandate = {
      numbness: 0,
      domestication: 0,
      pendingDeliveryIds: ['ch0-debt-reminder'],
      supplyCutStreak: 0
    }
    expect(resolvePlayScreen(run)).toBe('mandate-inbox')
  })

  it('endless 仍走 legacy endless-pressure', () => {
    const run = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'endless' })
    const hs = advanceRunToHs({
      ...run,
      pressure: {
        round: 1,
        offeredCardIds: ['a', 'b', 'c', 'd'],
        playedCardIds: [],
        resolved: false
      }
    })
    expect(resolvePlayScreen(hs)).toBe('endless-pressure')
  })
})
