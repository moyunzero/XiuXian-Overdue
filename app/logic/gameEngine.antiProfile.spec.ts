import { describe, it, expect } from 'vitest'
import * as Engine from '~/logic/gameEngine'
import { defaultState } from '~/composables/useGameState'

function baseGame(overrides?: Partial<Engine.GameState>): Engine.GameState {
  const g = defaultState() as Engine.GameState
  g.started = true
  g.school.day = 10
  g.school.week = 2
  g.school.classTier = '普通班'
  g.econ.cash = 1000
  g.econ.debtPrincipal = 30000
  g.econ.delinquency = 0
  g.stats.faLi = 1.5
  g.stats.rouTi = 2.0
  g.stats.fatigue = 40
  g.stats.focus = 50
  g.scoreDayStreak = 0
  g.cashDayStreak = 0
  g.domestication = 20
  g.numbness = 10
  g.bodyIntegrity = 1.0
  if (overrides) Object.assign(g, overrides)
  return g
}

describe('方案 A：反画像路线', () => {
  describe('isAntiProfileAction', () => {
    it('驯化>=30时学习是反画像行为', () => {
      const g = baseGame({ domestication: 30 })
      expect(Engine.isAntiProfileAction('study', g)).toBe(true)
    })

    it('驯化<30时学习不是反画像行为', () => {
      const g = baseGame({ domestication: 29 })
      expect(Engine.isAntiProfileAction('study', g)).toBe(false)
    })

    it('已驯化状态时吐纳是反画像行为', () => {
      const g = baseGame({ domestication: 70, contract: { ...baseGame().contract, active: true } })
      expect(Engine.isAntiProfileAction('tuna', g)).toBe(true)
    })

    it('高驯化高麻木时休息是反画像行为', () => {
      const g = baseGame({ domestication: 50, numbness: 30 })
      expect(Engine.isAntiProfileAction('rest', g)).toBe(true)
    })

    it('身体枯竭时训练是反画像行为', () => {
      const g = baseGame({ bodyIntegrity: 0.2 })
      expect(Engine.isAntiProfileAction('train', g)).toBe(true)
    })
  })

  describe('updateAntiProfileStreak', () => {
    it('反画像行为增加连续天数', () => {
      const g = baseGame({ antiProfileDayStreak: 2 })
      Engine.updateAntiProfileStreak(g, true)
      expect(g.antiProfileDayStreak).toBe(3)
    })

    it('非反画像行为重置连续天数', () => {
      const g = baseGame({ antiProfileDayStreak: 3 })
      Engine.updateAntiProfileStreak(g, false)
      expect(g.antiProfileDayStreak).toBe(0)
    })
  })

  describe('calculateAntiProfileRisk', () => {
    it('连续天数小于阈值时风险为0', () => {
      const g = baseGame({ antiProfileDayStreak: 2 })
      expect(Engine.calculateAntiProfileRisk(g)).toBe(0)
    })

    it('连续天数超过阈值后风险增加', () => {
      const g = baseGame({ antiProfileDayStreak: 4 })
      expect(Engine.calculateAntiProfileRisk(g)).toBeGreaterThan(0)
    })

    it('风险有上限', () => {
      const g = baseGame({ antiProfileDayStreak: 20 })
      expect(Engine.calculateAntiProfileRisk(g)).toBeLessThanOrEqual(0.6)
    })
  })

  describe('shouldTriggerAntiProfileRiskEvent', () => {
    it('连续天数不足时不触发', () => {
      const g = baseGame({ antiProfileDayStreak: 2 })
      const rand = () => 0.5
      expect(Engine.shouldTriggerAntiProfileRiskEvent(g, rand)).toBe(false)
    })

    it('连续天数足够且随机通过时触发', () => {
      const g = baseGame({ antiProfileDayStreak: 5 })
      const rand = () => 0.1
      expect(Engine.shouldTriggerAntiProfileRiskEvent(g, rand)).toBe(true)
    })
  })

  describe('buildAntiProfileRiskEvent', () => {
    it('生成反画像风险事件', () => {
      const g = baseGame({ antiProfileDayStreak: 5 })
      const event = Engine.buildAntiProfileRiskEvent(g)
      expect(event.title).toBe('异常行为检测')
      expect(event.options.some(o => o.id === 'adjust_behavior')).toBe(true)
      expect(event.options.some(o => o.id === 'maintain_resistance')).toBe(true)
    })
  })

  describe('applyAntiProfileConsequence', () => {
    it('选择调整重置连续天数', () => {
      const g = baseGame({ antiProfileDayStreak: 5, domestication: 30 })
      Engine.applyAntiProfileConsequence(g, 'adjust')
      expect(g.antiProfileDayStreak).toBe(0)
    })

    it('选择维持增加驯化进度', () => {
      const g = baseGame({ antiProfileDayStreak: 5, domestication: 30 })
      const beforeDomestication = g.domestication ?? 0
      Engine.applyAntiProfileConsequence(g, 'maintain')
      expect((g.domestication ?? 0) > beforeDomestication).toBe(true)
    })
  })

  describe('clearAntiProfileStreakOnWeeklySettlement', () => {
    it('周结算减少连续天数', () => {
      const g = baseGame({ antiProfileDayStreak: 3 })
      Engine.clearAntiProfileStreakOnWeeklySettlement(g)
      expect(g.antiProfileDayStreak).toBe(2)
    })

    it('周结算不会减到0以下', () => {
      const g = baseGame({ antiProfileDayStreak: 0 })
      Engine.clearAntiProfileStreakOnWeeklySettlement(g)
      expect(g.antiProfileDayStreak).toBe(0)
    })
  })
})

