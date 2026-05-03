import { describe, it, expect } from 'vitest'
import { calculateBehaviorProfile, type BehaviorProfile, type FinancialRiskLevel } from './useBehaviorProfile'
import type { GameState } from '~/types/game'

function createGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    started: true,
    seed: 12345,
    stats: { daoXin: 1, faLi: 5.0, rouTi: 0.6, fatigue: 50, focus: 50 },
    econ: {
      cash: 1000,
      collectionFee: 0,
      debtPrincipal: 5000,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 1
    },
    school: {
      day: 1,
      week: 1,
      slot: 'morning',
      classTier: '普通班',
      lastExamScore: 70,
      lastRank: 15,
      perks: { mealSubsidy: 10, focusBonus: 5 }
    },
    contract: { active: false, name: '', patron: '', progress: 0, vigilance: 0, lastTriggerDay: 0 },
    logs: [],
    eventHistory: {},
    familyHistory: {},
    ...overrides
  } as GameState
}

describe('calculateBehaviorProfile', () => {
  describe('financialRisk', () => {
    it('低财务风险：无逾期，低债务', () => {
      const state = createGameState({
        econ: { cash: 2000, collectionFee: 0, debtPrincipal: 1000, debtInterestAccrued: 0, dailyRate: 0.008, delinquency: 0, lastPaymentDay: 1 }
      })
      const profile = calculateBehaviorProfile(state)
      expect(profile.financialRisk).toBe('low')
    })

    it('中等财务风险：逾期 1 级或债务 > 5000', () => {
      const state = createGameState({
        econ: { cash: 500, collectionFee: 0, debtPrincipal: 6000, debtInterestAccrued: 0, dailyRate: 0.008, delinquency: 1, lastPaymentDay: 1 }
      })
      const profile = calculateBehaviorProfile(state)
      expect(profile.financialRisk).toBe('medium')
    })

    it('高财务风险：逾期 2 级或债务 > 20000', () => {
      const state = createGameState({
        econ: { cash: 100, collectionFee: 0, debtPrincipal: 25000, debtInterestAccrued: 5000, dailyRate: 0.008, delinquency: 2, lastPaymentDay: 1 }
      })
      const profile = calculateBehaviorProfile(state)
      expect(profile.financialRisk).toBe('high')
    })

    it('极高财务风险：逾期 >= 4 或债务 > 50000', () => {
      const state = createGameState({
        econ: { cash: 0, collectionFee: 5000, debtPrincipal: 40000, debtInterestAccrued: 10000, dailyRate: 0.008, delinquency: 4, lastPaymentDay: 1 }
      })
      const profile = calculateBehaviorProfile(state)
      expect(profile.financialRisk).toBe('extreme')
    })
  })

  describe('educationCredit', () => {
    it('示范班 = excellent', () => {
      const state = createGameState({ school: { day: 10, week: 2, slot: 'morning', classTier: '示范班', lastExamScore: 90, lastRank: 1, perks: { mealSubsidy: 30, focusBonus: 20 } } })
      const profile = calculateBehaviorProfile(state)
      expect(profile.educationCredit).toBe('excellent')
    })

    it('普通班 = good', () => {
      const state = createGameState()
      const profile = calculateBehaviorProfile(state)
      expect(profile.educationCredit).toBe('good')
    })

    it('末位班但及格 = fair', () => {
      const state = createGameState({ school: { day: 10, week: 2, slot: 'morning', classTier: '末位班', lastExamScore: 65, lastRank: 40, perks: { mealSubsidy: 0, focusBonus: 0 } } })
      const profile = calculateBehaviorProfile(state)
      expect(profile.educationCredit).toBe('fair')
    })

    it('末位班不及格 = poor', () => {
      const state = createGameState({ school: { day: 10, week: 2, slot: 'morning', classTier: '末位班', lastExamScore: 45, lastRank: 50, perks: { mealSubsidy: 0, focusBonus: 0 } } })
      const profile = calculateBehaviorProfile(state)
      expect(profile.educationCredit).toBe('poor')
    })
  })

  describe('compliance', () => {
    it('驯化高 = domesticated', () => {
      const state = createGameState({ contract: { active: true, name: '', patron: '', progress: 80, vigilance: 50, lastTriggerDay: 5 }, domestication: 90 })
      const profile = calculateBehaviorProfile(state)
      expect(profile.compliance).toBe('domesticated')
    })

    it('顺从 = compliant', () => {
      const state = createGameState({ contract: { active: true, name: '', patron: '', progress: 60, vigilance: 30, lastTriggerDay: 3 }, domestication: 50 })
      const profile = calculateBehaviorProfile(state)
      expect(profile.compliance).toBe('compliant')
    })

    it('中立 = neutral', () => {
      const state = createGameState({ contract: { active: false, name: '', patron: '', progress: 30, vigilance: 20, lastTriggerDay: 0 }, domestication: 30 })
      const profile = calculateBehaviorProfile(state)
      expect(profile.compliance).toBe('neutral')
    })

    it('反抗者 = rebel', () => {
      const state = createGameState({ contract: { active: true, name: '', patron: '', progress: 5, vigilance: 10, lastTriggerDay: 0 }, domestication: 0 })
      const profile = calculateBehaviorProfile(state)
      expect(profile.compliance).toBe('rebel')
    })
  })

  describe('bodyAsset', () => {
    it('完整 = intact', () => {
      const state = createGameState({ bodyIntegrity: 1.0, bodyPartRepayment: {} })
      const profile = calculateBehaviorProfile(state)
      expect(profile.bodyAsset).toBe('intact')
    })

    it('部分偿还 = partial', () => {
      const state = createGameState({ bodyIntegrity: 0.7, bodyPartRepayment: { LeftPalm: true } })
      const profile = calculateBehaviorProfile(state)
      expect(profile.bodyAsset).toBe('partial')
    })

    it('严重 = severe', () => {
      const state = createGameState({ bodyIntegrity: 0.4, bodyPartRepayment: { LeftPalm: true, RightArm: true, LeftLeg: true } })
      const profile = calculateBehaviorProfile(state)
      expect(profile.bodyAsset).toBe('severe')
    })
  })

  describe('tags', () => {
    it('打工党：parttime 占比 > 40%', () => {
      const state = createGameState({
        sessionMetrics: { actionCounts: { parttime: 10, study: 3, tuna: 2, train: 1 }, borrowCount: 0, bodyPartRepaymentCount: 0, antiProfileActionCount: 0, restCount: 0, startTime: Date.now() }
      })
      const profile = calculateBehaviorProfile(state)
      expect(profile.tags).toContain('workaholic')
    })

    it('修仙党：study + tuna 占比 > 60%', () => {
      const state = createGameState({
        sessionMetrics: { actionCounts: { study: 15, tuna: 10, parttime: 2, train: 1 }, borrowCount: 0, bodyPartRepaymentCount: 0, antiProfileActionCount: 0, restCount: 0, startTime: Date.now() }
      })
      const profile = calculateBehaviorProfile(state)
      expect(profile.tags).toContain('cultivator')
    })

    it('违约惯犯：delinquency >= 2', () => {
      const state = createGameState({
        econ: { cash: 0, collectionFee: 0, debtPrincipal: 10000, debtInterestAccrued: 2000, dailyRate: 0.008, delinquency: 2, lastPaymentDay: 1 }
      })
      const profile = calculateBehaviorProfile(state)
      expect(profile.tags).toContain('defaulter')
    })

    it('模范学生：示范班 + 无逾期', () => {
      const state = createGameState({
        school: { day: 10, week: 2, slot: 'morning', classTier: '示范班', lastExamScore: 90, lastRank: 1, perks: { mealSubsidy: 30, focusBonus: 20 } },
        econ: { cash: 2000, collectionFee: 0, debtPrincipal: 5000, debtInterestAccrued: 0, dailyRate: 0.008, delinquency: 0, lastPaymentDay: 1 }
      })
      const profile = calculateBehaviorProfile(state)
      expect(profile.tags).toContain('good_student')
    })

    it('身体出卖者：有身体偿还记录', () => {
      const state = createGameState({ bodyPartRepayment: { LeftPalm: true } })
      const profile = calculateBehaviorProfile(state)
      expect(profile.tags).toContain('body_seller')
    })
  })
})
