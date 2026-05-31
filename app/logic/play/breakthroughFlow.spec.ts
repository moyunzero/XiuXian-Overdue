import { describe, it, expect } from 'vitest'
import type { PlayRunState } from '~/types/play'
import {
  buildBreakthroughPending,
  confirmBreakthrough,
  isVictoryByDebtRepayment,
  meetsBreakthroughKpi,
  scheduleBreakthroughIfDue
} from './breakthroughFlow'
import { fullDebtFromRun } from './debtDashboard'

function endlessRun(overrides: Partial<PlayRunState> = {}): PlayRunState {
  return {
    schemaVersion: 4,
    runId: 'test',
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
      initialDebt: 20000,
      startingCity: 'xx市'
    },
    slotId: 'slot1',
    runStatus: 'active',
    logs: [],
    profileTags: [],
    inbox: [],
    econ: {
      cash: 1000,
      collectionFee: 0,
      debtPrincipal: 50000,
      debtInterestAccrued: 0,
      dailyRate: 0.007,
      delinquency: 0,
      lastPaymentDay: 0
    },
    stats: { daoXin: 2, faLi: 8, rouTi: 1, fatigue: 30, focus: 55 },
    school: { day: 10, week: 2, slot: 'morning', classTier: '普通班', lastExamScore: 0, lastRank: 999, perks: { mealSubsidy: 0, focusBonus: 0 } },
    endless: {
      maintenanceStack: 1,
      harvestRate: 0.14,
      daysInCurrentRealm: 5,
      breakthroughsCount: 0,
      irreversibleLiens: []
    },
    work: {
      jobId: 'errand-runner',
      educationTags: ['tier-normal'],
      monthlyTarget: 5000,
      kpiScore: 0,
      shameEvents: 0
    },
    ...overrides
  }
}

describe('breakthroughFlow', () => {
  it('KPI 达标后可挂 breakthroughPending', () => {
    const run = endlessRun()
    expect(meetsBreakthroughKpi(run)).toBe(true)
    const pending = buildBreakthroughPending(run)
    expect(pending?.nextRealmId).toBe('foundation')
    const scheduled = scheduleBreakthroughIfDue(run)
    expect(scheduled.setpiece?.breakthroughPending?.celebrationLine).toBeTruthy()
  })

  it('软保底防卡死：qi 境 38 天强制触发，即使 KPI 未达标也可破境排队', () => {
    const run = endlessRun({
      stats: { daoXin: 1, faLi: 1, rouTi: 0.1, fatigue: 30, focus: 55 },
      endless: {
        maintenanceStack: 1,
        harvestRate: 0.14,
        daysInCurrentRealm: 38,
        breakthroughsCount: 0,
        irreversibleLiens: []
      }
    })
    expect(meetsBreakthroughKpi(run)).toBe(false)
    const scheduled = scheduleBreakthroughIfDue(run)
    expect(scheduled.setpiece?.breakthroughPending).toBeTruthy()
  })

  it('软保底按境界分段：foundation 强制阈值更晚', () => {
    const early = endlessRun({
      realmTier: 'foundation',
      realmIndex: 1,
      stats: { daoXin: 1.3, faLi: 7, rouTi: 0.4, fatigue: 30, focus: 55 },
      endless: {
        maintenanceStack: 1,
        harvestRate: 0.18,
        daysInCurrentRealm: 38,
        breakthroughsCount: 1,
        irreversibleLiens: []
      }
    })
    expect(meetsBreakthroughKpi(early)).toBe(false)
    expect(scheduleBreakthroughIfDue(early).setpiece?.breakthroughPending).toBeFalsy()

    const forced = endlessRun({
      realmTier: 'foundation',
      realmIndex: 1,
      stats: { daoXin: 1.3, faLi: 7, rouTi: 0.4, fatigue: 30, focus: 55 },
      endless: {
        maintenanceStack: 1,
        harvestRate: 0.18,
        daysInCurrentRealm: 54,
        breakthroughsCount: 1,
        irreversibleLiens: []
      }
    })
    expect(scheduleBreakthroughIfDue(forced).setpiece?.breakthroughPending).toBeTruthy()
  })

  it('confirmBreakthrough 升境并增加本金，非胜利', () => {
    const run = scheduleBreakthroughIfDue(endlessRun())
    const debtBefore = fullDebtFromRun(run)
    const confirmed = confirmBreakthrough(run)
    expect(confirmed.realmTier).toBe('foundation')
    expect(confirmed.endless?.breakthroughsCount).toBe(1)
    expect(fullDebtFromRun(confirmed)).toBeGreaterThan(debtBefore)
    expect(isVictoryByDebtRepayment(confirmed)).toBe(false)
    expect(confirmed.runStatus).toBe('active')
  })

  it('负债清零不构成胜利', () => {
    const zeroDebt = endlessRun({
      econ: {
        cash: 0,
        collectionFee: 0,
        debtPrincipal: 0,
        debtInterestAccrued: 0,
        dailyRate: 0.007,
        delinquency: 0,
        lastPaymentDay: 0
      }
    })
    expect(isVictoryByDebtRepayment(zeroDebt)).toBe(false)
    expect(zeroDebt.runStatus).not.toBe('archived')
  })
})
