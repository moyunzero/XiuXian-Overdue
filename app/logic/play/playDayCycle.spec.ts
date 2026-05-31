import { describe, it, expect } from 'vitest'
import { round1 } from '~/utils/rng'
import type { StartConfig } from '~/types/game'
import { advancePlayRunCalendarDay, shouldSkipWeeklyExamForPlay } from './playDayCycle'
import { createEndlessRunFromStart } from './endlessFlow'
import { createHsFieldsFromStart } from './createHsPlayState'
import { fullDebtFromRun } from './debtDashboard'

const start: StartConfig = {
  playerName: '你',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 12000,
  startingCity: '嵩阳市'
}

describe('playDayCycle', () => {
  it('无尽推进一日：日息按总负债计息（非仅本金）', () => {
    let run = createEndlessRunFromStart(
      {
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 20000,
        startingCity: 'xx市'
      },
      'slot1'
    )
    run = {
      ...run,
      school: { ...run.school!, day: 2 },
      econ: {
        ...run.econ!,
        debtPrincipal: 10_000,
        debtInterestAccrued: 2_000,
        collectionFee: 1_000
      }
    }
    const interestBefore = run.econ!.debtInterestAccrued
    const totalBefore = fullDebtFromRun(run)
    const next = advancePlayRunCalendarDay(run)
    const interestAfter = next.econ!.debtInterestAccrued
    const principalOnlyBump = Math.floor(run.econ!.debtPrincipal * run.econ!.dailyRate)
    expect(interestAfter - interestBefore).toBeGreaterThan(principalOnlyBump)
    expect(interestAfter).toBe(round1(interestBefore + totalBefore * run.econ!.dailyRate))
    expect(next.school!.day).toBe(3)
  })

  it('无尽周界日触发周结算日志且不因月考改分班', () => {
    let run = createEndlessRunFromStart(
      {
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 20000,
        startingCity: 'xx市'
      },
      'slot1'
    )
    const tierBefore = run.school!.classTier
    run = {
      ...run,
      school: { ...run.school!, day: 7, week: 1 },
      econ: {
        ...run.econ!,
        lastPaymentDay: 0
      }
    }
    const next = advancePlayRunCalendarDay(run)
    expect(next.school!.day).toBe(8)
    expect(next.school!.week).toBe(2)
    expect(next.school!.classTier).toBe(tierBefore)
    expect(next.logs.some((l) => l.includes('周结算'))).toBe(true)
    expect(next.logs.some((l) => l.includes('月考结算'))).toBe(false)
  })

  it('shouldSkipWeeklyExamForPlay：v3 endless 全阶段跳过月考', () => {
    const hs = createHsFieldsFromStart(start)
    const hsRun = {
      lifeStage: 'hs' as const,
      runMode: 'endless' as const,
      ...hs
    }
    expect(shouldSkipWeeklyExamForPlay(hsRun)).toBe(true)
    expect(shouldSkipWeeklyExamForPlay({ ...hsRun, lifeStage: 'uni' })).toBe(true)
    expect(shouldSkipWeeklyExamForPlay({ ...hsRun, lifeStage: 'work' })).toBe(true)
    expect(
      shouldSkipWeeklyExamForPlay(
        createEndlessRunFromStart(
          {
            playerName: '你',
            background: '贫民',
            talent: '无灵根',
            initialDebt: 20000,
            startingCity: 'xx市'
          },
          'slot1'
        )
      )
    ).toBe(true)
  })

  it('高中周界日 endless 仅周结算、不触发月考', () => {
    const hs = createHsFieldsFromStart(start)
    let run = {
      schemaVersion: 4 as const,
      runId: 't',
      runMode: 'endless' as const,
      createdAt: '',
      updatedAt: '',
      lifeStage: 'hs' as const,
      chapterIndex: 0,
      realmTier: 'mortal' as const,
      realmIndex: 0,
      start,
      slotId: 'slot1' as const,
      runStatus: 'active' as const,
      inbox: [] as const,
      ...hs
    }
    run = {
      ...run,
      school: { ...run.school!, day: 7, week: 1 },
      econ: { ...run.econ!, lastPaymentDay: 0 }
    }
    const next = advancePlayRunCalendarDay(run)
    expect(next.school!.day).toBe(8)
    expect(next.logs.some((l) => l.includes('周结算'))).toBe(true)
    expect(next.logs.some((l) => l.includes('月考结算'))).toBe(false)
  })
})
