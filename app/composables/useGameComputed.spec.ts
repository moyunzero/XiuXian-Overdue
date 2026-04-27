import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useGameComputed } from './useGameComputed'
import { defaultState } from './useGameState'
import type { GameState } from '~/types/game'

describe('useGameComputed', () => {
  let game: ReturnType<typeof ref<GameState>>

  beforeEach(() => {
    const state = defaultState()
    state.started = true
    state.econ.cash = 5000
    state.econ.collectionFee = 1000
    state.econ.debtPrincipal = 8000
    state.econ.debtInterestAccrued = 500
    state.econ.delinquency = 0
    state.school.classTier = '普通班'
    state.school.perks = { mealSubsidy: 20, focusBonus: 5 }
    state.logs = []
    state.profileSnapshot = {
      profile: {
        financialRisk: 'medium',
        educationCredit: 'preferred',
        compliance: 'obedient',
        bodyAsset: 'intact',
        tags: []
      },
      lastProfileUpdateDay: 1,
      profileVersion: 1
    }
    game = ref(state)
  })

  describe('totalDebt', () => {
    it('1.2.1: should calculate total debt correctly', () => {
      const { totalDebt } = useGameComputed(game)
      expect(totalDebt.value).toBe(9500)
    })

    it('should return 0 when all debt components are 0', () => {
      game.value.econ.collectionFee = 0
      game.value.econ.debtPrincipal = 0
      game.value.econ.debtInterestAccrued = 0
      const { totalDebt } = useGameComputed(game)
      expect(totalDebt.value).toBe(0)
    })

    it('should handle negative values by returning max(0, result)', () => {
      game.value.econ.collectionFee = -1000
      game.value.econ.debtPrincipal = 500
      game.value.econ.debtInterestAccrued = 500
      const { totalDebt } = useGameComputed(game)
      expect(totalDebt.value).toBe(0)
    })
  })

  describe('profileDigest', () => {
    it('1.2.2: should generate profile digest with correct structure', () => {
      const { profileDigest } = useGameComputed(game)
      expect(profileDigest.value).toBeDefined()
      expect(profileDigest.value.primaryLevel).toBeDefined()
      expect(profileDigest.value.primaryLabel).toBeDefined()
      expect(profileDigest.value.tagsSummary).toBeDefined()
      expect(profileDigest.value.recentChanges).toBeDefined()
    })

    it('should include primary level in digest', () => {
      const { profileDigest } = useGameComputed(game)
      expect(typeof profileDigest.value.primaryLevel).toBe('string')
      expect(profileDigest.value.primaryLevel.length).toBeGreaterThan(0)
    })

    it('should include primary label combining dimension and level', () => {
      const { profileDigest } = useGameComputed(game)
      expect(profileDigest.value.primaryLabel).toContain('：')
    })

    it('should track recent changes when profile changes', () => {
      const { profileDigest } = useGameComputed(game)
      game.value.profileSnapshot!.profile.financialRisk = 'high'
      const updatedDigest = useGameComputed(game).profileDigest
      expect(updatedDigest.value.recentChanges).toBeDefined()
    })
  })

  describe('creditLimit', () => {
    it('1.2.3: should calculate credit limit based on total debt', () => {
      game.value.econ.collectionFee = 0
      game.value.econ.debtPrincipal = 10000
      game.value.econ.debtInterestAccrued = 0
      const { totalDebt } = useGameComputed(game)
      const creditLimit = Math.max(2000, 50000 - totalDebt.value)
      expect(creditLimit).toBe(40000)
    })

    it('should have minimum credit limit of 2000', () => {
      game.value.econ.collectionFee = 0
      game.value.econ.debtPrincipal = 60000
      game.value.econ.debtInterestAccrued = 0
      const { totalDebt } = useGameComputed(game)
      const creditLimit = Math.max(2000, 50000 - totalDebt.value)
      expect(creditLimit).toBe(2000)
    })

    it('should decrease credit limit as debt increases', () => {
      game.value.econ.collectionFee = 0
      game.value.econ.debtPrincipal = 10000
      game.value.econ.debtInterestAccrued = 0
      const computed1 = useGameComputed(game)
      const debt1 = computed1.totalDebt.value
      const limit1 = Math.max(2000, 50000 - debt1)

      game.value.econ.debtPrincipal = 30000
      const computed2 = useGameComputed(game)
      const debt2 = computed2.totalDebt.value
      const limit2 = Math.max(2000, 50000 - debt2)

      expect(limit2).toBeLessThan(limit1)
    })
  })

  describe('minPayment', () => {
    it('should calculate minimum payment based on debt and delinquency', () => {
      const { minPayment } = useGameComputed(game)
      expect(minPayment.value).toBeGreaterThanOrEqual(280)
    })

    it('should increase with delinquency level', () => {
      game.value.econ.delinquency = 0
      const { minPayment: payment1 } = useGameComputed(game)

      game.value.econ.delinquency = 2
      const { minPayment: payment2 } = useGameComputed(game)

      expect(payment2.value).toBeGreaterThanOrEqual(payment1.value)
    })
  })

  describe('classPressureDigest', () => {
    it('should return weekly class change status', () => {
      const { classPressureDigest } = useGameComputed(game)
      expect(classPressureDigest.value.weeklyClassChange).toBeDefined()
    })

    it('should return next week perks info', () => {
      const { classPressureDigest } = useGameComputed(game)
      expect(classPressureDigest.value.nextWeekPerks).toContain('餐补')
      expect(classPressureDigest.value.nextWeekPerks).toContain('专注加成')
    })

    it('should return risk shift summary with multipliers', () => {
      const { classPressureDigest } = useGameComputed(game)
      expect(classPressureDigest.value.riskShiftSummary).toContain('利率×')
      expect(classPressureDigest.value.riskShiftSummary).toContain('最低周还款×')
      expect(classPressureDigest.value.riskShiftSummary).toContain('催收权重×')
    })
  })

  describe('nextLabel and remainingSlots', () => {
    it('should return correct slot label', () => {
      game.value.school.slot = 'morning'
      const { nextLabel } = useGameComputed(game)
      expect(nextLabel.value).toBe('清晨')

      game.value.school.slot = 'afternoon'
      const { nextLabel: nextLabel2 } = useGameComputed(game)
      expect(nextLabel2.value).toBe('午后')

      game.value.school.slot = 'night'
      const { nextLabel: nextLabel3 } = useGameComputed(game)
      expect(nextLabel3.value).toBe('深夜')
    })

    it('should calculate remaining slots correctly', () => {
      game.value.school.slot = 'morning'
      const { remainingSlots } = useGameComputed(game)
      expect(remainingSlots.value).toBe(3)

      game.value.school.slot = 'afternoon'
      const { remainingSlots: slots2 } = useGameComputed(game)
      expect(slots2.value).toBe(2)

      game.value.school.slot = 'night'
      const { remainingSlots: slots3 } = useGameComputed(game)
      expect(slots3.value).toBe(1)
    })
  })

  describe('refreshProfileSnapshot', () => {
    it('should update profile snapshot with incremented version', () => {
      const { refreshProfileSnapshot } = useGameComputed(game)
      const initialVersion = game.value.profileSnapshot?.profileVersion ?? 0

      refreshProfileSnapshot()

      expect(game.value.profileSnapshot?.profileVersion).toBe(initialVersion + 1)
      expect(game.value.profileSnapshot?.lastProfileUpdateDay).toBe(game.value.school.day)
    })

    it('should set initial version when profileSnapshot is undefined', () => {
      game.value.profileSnapshot = undefined
      const { refreshProfileSnapshot } = useGameComputed(game)

      refreshProfileSnapshot()

      expect(game.value.profileSnapshot?.profileVersion).toBe(1)
    })
  })
})
