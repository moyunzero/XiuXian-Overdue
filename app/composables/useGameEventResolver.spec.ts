import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useGameEventResolver } from './useGameEventResolver'
import { defaultState } from './useGameState'
import type { GameState, SocialNetwork } from '~/types/game'

interface MockGameComputed {
  accumulatedMinPayment: { value: number }
  refreshProfileSnapshot: () => void
}

interface MockStorage {
  activeSlot: { value: string }
  saveToSlot: (slotId: string) => void
}

interface MockEmotionalStorage {
  loadEmotionalMemory: () => any
}

describe('useGameEventResolver', () => {
  let game: ReturnType<typeof ref<GameState>>
  let socialNetwork: ReturnType<typeof ref<SocialNetwork>>
  let gameComputed: MockGameComputed
  let storage: MockStorage
  let emotionalStorage: MockEmotionalStorage

  const mockEnsureSummaryUnlock = vi.fn()

  beforeEach(() => {
    const state = defaultState()
    state.started = true
    state.econ.cash = 5000
    state.econ.debtPrincipal = 8000
    state.econ.lastPaymentDay = 1
    state.pendingEvent = undefined
    game = ref(state)

    socialNetwork = ref({
      npcs: {},
      relationships: {}
    })

    gameComputed = {
      accumulatedMinPayment: ref(760) as any,
      refreshProfileSnapshot: vi.fn()
    }

    storage = {
      activeSlot: ref('autosave') as any,
      saveToSlot: vi.fn()
    }

    emotionalStorage = {
      loadEmotionalMemory: vi.fn().mockReturnValue({
        sessions: [],
        aggregateMetrics: {
          totalSessions: 0,
          averageDebtPerSession: 0,
          averageCashPerSession: 0,
          mostCommonBackground: null,
          mostCommonTalent: null,
          totalPlaytime: 0,
          lastSessionAt: 0
        },
        personalityProfile: {
          riskTolerance: 'moderate' as const,
          complianceTendency: 'adaptive' as const,
          resourceStrategy: 'balanced' as const,
          bodyAutonomyValue: 'medium' as const,
          stressResponse: 'negotiator' as const
        },
        version: 1
      })
    }
  })

  const createResolver = () => useGameEventResolver(game, gameComputed as any, storage as any, emotionalStorage as any, socialNetwork as any)

  describe('resolveEvent', () => {
    it('4.2.1: should handle body part repayment options', () => {
      const { resolveEvent } = createResolver()
      game.value.pendingEvent = {
        title: '测试事件',
        body: '测试',
        options: [{ id: 'repay_leftpalm', label: '偿还左手', tone: 'warn' as const }],
        mandatory: false
      }
      resolveEvent('repay_leftpalm', mockEnsureSummaryUnlock)
      expect(game.value.pendingEvent).toBeUndefined()
    })

    it('4.2.2: should handle forced_tuna contract backlash', () => {
      const { resolveEvent } = createResolver()
      game.value.contract.active = true
      game.value.pendingEvent = {
        title: '契约反噬',
        body: '被迫吐纳',
        options: [{ id: 'forced_tuna', label: '被迫吐纳', tone: 'warn' as const }],
        mandatory: true
      }
      const initialFaLi = game.value.stats.faLi
      resolveEvent('forced_tuna', mockEnsureSummaryUnlock)
      expect(game.value.stats.faLi).toBeGreaterThan(initialFaLi)
    })

    it('4.2.2: should handle forced_study contract backlash', () => {
      const { resolveEvent } = createResolver()
      game.value.contract.active = true
      game.value.pendingEvent = {
        title: '契约反噬',
        body: '被迫刷题',
        options: [{ id: 'forced_study', label: '被迫刷题', tone: 'warn' as const }],
        mandatory: true
      }
      const initialFaLi = game.value.stats.faLi
      resolveEvent('forced_study', mockEnsureSummaryUnlock)
      expect(game.value.stats.faLi).toBeGreaterThan(initialFaLi)
    })

    it('4.2.2: should handle defy option', () => {
      const { resolveEvent } = createResolver()
      game.value.contract.active = true
      game.value.pendingEvent = {
        title: '契约反噬',
        body: '抵抗',
        options: [{ id: 'defy', label: '硬抗', tone: 'danger' as const }],
        mandatory: true
      }
      const initialFocus = game.value.stats.focus
      resolveEvent('defy', mockEnsureSummaryUnlock)
      expect(game.value.stats.focus).toBeLessThan(initialFocus)
    })

    it('should handle adjust_behavior option', () => {
      const { resolveEvent } = createResolver()
      game.value.pendingEvent = {
        title: '反画像',
        body: '调整行为',
        options: [{ id: 'adjust_behavior', label: '调整行为', tone: 'warn' as const }],
        mandatory: false
      }
      resolveEvent('adjust_behavior', mockEnsureSummaryUnlock)
      expect(game.value.pendingEvent).toBeUndefined()
    })

    it('should handle maintain_resistance option', () => {
      const { resolveEvent } = createResolver()
      game.value.pendingEvent = {
        title: '反画像',
        body: '维持抵抗',
        options: [{ id: 'maintain_resistance', label: '维持抵抗', tone: 'warn' as const }],
        mandatory: false
      }
      resolveEvent('maintain_resistance', mockEnsureSummaryUnlock)
      expect(game.value.pendingEvent).toBeUndefined()
    })

    it('should call ensureSummaryUnlock', () => {
      const { resolveEvent } = createResolver()
      game.value.pendingEvent = {
        title: '测试',
        body: '测试',
        options: [{ id: 'ending_continue', label: '继续', tone: 'warn' as const }],
        mandatory: false
      }
      resolveEvent('ending_continue', mockEnsureSummaryUnlock)
      expect(mockEnsureSummaryUnlock).toHaveBeenCalledWith(game.value)
    })
  })

  describe('computeHiddenContributions', () => {
    it('should return empty when hiddenVariables is undefined', () => {
      const { computeHiddenContributions } = createResolver()
      game.value.hiddenVariables = undefined
      const result = computeHiddenContributions(game.value)
      expect(result).toEqual({})
    })

    it('should calculate borrowTrauma contribution', () => {
      const { computeHiddenContributions } = createResolver()
      game.value.hiddenVariables = {
        emotionalResidues: { borrowTrauma: 50, complianceFatigue: 0, bodyConcern: 0 },
        environmentalFactors: { marketConditions: 0, institutionalScrutiny: 0 },
        narrativeMomentum: { crisisTendency: 0, stabilityTendency: 0 }
      }
      const result = computeHiddenContributions(game.value)
      expect(result.borrowTrauma).toBe(0.5)
    })

    it('should calculate complianceFatigue contribution', () => {
      const { computeHiddenContributions } = createResolver()
      game.value.hiddenVariables = {
        emotionalResidues: { borrowTrauma: 0, complianceFatigue: 30, bodyConcern: 0 },
        environmentalFactors: { marketConditions: 0, institutionalScrutiny: 0 },
        narrativeMomentum: { crisisTendency: 0, stabilityTendency: 0 }
      }
      const result = computeHiddenContributions(game.value)
      expect(result.complianceFatigue).toBe(0.3)
    })

    it('should calculate crisisTendency contribution', () => {
      const { computeHiddenContributions } = createResolver()
      game.value.hiddenVariables = {
        emotionalResidues: { borrowTrauma: 0, complianceFatigue: 0, bodyConcern: 0 },
        environmentalFactors: { marketConditions: 0, institutionalScrutiny: 0 },
        narrativeMomentum: { crisisTendency: 40, stabilityTendency: 0 }
      }
      const result = computeHiddenContributions(game.value)
      expect(result.crisisTendency).toBe(0.4)
    })
  })

  describe('applyEventEffects', () => {
    it('should apply stat effects', () => {
      const { applyEventEffects } = createResolver()
      const effects = [{ kind: 'stat' as const, target: 'fatigue', delta: 10 }]
      const initialFatigue = game.value.stats.fatigue
      applyEventEffects(game.value, effects)
      expect(game.value.stats.fatigue).toBe(initialFatigue + 10)
    })

    it('should clamp fatigue and focus to 0-100', () => {
      const { applyEventEffects } = createResolver()
      const effects = [
        { kind: 'stat' as const, target: 'fatigue', delta: 200 },
        { kind: 'stat' as const, target: 'focus', delta: -200 }
      ]
      applyEventEffects(game.value, effects)
      expect(game.value.stats.fatigue).toBe(100)
      expect(game.value.stats.focus).toBe(0)
    })

    it('should apply econ effects', () => {
      const { applyEventEffects } = createResolver()
      const effects = [{ kind: 'econ' as const, target: 'cash', delta: -1000 }]
      applyEventEffects(game.value, effects)
      expect(game.value.econ.cash).toBe(4000)
    })

    it('should apply debt addPrincipal effects', () => {
      const { applyEventEffects } = createResolver()
      const effects = [{ kind: 'debt' as const, mode: 'addPrincipal' as const, amount: 500 }]
      applyEventEffects(game.value, effects)
      expect(game.value.econ.debtPrincipal).toBe(8500)
    })

    it('should apply debt addInterest effects', () => {
      const { applyEventEffects } = createResolver()
      const effects = [{ kind: 'debt' as const, mode: 'addInterest' as const, amount: 200 }]
      applyEventEffects(game.value, effects)
      expect(game.value.econ.debtInterestAccrued).toBeGreaterThan(0)
    })

    it('should apply contract progress effects', () => {
      const { applyEventEffects } = createResolver()
      game.value.contract.progress = 0
      const effects = [{ kind: 'contract' as const, target: 'progress' as const, delta: 10 }]
      applyEventEffects(game.value, effects)
      expect(game.value.contract.progress).toBe(10)
    })

    it('should apply school classTier effects', () => {
      const { applyEventEffects } = createResolver()
      const effects = [{ kind: 'school' as const, target: 'classTier' as const, value: '示范班' as const }]
      applyEventEffects(game.value, effects)
      expect(game.value.school.classTier).toBe('示范班')
    })

    it('should suppress log effects when option is set', () => {
      const { applyEventEffects } = createResolver()
      const logLengthBefore = game.value.logs.length
      const effects = [{ kind: 'log' as const, title: 'Test', detail: 'Test', tone: 'info' as const }]
      applyEventEffects(game.value, effects, { suppressLogEffects: true })
      expect(game.value.logs.length).toBe(logLengthBefore)
    })
  })
})
