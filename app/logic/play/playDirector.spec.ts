import { describe, expect, it } from 'vitest'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { initChapter } from '~/logic/play/chapterWeekFlow'
import { resolvePlayScreen } from '~/logic/play/resolvePlayScreen'
import { advanceRunToHs } from '~/logic/play/createHsPlayState'
import { hasExamBossPending } from '~/logic/play/examBoss'
import type { StartConfig } from '~/types/game'

const start: StartConfig = {
  playerName: '你',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

describe('playDirector (resolvePlayScreen anti-stuck)', () => {
  it('升学关口 breakthrough 优先于已 dismiss 的无效 examBoss', () => {
    const base = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    const hs = advanceRunToHs(base)
    const run = initChapter({
      ...hs,
      setpiece: {
        examBossPending: {} as never,
        breakthroughPending: {
          currentRealmId: 'mortal',
          nextRealmId: 'foundation',
          currentRealmLabel: '凡人',
          nextRealmLabel: '预科',
          celebrationLine: '关口通过',
          billLines: ['a', 'b', 'c'],
          totalDebt: 12_000,
          maintenanceBumpLabel: '+0'
        }
      }
    })
    expect(hasExamBossPending(run)).toBe(false)
    expect(resolvePlayScreen(run)).toBe('breakthrough-gate')
  })

  it('归档后不再回到 week-dashboard 或 endless-pressure', () => {
    const base = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    const run = initChapter({
      ...advanceRunToHs(base),
      runStatus: 'archived',
      chapter: {
        chapterId: 'ch0-forty-week-contract',
        weekBudget: 40,
        chapterWeekIndex: 40,
        weeksRemaining: 0,
        outcomeId: 'fulfilled'
      }
    })
    expect(resolvePlayScreen(run)).toBe('run-archive')
    expect(resolvePlayScreen(run)).not.toBe('week-dashboard')
    expect(resolvePlayScreen(run)).not.toBe('endless-pressure')
  })

  it('W40 终局 pending 时阻塞 week-dashboard', () => {
    const base = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    let run = initChapter(advanceRunToHs(base))
    run = {
      ...run,
      chapter: {
        ...run.chapter!,
        chapterWeekIndex: 40,
        weeksRemaining: 0,
        pendingGateId: 'gate-w40-finale'
      }
    }
    expect(resolvePlayScreen(run)).toBe('contract-finale')
  })

  it('setpiece 栈：exam-boss 高于 mandate-inbox', () => {
    const base = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    const run = initChapter({
      ...advanceRunToHs(base),
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
      },
      mandate: {
        numbness: 0,
        domestication: 0,
        pendingDeliveryIds: ['ch0-debt-reminder'],
        supplyCutStreak: 0
      }
    })
    expect(resolvePlayScreen(run)).toBe('exam-boss')
  })
})