describe('方案 A：身体抵押增强系统', () => {
  describe('determineMortgageType', () => {
    it('极高风险债务选择减债型', () => {
      const g = baseGame({ econ: { ...baseGame().econ, debtPrincipal: 60000, delinquency: 4 } })
      const type = Engine.determineMortgageType(g)
      expect(type).toBe('debt_reduction')
    })

    it('低修为选择修行加速型', () => {
      const g = baseGame({ stats: { ...baseGame().stats, faLi: 0.5, rouTi: 1.0 }, econ: { ...baseGame().econ, debtPrincipal: 20000 } })
      const type = Engine.determineMortgageType(g)
      expect(type).toBe('cultivation_boost')
    })
  })

  describe('calculateBodyMortgageBenefits', () => {
    it('减债型返回债务减免', () => {
      const g = baseGame()
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'debt_reduction', g)
      expect(result.type).toBe('debt_reduction')
      expect(result.debtReduction).toBeGreaterThan(0)
      expect(result.cultivationBonus.faLi).toBe(0)
    })

    it('修行加速型返回修行加成', () => {
      const g = baseGame()
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'cultivation_boost', g)
      expect(result.type).toBe('cultivation_boost')
      expect(result.cultivationBonus.faLi).toBeGreaterThan(0)
      expect(result.debtReduction).toBe(0)
    })

    it('准入型返回准入资格和修行加成', () => {
      const g = baseGame()
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'access_grant', g)
      expect(result.type).toBe('access_grant')
      expect(result.accessGained.length).toBeGreaterThan(0)
      expect(result.cultivationBonus.faLi).toBeGreaterThan(0)
    })
  })

  describe('applyBodyMortgageEffect', () => {
    it('减债型减少债务', () => {
      const g = baseGame({ econ: { ...baseGame().econ, debtPrincipal: 30000, collectionFee: 5000, debtInterestAccrued: 2000 } })
      const beforeDebt = Engine.fullDebt(g)
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'debt_reduction', g)
      Engine.applyBodyMortgageEffect(g, result)
      expect(Engine.fullDebt(g)).toBeLessThan(beforeDebt)
    })

    it('修行加速型增加修为', () => {
      const g = baseGame()
      const beforeFaLi = g.stats.faLi
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'cultivation_boost', g)
      Engine.applyBodyMortgageEffect(g, result)
      expect(g.stats.faLi).toBeGreaterThan(beforeFaLi)
    })

    it('降低身体完整性', () => {
      const g = baseGame({ bodyIntegrity: 1.0 })
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'debt_reduction', g)
      Engine.applyBodyMortgageEffect(g, result)
      expect(g.bodyIntegrity).toBeLessThan(1.0)
    })

    it('标记身体评价', () => {
      const g = baseGame({ bodyReputation: 'clean' })
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'debt_reduction', g)
      Engine.applyBodyMortgageEffect(g, result)
      expect(g.bodyReputation).toBe('marked')
    })

    it('添加日志', () => {
      const g = baseGame()
      const beforeLogLen = g.logs.length
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'cultivation_boost', g)
      Engine.applyBodyMortgageEffect(g, result)
      expect(g.logs.length).toBeGreaterThan(beforeLogLen)
    })
  })
})

