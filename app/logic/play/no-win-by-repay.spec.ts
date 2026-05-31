import { describe, it, expect } from 'vitest'
import { confirmBreakthrough, isVictoryByDebtRepayment } from './breakthroughFlow'
import { scheduleBreakthroughIfDue } from './breakthroughFlow'
import { fullDebtFromRun } from './debtDashboard'
import type { PlayRunState } from '~/types/play'

function endlessZeroDebt(): PlayRunState {
  return {
    schemaVersion: 4,
    runId: 'z',
    runMode: 'endless',
    createdAt: '',
    updatedAt: '',
    lifeStage: 'work',
    chapterIndex: 0,
    realmTier: 'qi',
    realmIndex: 0,
    start: {
      playerName: '你',
      background: '贫民',
      talent: '无灵根',
      initialDebt: 0,
      startingCity: 'xx市'
    },
    slotId: 'slot1',
    runStatus: 'active',
    logs: [],
    profileTags: [],
    inbox: [],
    econ: {
      cash: 99999,
      collectionFee: 0,
      debtPrincipal: 0,
      debtInterestAccrued: 0,
      dailyRate: 0,
      delinquency: 0,
      lastPaymentDay: 0
    },
    stats: { daoXin: 3, faLi: 10, rouTi: 1, fatigue: 20, focus: 60 },
    school: { day: 1, week: 1, slot: 'morning', classTier: '普通班', lastExamScore: 0, lastRank: 1, perks: { mealSubsidy: 0, focusBonus: 0 } },
    endless: {
      maintenanceStack: 1,
      harvestRate: 0.14,
      daysInCurrentRealm: 10,
      breakthroughsCount: 0,
      irreversibleLiens: []
    },
    work: {
      jobId: 'errand-runner',
      educationTags: [],
      monthlyTarget: 5000,
      kpiScore: 0,
      shameEvents: 0
    }
  }
}

describe('no-win-by-repay', () => {
  it('负债归零不触发胜利判定', () => {
    const run = endlessZeroDebt()
    expect(fullDebtFromRun(run)).toBe(0)
    expect(isVictoryByDebtRepayment(run)).toBe(false)
    expect(run.runStatus).toBe('active')
  })

  it('破境路径增加债务台阶而非还清', () => {
    let run = scheduleBreakthroughIfDue(endlessZeroDebt())
    if (!run.setpiece?.breakthroughPending) {
      run = {
        ...run,
        econ: { ...run.econ!, debtPrincipal: 80000 }
      }
      run = scheduleBreakthroughIfDue(run)
    }
    expect(run.setpiece?.breakthroughPending).toBeTruthy()
    const after = confirmBreakthrough(run)
    expect(fullDebtFromRun(after)).toBeGreaterThan(0)
    expect(isVictoryByDebtRepayment(after)).toBe(false)
  })
})
