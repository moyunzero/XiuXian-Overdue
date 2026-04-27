import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useEmotionalMemoryStorage } from './useEmotionalMemoryStorage'
import type { GameState } from '~/types/game'
import { defaultState } from './useGameState'

const EMOTIONAL_MEMORY_STORAGE_KEY = 'kunxu_sim_emotional_memory_v1'

describe('useEmotionalMemoryStorage', () => {
  let storage: ReturnType<typeof useEmotionalMemoryStorage>

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    })
    storage = useEmotionalMemoryStorage()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('sessionStartDay', () => {
    it('2.2.2: should initialize with default value of 1', () => {
      expect(storage.sessionStartDay.value).toBe(1)
    })

    it('should update session start day', () => {
      storage.updateSessionStartDay(10)
      expect(storage.sessionStartDay.value).toBe(10)
    })
  })

  describe('sessionAntiProfileStreakMax', () => {
    it('should initialize with default value of 0', () => {
      expect(storage.sessionAntiProfileStreakMax.value).toBe(0)
    })

    it('should update if new streak is higher', () => {
      storage.updateSessionAntiProfileStreakMax(5)
      expect(storage.sessionAntiProfileStreakMax.value).toBe(5)
    })

    it('should not update if new streak is lower', () => {
      storage.updateSessionAntiProfileStreakMax(10)
      storage.updateSessionAntiProfileStreakMax(5)
      expect(storage.sessionAntiProfileStreakMax.value).toBe(10)
    })
  })

  describe('loadEmotionalMemory', () => {
    it('2.2.1: should call localStorage.getItem with correct key', () => {
      storage.loadEmotionalMemory()
      expect(localStorage.getItem).toHaveBeenCalledWith(EMOTIONAL_MEMORY_STORAGE_KEY)
    })

    it('should return initEmotionalMemory when localStorage returns null', () => {
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
      const memory = storage.loadEmotionalMemory()
      expect(memory).toBeDefined()
    })

    it('should parse and return valid memory when localStorage has data', () => {
      const mockMemory = {
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
      }
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(JSON.stringify(mockMemory))
      const memory = storage.loadEmotionalMemory()
      expect(memory.version).toBe(1)
    })

    it('should return initEmotionalMemory on parse error', () => {
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('invalid json')
      const memory = storage.loadEmotionalMemory()
      expect(memory).toBeDefined()
    })
  })

  describe('saveEmotionalMemory', () => {
    it('2.2.1: should call localStorage.setItem with correct key and stringified data', () => {
      const mockMemory = {
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
      }
      storage.saveEmotionalMemory(mockMemory)
      expect(localStorage.setItem).toHaveBeenCalledWith(
        EMOTIONAL_MEMORY_STORAGE_KEY,
        JSON.stringify(mockMemory)
      )
    })

    it('should handle localStorage errors gracefully', () => {
      ;(localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage full')
      })
      expect(() => storage.saveEmotionalMemory({ sessions: [] } as any)).not.toThrow()
    })
  })

  describe('recordCurrentSession', () => {
    it('2.2.2: should not record if game is not started', () => {
      const game = { ...defaultState(), started: false } as GameState
      storage.recordCurrentSession(game)
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should not record if sessionMetrics is missing', () => {
      const game = { ...defaultState(), started: true, sessionMetrics: undefined } as GameState
      storage.recordCurrentSession(game)
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should record session when game is valid', () => {
      const game = {
        ...defaultState(),
        started: true,
        sessionMetrics: {
          actionCounts: { study: 5 },
          borrowCount: 0,
          bodyPartRepaymentCount: 0,
          antiProfileActionCount: 0,
          restCount: 2,
          startTime: Date.now()
        }
      } as GameState
      storage.recordCurrentSession(game)
      expect(localStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('resetSessionTracking', () => {
    it('should reset all session tracking values', () => {
      storage.updateSessionStartDay(50)
      storage.updateSessionAntiProfileStreakMax(20)

      storage.resetSessionTracking()

      expect(storage.sessionStartDay.value).toBe(1)
      expect(storage.sessionAntiProfileStreakMax.value).toBe(0)
    })
  })
})