describe('方案 A：债务锁定系统', () => {
  describe('canTriggerBodyMortgage', () => {
    it('逾期等级>=3时允许触发', () => {
      const g = baseGame({ econ: { ...baseGame().econ, delinquency: 3 } })
      expect(Engine.canTriggerBodyMortgage(g)).toBe(true)
    })

    it('逾期等级<3但现金不足时允许触发', () => {
      const g = baseGame({
        econ: { ...baseGame().econ, cash: 100, delinquency: 1 },
        school: { ...baseGame().school, classTier: '普通班' }
      })
      expect(Engine.canTriggerBodyMortgage(g)).toBe(true)
    })

    it('逾期等级<3且现金充足时不允许触发', () => {
      const g = baseGame({
        econ: { ...baseGame().econ, cash: 50000, delinquency: 0 },
        school: { ...baseGame().school, classTier: '普通班' }
      })
      expect(Engine.canTriggerBodyMortgage(g)).toBe(false)
    })

    it('现金足够时不触发身体抵押事件', () => {
      // 现金远高于最低还款时，身体抵押事件不应该触发
      const g = baseGame({
        econ: { ...baseGame().econ, cash: 100000, delinquency: 0 },
        school: { ...baseGame().school, classTier: '普通班' }
      })
      expect(Engine.canTriggerBodyMortgage(g)).toBe(false)
    })
  })

  describe('isDebtLocked', () => {
    it('未锁定时返回false', () => {
      const g = baseGame({ econ: { ...baseGame().econ, debtLock: 'normal' } })
      expect(Engine.isDebtLocked(g)).toBe(false)
    })

    it('身体抵押锁定后返回true', () => {
      const g = baseGame({ econ: { ...baseGame().econ, debtLock: 'bodyLocked' } })
      expect(Engine.isDebtLocked(g)).toBe(true)
    })

    it('未设置时返回false', () => {
      const g = baseGame()
      expect(Engine.isDebtLocked(g)).toBe(false)
    })
  })

  describe('isCashRepayBlocked', () => {
    it('债务未锁定时不禁用现金还款', () => {
      const g = baseGame({ econ: { ...baseGame().econ, debtLock: 'normal' } })
      expect(Engine.isCashRepayBlocked(g)).toBe(false)
    })

    it('债务锁定后禁用现金还款', () => {
      const g = baseGame({ econ: { ...baseGame().econ, debtLock: 'bodyLocked' } })
      expect(Engine.isCashRepayBlocked(g)).toBe(true)
    })
  })

  describe('getLockedDebtAmount', () => {
    it('返回锁定债务金额', () => {
      const g = baseGame({ econ: { ...baseGame().econ, lockedDebtAmount: 5000 } })
      expect(Engine.getLockedDebtAmount(g)).toBe(5000)
    })

    it('未设置时返回0', () => {
      const g = baseGame()
      expect(Engine.getLockedDebtAmount(g)).toBe(0)
    })
  })

  describe('applyBodyMortgageEffect 债务锁定', () => {
    it('减债型身体抵押后债务被锁定', () => {
      const g = baseGame({
        econ: { ...baseGame().econ, debtPrincipal: 30000, collectionFee: 5000, debtInterestAccrued: 2000 }
      })
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'debt_reduction', g)
      Engine.applyBodyMortgageEffect(g, result)
      expect(g.econ.debtLock).toBe('bodyLocked')
    })

    it('减债型身体抵押记录锁定金额', () => {
      const g = baseGame({
        econ: { ...baseGame().econ, debtPrincipal: 30000, collectionFee: 5000, debtInterestAccrued: 2000 }
      })
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'debt_reduction', g)
      Engine.applyBodyMortgageEffect(g, result)
      expect(g.econ.lockedDebtAmount).toBeGreaterThan(0)
    })

    it('修行加速型身体抵押不锁定债务', () => {
      const g = baseGame()
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'cultivation_boost', g)
      Engine.applyBodyMortgageEffect(g, result)
      expect(g.econ.debtLock).toBeUndefined()
    })

    it('准入型身体抵押不锁定债务', () => {
      const g = baseGame()
      const result = Engine.calculateBodyMortgageBenefits('LeftPalm', 'access_grant', g)
      Engine.applyBodyMortgageEffect(g, result)
      expect(g.econ.debtLock).toBeUndefined()
    })
  })

  describe('shouldTriggerRepaymentEvent 锁定条件', () => {
    it('债务未锁定但现金充足时不触发身体抵押事件', () => {
      const g = baseGame({
        econ: { ...baseGame().econ, cash: 50000, delinquency: 0 }
      })
      const rand = () => 0.5
      const result = Engine.shouldTriggerRepaymentEvent(g, rand)
      expect(result.trigger).toBe(false)
    })

    it('债务未锁定且逾期等级>=3时可能触发', () => {
      const g = baseGame({
        econ: { ...baseGame().econ, cash: 100, delinquency: 3 }
      })
      const rand = () => 0.1
      const result = Engine.shouldTriggerRepaymentEvent(g, rand)
      expect(result.trigger).toBe(true)
    })
  })
})
