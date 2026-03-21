import { describe, expect, it } from 'vitest'
import type { GameState } from '~/types/game'
import {
  computePsychologicalPressureScore,
  computeRestRecovery,
  formatPsySubsidiaryLine,
  getConflictPressureTier,
  isMidLatePhase,
  isWeeklySettlementDay,
  restRecoveryMultiplier,
  syncDomesticationWithContractProgress
} from '~/logic/gameEngine'

/** PSY-01：可复用的最小 GameState 片段 */
function baseGame(overrides: Partial<GameState> = {}): GameState {
  return {
    started: true,
    seed: 42_424_242,
    stats: {
      daoXin: 1,
      faLi: 6,
      rouTi: 0.6,
      fatigue: 30,
      focus: 50
    },
    econ: {
      cash: 2000,
      collectionFee: 0,
      coreDebt: 5000,
      initialCoreDebt: 5000,
      debtPrincipal: 2000,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 1
    },
    school: {
      day: 5,
      week: 1,
      slot: 'morning',
      classTier: '普通班',
      lastExamScore: 500,
      lastRank: 100,
      perks: { mealSubsidy: 40, focusBonus: 0 }
    },
    contract: {
      active: true,
      name: '请神契约',
      patron: '布娃娃',
      progress: 0,
      vigilance: 30,
      lastTriggerDay: 0
    },
    logs: [],
    eventHistory: {},
    familyHistory: {},
    domestication: 0,
    numbness: 0,
    ...overrides
  } as GameState
}

describe('PSY-01 D-01: isMidLatePhase 中后期门闩（先到先进入）', () => {
  it('day=10, progress=0 为真', () => {
    const g = baseGame({ school: { ...baseGame().school, day: 10, week: 2 }, contract: { ...baseGame().contract, progress: 0 } })
    expect(isMidLatePhase(g)).toBe(true)
  })

  it('day=9, progress=0 为假', () => {
    const g = baseGame({ school: { ...baseGame().school, day: 9, week: 2 }, contract: { ...baseGame().contract, progress: 0 } })
    expect(isMidLatePhase(g)).toBe(false)
  })

  it('day=1, progress=50 为真（先到先进入）', () => {
    const g = baseGame({ school: { ...baseGame().school, day: 1, week: 1 }, contract: { ...baseGame().contract, progress: 50 } })
    expect(isMidLatePhase(g)).toBe(true)
  })
})

describe('PSY-01 D-02: getConflictPressureTier 周阶梯与周界对齐、单调不减', () => {
  it('非中后期阶梯为 0', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 7, week: 1 },
      contract: { ...baseGame().contract, progress: 10 }
    })
    expect(isMidLatePhase(g)).toBe(false)
    expect(getConflictPressureTier(g)).toBe(0)
  })

  it('中后期 + 周结算日：周次升高则阶梯不降', () => {
    const gWeek1 = baseGame({
      school: { ...baseGame().school, day: 7, week: 1 },
      contract: { ...baseGame().contract, progress: 60 }
    })
    const gWeek2 = baseGame({
      school: { ...baseGame().school, day: 14, week: 2 },
      contract: { ...baseGame().contract, progress: 60 }
    })
    expect(isWeeklySettlementDay(gWeek1)).toBe(true)
    expect(isWeeklySettlementDay(gWeek2)).toBe(true)
    expect(isMidLatePhase(gWeek1)).toBe(true)
    expect(isMidLatePhase(gWeek2)).toBe(true)
    expect(getConflictPressureTier(gWeek2)).toBeGreaterThanOrEqual(getConflictPressureTier(gWeek1))
  })
})

describe('PSY-01 D-03: computePsychologicalPressureScore 复合压力（契约 + 状态）', () => {
  it('纯函数：仅由 contract 与 stats 组合，可解释', () => {
    const g = baseGame({
      contract: { ...baseGame().contract, progress: 40, vigilance: 50 },
      stats: { ...baseGame().stats, fatigue: 80, daoXin: 3 }
    })
    const s = computePsychologicalPressureScore(g)
    expect(s).toBeGreaterThan(0)
    expect(Number.isFinite(s)).toBe(true)
  })
})

describe('PSY-01 D-04: 无前期软保护（同一套公式入口，仅门闩区分中后期）', () => {
  it('前期与中后期共用 restRecoveryMultiplier 入口，不因「前期」单独减压', () => {
    const early = baseGame({
      school: { ...baseGame().school, day: 3, week: 1 },
      contract: { ...baseGame().contract, progress: 20, active: true }
    })
    const late = baseGame({
      school: { ...baseGame().school, day: 12, week: 2 },
      contract: { ...baseGame().contract, progress: 20, active: true }
    })
    expect(isMidLatePhase(early)).toBe(false)
    expect(isMidLatePhase(late)).toBe(true)
    // 同 progress 时倍率相同 — 无「前期额外回血」分支
    expect(restRecoveryMultiplier(early)).toBe(restRecoveryMultiplier(late))
  })
})

describe('PSY-01 D-05: syncDomesticationWithContractProgress 副指标与契约联动非递减', () => {
  it('签约且 progress 上升时 domestication 不下降', () => {
    const g = baseGame({ domestication: 10, contract: { ...baseGame().contract, active: true, progress: 20 } })
    syncDomesticationWithContractProgress(g, 15)
    expect(g.domestication ?? 0).toBeGreaterThanOrEqual(10)
  })
})

describe('PSY-01 D-06 D-07: computeRestRecovery 缠绕降恢复 / 麻木近零增量', () => {
  it('PSY-01 D-07: progress 高时基础恢复低于低 progress', () => {
    const lowP = baseGame({ contract: { ...baseGame().contract, active: true, progress: 10 } })
    const highP = baseGame({ contract: { ...baseGame().contract, active: true, progress: 90 } })
    const rLow = computeRestRecovery(lowP, { rand: () => 0.99 })
    const rHigh = computeRestRecovery(highP, { rand: () => 0.99 })
    expect(rLow.focusDelta).toBeGreaterThan(rHigh.focusDelta)
  })

  it('PSY-01 D-06: 麻木分支 focusDelta 接近 0', () => {
    const g = baseGame({ contract: { ...baseGame().contract, active: true, progress: 70 } })
    const r = computeRestRecovery(g, { rand: () => 0.5, forceNumb: true })
    expect(r.isNumbRest).toBe(true)
    expect(r.focusDelta).toBeLessThanOrEqual(1)
  })
})

describe('PSY-01 D-08: formatPsySubsidiaryLine 单行展示', () => {
  it('输出单行副指标摘要', () => {
    const g = baseGame({ domestication: 12, numbness: 3, contract: { ...baseGame().contract, active: true, progress: 44 } })
    const line = formatPsySubsidiaryLine(g)
    expect(line.length).toBeGreaterThan(0)
    expect(line).not.toContain('\n')
  })
})
