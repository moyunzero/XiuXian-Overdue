import { describe, it, expect } from 'vitest'
import type { GameState } from '~/types/game'
import * as Engine from '~/logic/gameEngine'

function createGameState(overrides: Partial<GameState> = {}): GameState {
  const base: GameState = {
    school: { day: 1, week: 1, classTier: '普通班', perks: { mealSubsidy: 40, focusBonus: 0 }, lastExamScore: 0 },
    econ: {
      cash: 0,
      collectionFee: 0,
      debtPrincipal: 0,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 0,
      debtLock: null,
      lockedDebtAmount: 0
    },
    stats: { daoXin: 1, faLi: 0, rouTi: 1, fatigue: 0, focus: 50 },
    contract: { active: false, name: '', progress: 0, vigilance: 0 },
    logs: [],
    eventHistory: {},
    familyHistory: {},
    bodyPartRepayment: {},
    bodyIntegrity: 1.0,
    bodyReputation: 'clean',
    domestication: 0,
    numbness: 0
  }
  return { ...base, ...overrides }
}

describe('赎身机制核心函数', () => {
  describe('calculateRedemptionCost', () => {
    it('债务未锁定时返回 0', () => {
      const g = createGameState({
        econ: { debtLock: null, lockedDebtAmount: 8000, cash: 15000 }
      })

      expect(Engine.calculateRedemptionCost(g)).toBe(0)
    })

    it('锁定金额为 0 时返回 0', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 0, cash: 15000 },
        bodyPartRepayment: { LeftPalm: true }
      })

      expect(Engine.calculateRedemptionCost(g)).toBe(0)
    })

    it('计算第 1 次抵押后的赎身金额（8000 × 1.5 = 12000）', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 8000, cash: 15000 },
        bodyPartRepayment: { LeftPalm: true }
      })

      expect(Engine.calculateRedemptionCost(g)).toBe(12000)
    })

    it('计算第 2 次抵押后的赎身金额（16000 × 3.0 = 48000）', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 16000, cash: 50000 },
        bodyPartRepayment: { LeftPalm: true, RightPalm: true }
      })

      expect(Engine.calculateRedemptionCost(g)).toBe(48000)
    })

    it('计算第 3 次抵押后的赎身金额（24000 × 6.0 = 144000）', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 24000, cash: 200000 },
        bodyPartRepayment: { LeftPalm: true, RightPalm: true, LeftArm: true }
      })

      expect(Engine.calculateRedemptionCost(g)).toBe(144000)
    })
  })

  describe('canRedeem', () => {
    it('现金充足时返回 true', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 8000, cash: 15000 },
        bodyPartRepayment: { LeftPalm: true }
      })

      expect(Engine.canRedeem(g)).toBe(true)
    })

    it('现金不足时返回 false', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 8000, cash: 5000 },
        bodyPartRepayment: { LeftPalm: true }
      })

      expect(Engine.canRedeem(g)).toBe(false)
    })

    it('债务未锁定时返回 false', () => {
      const g = createGameState({
        econ: { debtLock: null, lockedDebtAmount: 8000, cash: 50000 },
        bodyPartRepayment: { LeftPalm: true }
      })

      expect(Engine.canRedeem(g)).toBe(false)
    })
  })

  describe('executeRedemption', () => {
    it('债务未锁定时返回失败', () => {
      const g = createGameState({
        econ: { debtLock: null, lockedDebtAmount: 0, cash: 50000 }
      })

      const result = Engine.executeRedemption(g)
      expect(result.success).toBe(false)
      expect(result.message).toContain('无需赎身')
    })

    it('现金不足时返回失败并提示金额', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 8000, cash: 5000 },
        bodyPartRepayment: { LeftPalm: true }
      })

      const result = Engine.executeRedemption(g)
      expect(result.success).toBe(false)
      expect(result.cost).toBe(12000)
      expect(result.message).toContain('现金不足')
      expect(result.message).toContain('12,000')
      expect(result.message).toContain('5,000')
    })

    it('赎身后债务解锁但身体不恢复', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 8000, cash: 15000 },
        bodyPartRepayment: { LeftPalm: true },
        bodyIntegrity: 0.8
      })

      const result = Engine.executeRedemption(g)
      expect(result.success).toBe(true)
      expect(result.cost).toBe(12000)

      expect(g.econ.debtLock).toBeNull()
      expect(g.econ.lockedDebtAmount).toBe(0)
      expect(g.bodyPartRepayment.LeftPalm).toBe(true)  // 身体不恢复
      expect(g.bodyIntegrity).toBe(0.8)                 // 完整性不恢复
      expect(g.econ.cash).toBe(3000)                    // 15000 - 12000
    })

    it('赎身后记录日志', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 8000, cash: 15000 },
        bodyPartRepayment: { LeftPalm: true }
      })

      Engine.executeRedemption(g)

      expect(g.logs.length).toBeGreaterThan(0)
      expect(g.logs[0].title).toBe('赎身完成')
      expect(g.logs[0].detail).toContain('12,000')
      expect(g.logs[0].detail).toContain('伤痕还在')
      expect(g.logs[0].tone).toBe('warn')
    })

    it('多次抵押后赎身金额正确', () => {
      const g = createGameState({
        econ: { debtLock: 'bodyLocked', lockedDebtAmount: 16000, cash: 50000 },
        bodyPartRepayment: { LeftPalm: true, RightPalm: true }
      })

      const result = Engine.executeRedemption(g)
      expect(result.success).toBe(true)
      expect(result.cost).toBe(48000)  // 16000 × 3.0
      expect(g.econ.cash).toBe(2000)   // 50000 - 48000
    })
  })
})
