import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useGameEconomyActions } from './useGameEconomyActions'
import { defaultState } from './useGameState'
import type { GameState } from '~/types/game'

describe('useGameEconomyActions', () => {
  let game: ReturnType<typeof ref<GameState>>
  let gameComputed: ReturnType<typeof useGameEconomyActions extends (g: any, c: infer C, s: any) => any ? C : never>
  let storage: ReturnType<typeof useGameEconomyActions extends (g: any, c: any, s: infer S) => any ? S : never>

  beforeEach(() => {
    const state = defaultState()
    state.started = true
    state.econ.cash = 5000
    state.econ.collectionFee = 1000
    state.econ.debtPrincipal = 8000
    state.econ.debtInterestAccrued = 500
    state.econ.delinquency = 0
    state.econ.lastPaymentDay = 1
    game = ref(state)

    gameComputed = {
      totalDebt: ref(9500),
      minPayment: ref(760),
      refreshProfileSnapshot: vi.fn()
    }

    storage = {
      activeSlot: ref('autosave'),
      saveToSlot: vi.fn()
    }
  })

  const createActions = () => useGameEconomyActions(game, gameComputed, storage)

  describe('creditLimit', () => {
    it('3.2.3: should calculate credit limit based on total debt', () => {
      const { creditLimit } = createActions()
      expect(creditLimit(10000)).toBe(40000)
    })

    it('3.2.3: should have minimum credit limit of 2000', () => {
      const { creditLimit } = createActions()
      expect(creditLimit(60000)).toBe(2000)
    })

    it('3.2.3: should decrease as debt increases', () => {
      const { creditLimit } = createActions()
      expect(creditLimit(30000)).toBeLessThan(creditLimit(10000))
    })
  })

  describe('borrow', () => {
    it('3.2.1: should increase debt and cash by the borrowed amount', () => {
      const { borrow } = createActions()
      game.value.econ.debtPrincipal = 8000
      game.value.econ.cash = 5000
      borrow(1000)
      expect(game.value.econ.debtPrincipal).toBe(9000)
      expect(game.value.econ.cash).toBe(6000)
    })

    it('3.2.1: should ignore negative amounts', () => {
      const { borrow } = createActions()
      game.value.econ.debtPrincipal = 8000
      borrow(-1000)
      expect(game.value.econ.debtPrincipal).toBe(8000)
    })

    it('3.2.1: should ignore zero amount', () => {
      const { borrow } = createActions()
      game.value.econ.debtPrincipal = 8000
      borrow(0)
      expect(game.value.econ.debtPrincipal).toBe(8000)
    })

    it('3.2.1: should reject borrowing exceeding credit limit', () => {
      const { borrow } = createActions()
      gameComputed.totalDebt.value = 48000
      borrow(5000)
      expect(game.value.logs[0].title).toBe('额度不足')
      expect(storage.saveToSlot).toHaveBeenCalled()
    })

    it('should apply 1.2x multiplier when bodyReputation is marked', () => {
      const { borrow } = createActions()
      game.value.bodyReputation = 'marked'
      game.value.econ.debtPrincipal = 8000
      borrow(1000)
      expect(game.value.econ.debtPrincipal).toBe(9200)
    })

    it('should increment borrowCount in sessionMetrics', () => {
      const { borrow } = createActions()
      game.value.sessionMetrics = {
        actionCounts: {},
        borrowCount: 0,
        bodyPartRepaymentCount: 0,
        antiProfileActionCount: 0,
        restCount: 0,
        startTime: Date.now()
      }
      borrow(500)
      expect(game.value.sessionMetrics.borrowCount).toBe(1)
    })
  })

  describe('repay', () => {
    it('3.2.2: should decrease cash when repaying', () => {
      const { repay } = createActions()
      game.value.econ.cash = 5000
      game.value.econ.debtPrincipal = 8000
      repay(1000)
      expect(game.value.econ.cash).toBe(4000)
    })

    it('3.2.2: should decrease debt principal', () => {
      const { repay } = createActions()
      game.value.econ.cash = 5000
      game.value.econ.debtPrincipal = 8000
      game.value.econ.debtInterestAccrued = 0
      game.value.econ.collectionFee = 0
      repay(1000)
      expect(game.value.econ.debtPrincipal).toBeLessThan(8000)
    })

    it('3.2.2: should ignore when cash is 0', () => {
      const { repay } = createActions()
      game.value.econ.cash = 0
      repay(1000)
      expect(storage.saveToSlot).not.toHaveBeenCalled()
    })

    it('3.2.2: should ignore negative amounts', () => {
      const { repay } = createActions()
      game.value.econ.cash = 5000
      repay(-1000)
      expect(game.value.econ.cash).toBe(5000)
    })

    it('3.2.2: should reject repayment when debt is locked', () => {
      const { repay } = createActions()
      game.value.econ.debtLock = 'bodyLocked'
      repay(1000)
      expect(game.value.logs[0].title).toBe('还款被拒绝')
    })

    it('3.2.3: should decrease delinquency level when payment meets minimum', () => {
      const { repay } = createActions()
      game.value.econ.cash = 10000
      game.value.econ.delinquency = 2
      gameComputed.minPayment.value = 500
      repay(600)
      expect(game.value.econ.delinquency).toBe(1)
    })

    it('3.2.3: should not decrease delinquency when payment is below minimum', () => {
      const { repay } = createActions()
      game.value.econ.cash = 10000
      game.value.econ.delinquency = 2
      gameComputed.minPayment.value = 1000
      repay(100)
      expect(game.value.econ.delinquency).toBe(2)
    })

    it('should update lastPaymentDay', () => {
      const { repay } = createActions()
      game.value.econ.cash = 5000
      game.value.econ.lastPaymentDay = 1
      game.value.school.day = 10
      repay(500)
      expect(game.value.econ.lastPaymentDay).toBe(10)
    })
  })
})
