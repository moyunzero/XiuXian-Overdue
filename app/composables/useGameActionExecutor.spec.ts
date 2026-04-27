import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useGameActionExecutor } from './useGameActionExecutor'
import { defaultState } from './useGameState'
import type { GameState, ActionId } from '~/types/game'

interface MockGameComputed {
  minPayment: { value: number }
  refreshProfileSnapshot: () => void
}

interface MockStorage {
  activeSlot: { value: string }
  saveToSlot: (slotId: string) => void
}

interface MockEmotionalStorage {
  sessionAntiProfileStreakMax: { value: number }
  sessionStartTime: { value: number }
}

interface MockEventResolver {
  randomPoolAfterAction: (g: GameState, rand: () => number) => any
  computeHiddenContributions: (g: GameState) => Record<string, number>
}

interface MockDayCycle {
  performEndDay: (g: GameState, minPayment: number, applyWeeklyCollectionFee: (g: GameState) => void) => void
}

describe('useGameActionExecutor', () => {
  let game: ReturnType<typeof ref<GameState>>
  let gameComputed: MockGameComputed
  let storage: MockStorage
  let emotionalStorage: MockEmotionalStorage
  let eventResolver: MockEventResolver
  let dayCycle: MockDayCycle
  let applyWeeklyCollectionFee: (g: GameState) => void
  let ensureSummaryUnlock: (g: GameState) => void
  let recordGameAction: any

  const mockSaveToSlot = vi.fn()
  const mockRefreshProfileSnapshot = vi.fn()
  const mockPerformEndDay = vi.fn()
  const mockApplyWeeklyCollectionFee = vi.fn()
  const mockEnsureSummaryUnlock = vi.fn()
  const mockRandomPoolAfterAction = vi.fn().mockReturnValue({ title: 'Random Event', body: 'Test', options: [], mandatory: false })
  const mockComputeHiddenContributions = vi.fn().mockReturnValue({})
  const mockRecordGameAction = vi.fn()

  beforeEach(() => {
    const state = defaultState()
    state.started = true
    state.econ.cash = 5000
    state.econ.debtPrincipal = 8000
    state.school.day = 1
    state.school.slot = 'morning'
    state.stats.fatigue = 20
    state.stats.focus = 60
    state.stats.faLi = 7.0
    state.stats.rouTi = 0.6
    state.bodyIntegrity = 1.0
    state.pendingEvent = undefined
    state.contract.active = false
    state.daySlotActions = {}
    state.contract.vigilance = 35
    game = ref(state)

    gameComputed = {
      minPayment: ref(760) as any,
      refreshProfileSnapshot: mockRefreshProfileSnapshot
    }

    storage = {
      activeSlot: ref('autosave') as any,
      saveToSlot: mockSaveToSlot
    }

    emotionalStorage = {
      sessionAntiProfileStreakMax: { value: 0 },
      sessionStartTime: { value: Date.now() }
    }

    eventResolver = {
      randomPoolAfterAction: mockRandomPoolAfterAction,
      computeHiddenContributions: mockComputeHiddenContributions
    }

    dayCycle = {
      performEndDay: mockPerformEndDay
    }

    applyWeeklyCollectionFee = mockApplyWeeklyCollectionFee
    ensureSummaryUnlock = mockEnsureSummaryUnlock
    recordGameAction = mockRecordGameAction

    vi.clearAllMocks()
  })

  const createActionExecutor = () =>
    useGameActionExecutor(
      game,
      gameComputed as any,
      storage as any,
      emotionalStorage as any,
      eventResolver as any,
      dayCycle as any,
      applyWeeklyCollectionFee,
      ensureSummaryUnlock,
      recordGameAction
    )

  describe('act', () => {
    it('5.2.1: should block action when pendingEvent exists', () => {
      const { act } = createActionExecutor()
      game.value.pendingEvent = { title: 'Test', body: 'Test', options: [], mandatory: false }

      act('study' as ActionId)

      expect(game.value.daySlotActions['morning']).toBeUndefined()
      expect(mockSaveToSlot).not.toHaveBeenCalled()
    })

    it('5.2.1: should block action when game not started', () => {
      const { act } = createActionExecutor()
      game.value.started = false

      act('study' as ActionId)

      expect(game.value.daySlotActions['morning']).toBeUndefined()
    })

    it('5.2.2: should trigger contract backlash and set pendingEvent', () => {
      const { act } = createActionExecutor()
      game.value.contract.active = true
      game.value.contract.progress = 0
      game.value.contract.vigilance = 35
      game.value.contract.lastTriggerDay = 0
      game.value.contract.lastTriggerSlot = 'none'

      act('study' as ActionId)

      expect(game.value.pendingEvent).toBeDefined()
      expect(game.value.contract.lastTriggerDay).toBe(1)
      expect(game.value.contract.lastTriggerSlot).toBe('morning')
    })

    it('5.2.2: should set pendingEvent when rest triggers contract', () => {
      const { act } = createActionExecutor()
      game.value.contract.active = true
      game.value.contract.progress = 0
      game.value.contract.vigilance = 35
      game.value.contract.lastTriggerDay = 0
      game.value.contract.lastTriggerSlot = 'none'

      act('rest' as ActionId)

      expect(game.value.pendingEvent).toBeDefined()
    })

    it('5.2.3: should advance slot from morning to afternoon', () => {
      const { act } = createActionExecutor()
      game.value.school.slot = 'morning'

      act('study' as ActionId)

      expect(game.value.school.slot).toBe('afternoon')
    })

    it('5.2.3: should advance slot from afternoon to night', () => {
      const { act } = createActionExecutor()
      game.value.school.slot = 'afternoon'

      act('study' as ActionId)

      expect(game.value.school.slot).toBe('night')
    })

    it('5.2.3: should call performEndDay when slot is night', () => {
      const { act } = createActionExecutor()
      game.value.school.slot = 'night'
      game.value.daySlotActions = { morning: 'study', afternoon: 'study' }

      act('study' as ActionId)

      expect(mockPerformEndDay).toHaveBeenCalled()
    })

    it('5.2.4: should initialize sessionMetrics on first action', () => {
      const { act } = createActionExecutor()
      game.value.sessionMetrics = undefined

      act('study' as ActionId)

      expect(game.value.sessionMetrics).toBeDefined()
      expect(game.value.sessionMetrics!.actionCounts['study']).toBe(1)
    })

    it('5.2.4: should increment existing action count', () => {
      const { act } = createActionExecutor()
      game.value.sessionMetrics = {
        actionCounts: { study: 2 },
        borrowCount: 0,
        bodyPartRepaymentCount: 0,
        antiProfileActionCount: 0,
        restCount: 0,
        startTime: Date.now()
      }

      act('study' as ActionId)

      expect(game.value.sessionMetrics!.actionCounts['study']).toBe(3)
    })

    it('5.2.4: should increment restCount when action is rest', () => {
      const { act } = createActionExecutor()
      game.value.sessionMetrics = {
        actionCounts: {},
        borrowCount: 0,
        bodyPartRepaymentCount: 0,
        antiProfileActionCount: 0,
        restCount: 0,
        startTime: Date.now()
      }

      act('rest' as ActionId)

      expect(game.value.sessionMetrics!.restCount).toBe(1)
    })

    it('should record action in daySlotActions', () => {
      const { act } = createActionExecutor()
      game.value.school.slot = 'morning'

      act('study' as ActionId)

      expect(game.value.daySlotActions['morning']).toBe('study')
    })

    it('should call recordGameAction with correct parameters', () => {
      const { act } = createActionExecutor()
      game.value.school.slot = 'morning'

      act('study' as ActionId)

      expect(mockRecordGameAction).toHaveBeenCalled()
      const callArgs = mockRecordGameAction.mock.calls[0]
      expect(callArgs[0]).toBe(1)
      expect(callArgs[1]).toBe('morning')
      expect(callArgs[2]).toBe('study')
    })

    it('should call ensureSummaryUnlock after action', () => {
      const { act } = createActionExecutor()

      act('study' as ActionId)

      expect(mockEnsureSummaryUnlock).toHaveBeenCalled()
    })

    it('should call saveToSlot after action', () => {
      const { act } = createActionExecutor()

      act('study' as ActionId)

      expect(mockSaveToSlot).toHaveBeenCalledWith('autosave')
    })

    it('should call refreshProfileSnapshot after action', () => {
      const { act } = createActionExecutor()

      act('study' as ActionId)

      expect(mockRefreshProfileSnapshot).toHaveBeenCalled()
    })

    it('should set pendingEvent after action', () => {
      const { act } = createActionExecutor()

      act('study' as ActionId)

      expect(game.value.pendingEvent).toBeDefined()
    })

    it('should add meal subsidy cash in morning slot', () => {
      const { act } = createActionExecutor()
      game.value.school.slot = 'morning'
      game.value.school.perks.mealSubsidy = 15
      const cashBefore = game.value.econ.cash

      act('study' as ActionId)

      expect(game.value.econ.cash).toBe(cashBefore + 15)
    })
  })
})