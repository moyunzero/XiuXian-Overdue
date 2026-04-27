import { describe, it, expect, beforeEach } from 'vitest'
import type {
  EmotionalMemory,
  SessionSummary,
  PersonalityProfile,
  HiddenModifiers,
  GameState,
  RoutePreference
} from '~/types/game'
import {
  createDefaultEmotionalMemory,
  createDefaultAggregateMetrics,
  initEmotionalMemory,
  recordSession,
  buildPersonalityProfile,
  getHiddenModifiers,
  pruneMemory,
  createSessionSummaryFromGameState,
  applyMemoryToState,
  mergeEmotionalMemory,
  validateEmotionalMemory,
  exportEmotionalMemory,
  importEmotionalMemory,
  EMOTIONAL_MEMORY_VERSION,
  DEFAULT_MAX_SESSIONS
} from '~/logic/emotionalMemoryLayer'

describe('emotionalMemoryLayer', () => {
  describe('createDefaultEmotionalMemory', () => {
    it('should create a valid default emotional memory', () => {
      const memory = createDefaultEmotionalMemory()

      expect(memory.version).toBe(EMOTIONAL_MEMORY_VERSION)
      expect(memory.sessions).toEqual([])
      expect(memory.aggregateMetrics.totalSessions).toBe(0)
      expect(memory.lastUpdated).toBeDefined()
      expect(typeof memory.lastUpdated).toBe('number')
    })

    it('should have correct default aggregate metrics', () => {
      const memory = createDefaultEmotionalMemory()
      const metrics = memory.aggregateMetrics

      expect(metrics.totalSessions).toBe(0)
      expect(metrics.totalActions).toBe(0)
      expect(metrics.avgBorrowRate).toBe(0)
      expect(metrics.avgScoreRouteRate).toBe(0)
      expect(metrics.avgBodyRepaymentRate).toBe(0)
      expect(metrics.avgContractAcceptRate).toBe(0)
      expect(metrics.avgRestRate).toBe(0)
      expect(metrics.antiProfileStreakAvg).toBe(0)
    })
  })

  describe('createDefaultAggregateMetrics', () => {
    it('should create default metrics with all zeros', () => {
      const metrics = createDefaultAggregateMetrics()

      expect(metrics.totalSessions).toBe(0)
      expect(metrics.totalActions).toBe(0)
      expect(metrics.avgBorrowRate).toBe(0)
      expect(metrics.avgScoreRouteRate).toBe(0)
      expect(metrics.avgBodyRepaymentRate).toBe(0)
      expect(metrics.avgContractAcceptRate).toBe(0)
      expect(metrics.avgRestRate).toBe(0)
      expect(metrics.antiProfileStreakAvg).toBe(0)
    })
  })

  describe('initEmotionalMemory', () => {
    it('should return default memory when stored is null', () => {
      const memory = initEmotionalMemory(null)

      expect(memory.version).toBe(EMOTIONAL_MEMORY_VERSION)
      expect(memory.sessions).toEqual([])
    })

    it('should return default memory when stored is undefined', () => {
      const memory = initEmotionalMemory(undefined)

      expect(memory.version).toBe(EMOTIONAL_MEMORY_VERSION)
      expect(memory.sessions).toEqual([])
    })

    it('should return default memory when version mismatch', () => {
      const oldMemory: EmotionalMemory = {
        version: 0,
        sessions: [],
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      }

      const memory = initEmotionalMemory(oldMemory)

      expect(memory.version).toBe(EMOTIONAL_MEMORY_VERSION)
      expect(memory.sessions).toEqual([])
    })

    it('should preserve valid memory with correct version', () => {
      const validMemory: EmotionalMemory = {
        version: EMOTIONAL_MEMORY_VERSION,
        sessions: [],
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      }

      const memory = initEmotionalMemory(validMemory)

      expect(memory.version).toBe(EMOTIONAL_MEMORY_VERSION)
      expect(memory.sessions).toEqual([])
    })

    it('should prune sessions exceeding maxSessions', () => {
      const sessions: SessionSummary[] = Array.from({ length: 60 }, (_, i) => ({
        id: `session_${i}`,
        startDay: i * 7,
        endDay: (i + 1) * 7,
        totalDays: 7,
        actionCounts: { study: 3 },
        borrowCount: i % 3 === 0 ? 1 : 0,
        bodyPartRepaymentCount: 0,
        contractAccepted: false,
        contractFinalProgress: 0,
        finalTier: '普通班',
        finalDebt: 1000,
        finalCash: 500,
        antiProfileStreakMax: 0,
        routePreference: 'mixed' as RoutePreference,
        timestamp: Date.now() - (60 - i) * 86400000
      }))

      const memory: EmotionalMemory = {
        version: EMOTIONAL_MEMORY_VERSION,
        sessions,
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      }

      const result = initEmotionalMemory(memory, { maxSessions: 50 })

      expect(result.sessions.length).toBeLessThanOrEqual(50)
      expect(result.sessions.length).toBe(50)
    })
  })

  describe('recordSession', () => {
    let baseMemory: EmotionalMemory

    beforeEach(() => {
      baseMemory = createDefaultEmotionalMemory()
    })

    it('should add session to empty memory', () => {
      const session: SessionSummary = createMockSession(1, 7)

      const result = recordSession(baseMemory, session)

      expect(result.sessions.length).toBe(1)
      expect(result.sessions[0].id).toBe(session.id)
      expect(result.aggregateMetrics.totalSessions).toBe(1)
    })

    it('should update aggregate metrics when adding session', () => {
      const session1 = createMockSession(1, 10, { borrowCount: 2, totalDays: 10 })
      const session2 = createMockSession(11, 20, { borrowCount: 1, totalDays: 10 })

      let memory = recordSession(baseMemory, session1)
      memory = recordSession(memory, session2)

      expect(memory.aggregateMetrics.totalSessions).toBe(2)
      expect(memory.aggregateMetrics.avgBorrowRate).toBeCloseTo(0.25, 2)
    })

    it('should prune sessions exceeding maxSessions', () => {
      const sessions: SessionSummary[] = Array.from({ length: 55 }, (_, i) =>
        createMockSession(i * 7, (i + 1) * 7)
      )

      let memory = baseMemory
      for (const session of sessions) {
        memory = recordSession(memory, session)
      }

      expect(memory.sessions.length).toBeLessThanOrEqual(DEFAULT_MAX_SESSIONS)
      expect(memory.sessions.length).toBe(DEFAULT_MAX_SESSIONS)
    })

    it('should update lastUpdated timestamp', () => {
      const before = Date.now()
      const session = createMockSession(1, 7)

      const result = recordSession(baseMemory, session)

      expect(result.lastUpdated).toBeGreaterThanOrEqual(before)
    })

    it('should calculate correct route preference for score-heavy sessions', () => {
      const session = createMockSession(1, 7, {
        actionCounts: { study: 5, tuna: 4, rest: 1 },
        routePreference: 'score'
      })

      const result = recordSession(baseMemory, session)

      expect(result.sessions[0].routePreference).toBe('score')
    })

    it('should calculate correct route preference for cash-heavy sessions', () => {
      const session = createMockSession(1, 7, {
        actionCounts: { parttime: 6, rest: 1 },
        routePreference: 'cash'
      })

      const result = recordSession(baseMemory, session)

      expect(result.sessions[0].routePreference).toBe('cash')
    })
  })

  describe('buildPersonalityProfile', () => {
    it('should return conservative profile for low borrow rate', () => {
      const memory = createMemoryWithMetrics({ avgBorrowRate: 0.05 })

      const profile = buildPersonalityProfile(memory)

      expect(profile.riskTolerance).toBe('conservative')
    })

    it('should return moderate profile for medium borrow rate', () => {
      const memory = createMemoryWithMetrics({ avgBorrowRate: 0.2 })

      const profile = buildPersonalityProfile(memory)

      expect(profile.riskTolerance).toBe('moderate')
    })

    it('should return aggressive profile for high borrow rate', () => {
      const memory = createMemoryWithMetrics({ avgBorrowRate: 0.5 })

      const profile = buildPersonalityProfile(memory)

      expect(profile.riskTolerance).toBe('aggressive')
    })

    it('should return resistant compliance for low contract acceptance', () => {
      const memory = createMemoryWithMetrics({
        avgContractAcceptRate: 0.1,
        avgBodyRepaymentRate: 0.1
      })

      const profile = buildPersonalityProfile(memory)

      expect(profile.complianceTendency).toBe('resistant')
    })

    it('should return compliant compliance for high contract acceptance', () => {
      const memory = createMemoryWithMetrics({
        avgContractAcceptRate: 0.8,
        avgBodyRepaymentRate: 0.7
      })

      const profile = buildPersonalityProfile(memory)

      expect(profile.complianceTendency).toBe('compliant')
    })

    it('should return accumulator strategy for high score route rate', () => {
      const memory = createMemoryWithMetrics({ avgScoreRouteRate: 0.8 })

      const profile = buildPersonalityProfile(memory)

      expect(profile.resourceStrategy).toBe('accumulator')
    })

    it('should return spender strategy for low score route rate', () => {
      const memory = createMemoryWithMetrics({ avgScoreRouteRate: 0.1 })

      const profile = buildPersonalityProfile(memory)

      expect(profile.resourceStrategy).toBe('spender')
    })

    it('should return high body autonomy for low body repayment rate', () => {
      const memory = createMemoryWithMetrics({ avgBodyRepaymentRate: 0.05 })

      const profile = buildPersonalityProfile(memory)

      expect(profile.bodyAutonomyValue).toBe('high')
    })

    it('should return low body autonomy for high body repayment rate', () => {
      const memory = createMemoryWithMetrics({ avgBodyRepaymentRate: 0.5 })

      const profile = buildPersonalityProfile(memory)

      expect(profile.bodyAutonomyValue).toBe('low')
    })

    it('should extract dominant traits correctly', () => {
      const memory = createMemoryWithMetrics({
        avgBorrowRate: 0.5,
        avgScoreRouteRate: 0.8,
        avgBodyRepaymentRate: 0.4,
        avgContractAcceptRate: 0.6,
        antiProfileStreakAvg: 4
      })

      const profile = buildPersonalityProfile(memory)

      expect(profile.dominantTraits).toContain('高频借贷者')
      expect(profile.dominantTraits).toContain('刷分优先')
      expect(profile.dominantTraits).toContain('身体置换者')
      expect(profile.dominantTraits).toContain('契约依赖者')
      expect(profile.dominantTraits).toContain('反画像选手')
    })

    it('should return fighter stress response for high borrow after debt ratio', () => {
      const sessions: SessionSummary[] = [
        { ...createMockSession(1, 7), finalDebt: 1000, borrowCount: 3 },
        { ...createMockSession(8, 14), finalDebt: 2000, borrowCount: 4 },
        { ...createMockSession(15, 21), finalDebt: 1500, borrowCount: 3 }
      ].map((s, i) => ({ ...s, timestamp: Date.now() - (3 - i) * 86400000 }))

      const memory: EmotionalMemory = {
        version: EMOTIONAL_MEMORY_VERSION,
        sessions,
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      }

      const profile = buildPersonalityProfile(memory)

      expect(profile.stressResponse).toBe('fighter')
    })

    it('should return default profile for empty memory', () => {
      const memory = createDefaultEmotionalMemory()

      const profile = buildPersonalityProfile(memory)

      expect(profile.riskTolerance).toBe('conservative')
      expect(profile.complianceTendency).toBe('resistant')
      expect(profile.resourceStrategy).toBe('spender')
      expect(profile.bodyAutonomyValue).toBe('high')
      expect(profile.stressResponse).toBe('fighter')
      expect(profile.dominantTraits).toEqual([])
    })
  })

  describe('getHiddenModifiers', () => {
    it('should return conservative modifiers for conservative profile', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'conservative',
        complianceTendency: 'resistant',
        resourceStrategy: 'accumulator',
        bodyAutonomyValue: 'high',
        stressResponse: 'avoider',
        dominantTraits: []
      }

      const modifiers = getHiddenModifiers(profile)

      expect(modifiers.actionOutcomes.study).toBe(1.1)
      expect(modifiers.actionOutcomes.tuna).toBe(1.1)
      expect(modifiers.actionOutcomes.borrow).toBe(0.8)
      expect(modifiers.eventProbabilities.riskyContract).toBe(0.7)
      expect(modifiers.narrativeBias).toContain('caution')
    })

    it('should return aggressive modifiers for aggressive profile', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'aggressive',
        complianceTendency: 'compliant',
        resourceStrategy: 'spender',
        bodyAutonomyValue: 'low',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = getHiddenModifiers(profile)

      expect(modifiers.actionOutcomes.study).toBe(0.9)
      expect(modifiers.actionOutcomes.borrow).toBe(1.2)
      expect(modifiers.eventProbabilities.riskyContract).toBe(1.3)
      expect(modifiers.narrativeBias).toContain('crisis')
    })

    it('should return moderate modifiers for moderate profile', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'moderate',
        complianceTendency: 'adaptive',
        resourceStrategy: 'balanced',
        bodyAutonomyValue: 'medium',
        stressResponse: 'negotiator',
        dominantTraits: []
      }

      const modifiers = getHiddenModifiers(profile)

      expect(modifiers.actionOutcomes.study).toBe(1.0)
      expect(modifiers.actionOutcomes.borrow).toBe(1.0)
      expect(modifiers.eventProbabilities.debtCollection).toBe(1.0)
      expect(modifiers.eventProbabilities.riskyContract).toBe(1.0)
    })

    it('should apply resistant compliance effects', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'moderate',
        complianceTendency: 'resistant',
        resourceStrategy: 'balanced',
        bodyAutonomyValue: 'high',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = getHiddenModifiers(profile)

      expect(modifiers.eventProbabilities.authorityEvent).toBe(0.8)
      expect(modifiers.eventProbabilities.complianceEvent).toBe(1.2)
    })

    it('should apply compliant compliance effects', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'moderate',
        complianceTendency: 'compliant',
        resourceStrategy: 'balanced',
        bodyAutonomyValue: 'high',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = getHiddenModifiers(profile)

      expect(modifiers.eventProbabilities.authorityEvent).toBe(1.3)
      expect(modifiers.eventProbabilities.complianceEvent).toBe(0.7)
    })

    it('should apply accumulator resource strategy effects', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'moderate',
        complianceTendency: 'adaptive',
        resourceStrategy: 'accumulator',
        bodyAutonomyValue: 'high',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = getHiddenModifiers(profile)

      expect(modifiers.actionOutcomes.parttime).toBe(0.9)
      expect(modifiers.actionOutcomes.buy).toBe(0.85)
      expect(modifiers.eventProbabilities.economicOpportunity).toBe(1.15)
    })

    it('should apply spender resource strategy effects', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'moderate',
        complianceTendency: 'adaptive',
        resourceStrategy: 'spender',
        bodyAutonomyValue: 'high',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = getHiddenModifiers(profile)

      expect(modifiers.actionOutcomes.parttime).toBe(1.1)
      expect(modifiers.actionOutcomes.buy).toBe(1.2)
      expect(modifiers.eventProbabilities.economicOpportunity).toBe(0.85)
    })

    it('should apply high body autonomy effects', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'moderate',
        complianceTendency: 'adaptive',
        resourceStrategy: 'balanced',
        bodyAutonomyValue: 'high',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = getHiddenModifiers(profile)

      expect(modifiers.eventProbabilities.bodyRepaymentEvent).toBe(0.7)
      expect(modifiers.eventProbabilities.bodyHarmingEvent).toBe(0.8)
    })

    it('should apply low body autonomy effects', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'moderate',
        complianceTendency: 'adaptive',
        resourceStrategy: 'balanced',
        bodyAutonomyValue: 'low',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = getHiddenModifiers(profile)

      expect(modifiers.eventProbabilities.bodyRepaymentEvent).toBe(1.3)
      expect(modifiers.eventProbabilities.bodyHarmingEvent).toBe(1.2)
    })
  })

  describe('pruneMemory', () => {
    it('should not prune when under maxSessions', () => {
      const sessions: SessionSummary[] = Array.from({ length: 30 }, (_, i) =>
        createMockSession(i * 7, (i + 1) * 7)
      )

      const memory: EmotionalMemory = {
        version: EMOTIONAL_MEMORY_VERSION,
        sessions,
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      }

      const result = pruneMemory(memory, DEFAULT_MAX_SESSIONS)

      expect(result.sessions.length).toBe(30)
    })

    it('should prune to maxSessions when over limit', () => {
      const sessions: SessionSummary[] = Array.from({ length: 60 }, (_, i) =>
        createMockSession(i * 7, (i + 1) * 7)
      )

      const memory: EmotionalMemory = {
        version: EMOTIONAL_MEMORY_VERSION,
        sessions,
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      }

      const result = pruneMemory(memory, DEFAULT_MAX_SESSIONS)

      expect(result.sessions.length).toBe(DEFAULT_MAX_SESSIONS)
    })

    it('should preserve most recent sessions after pruning', () => {
      const sessions: SessionSummary[] = Array.from({ length: 60 }, (_, i) => ({
        ...createMockSession(i * 7, (i + 1) * 7),
        totalDays: i + 1
      }))

      const memory: EmotionalMemory = {
        version: EMOTIONAL_MEMORY_VERSION,
        sessions,
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      }

      const result = pruneMemory(memory, 50)

      expect(result.sessions.length).toBe(50)
      const totalDaysSum = result.sessions.reduce((sum, s) => sum + s.totalDays, 0)
      expect(totalDaysSum).toBeGreaterThan(0)
    })
  })

  describe('createSessionSummaryFromGameState', () => {
    it('should create session summary with correct basic info', () => {
      const gameState = createMockGameState({
        school: { day: 14, classTier: '示范班' as const },
        econ: { debtPrincipal: 5000, debtInterestAccrued: 500, cash: 2000 }
      })

      gameState.sessionMetrics = {
        actionCounts: { study: 3, tuna: 2, rest: 1 },
        borrowCount: 2,
        bodyPartRepaymentCount: 1,
        antiProfileActionCount: 0,
        restCount: 1,
        startTime: Date.now() - 604800000
      }

      const summary = createSessionSummaryFromGameState(gameState, 7, Date.now() - 604800000, 3)

      expect(summary.startDay).toBe(7)
      expect(summary.endDay).toBe(14)
      expect(summary.totalDays).toBe(7)
      expect(summary.finalTier).toBe('示范班')
      expect(summary.finalDebt).toBe(5500)
      expect(summary.finalCash).toBe(2000)
      expect(summary.borrowCount).toBe(2)
      expect(summary.bodyPartRepaymentCount).toBe(1)
      expect(summary.antiProfileStreakMax).toBe(3)
    })

    it('should determine route preference as score for study-heavy actions', () => {
      const gameState = createMockGameState({})
      gameState.sessionMetrics = {
        actionCounts: { study: 10, tuna: 8, rest: 2 },
        borrowCount: 0,
        bodyPartRepaymentCount: 0,
        antiProfileActionCount: 0,
        restCount: 2,
        startTime: Date.now()
      }

      const summary = createSessionSummaryFromGameState(gameState, 1, Date.now(), 0)

      expect(summary.routePreference).toBe('score')
    })

    it('should determine route preference as cash for parttime-heavy actions', () => {
      const gameState = createMockGameState({})
      gameState.sessionMetrics = {
        actionCounts: { parttime: 15, rest: 5 },
        borrowCount: 0,
        bodyPartRepaymentCount: 0,
        antiProfileActionCount: 0,
        restCount: 5,
        startTime: Date.now()
      }

      const summary = createSessionSummaryFromGameState(gameState, 1, Date.now(), 0)

      expect(summary.routePreference).toBe('cash')
    })

    it('should determine route preference as mixed for balanced actions', () => {
      const gameState = createMockGameState({
        daySlotActions: { morning: 'study', afternoon: 'parttime', night: 'rest' }
      })

      const summary = createSessionSummaryFromGameState(gameState, 1, Date.now(), 0)

      expect(summary.routePreference).toBe('mixed')
    })
  })

  describe('applyMemoryToState', () => {
    it('should initialize default metrics when memory is empty', () => {
      const memory = createDefaultEmotionalMemory()
      const state = createMockGameState({})

      const result = applyMemoryToState(memory, state)

      expect(result.sessionMetrics).toBeDefined()
      expect(result.sessionMetrics?.actionCounts).toEqual({})
      expect(result.sessionMetrics?.borrowCount).toBe(0)
      expect(result.hiddenVariables).toBeDefined()
    })

    it('should apply memory modifiers to state', () => {
      const sessions: SessionSummary[] = Array.from({ length: 5 }, (_, i) =>
        createMockSession(i * 7, (i + 1) * 7, { borrowCount: 5 })
      )

      const memory: EmotionalMemory = {
        version: EMOTIONAL_MEMORY_VERSION,
        sessions,
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      }

      const state = createMockGameState({})

      const result = applyMemoryToState(memory, state)

      expect(result.sessionMetrics).toBeDefined()
      expect(result.hiddenVariables).toBeDefined()
      expect(result.hiddenVariables?.emotionalResidues).toBeDefined()
    })

    it('should set borrowTrauma based on borrow rate', () => {
      const memory = createMemoryWithMetrics({ avgBorrowRate: 0.5 })
      const state = createMockGameState({})

      const result = applyMemoryToState(memory, state)

      expect(result.hiddenVariables?.emotionalResidues.borrowTrauma).toBeCloseTo(25, 0)
    })
  })

  describe('mergeEmotionalMemory', () => {
    it('should merge sessions from both memories', () => {
      const local = createMemoryWithSessions(['local_1', 'local_2'])
      const imported = createMemoryWithSessions(['imported_1', 'imported_2'])

      const result = mergeEmotionalMemory(local, imported)

      expect(result.sessions.length).toBe(4)
    })

    it('should prefer newest when conflictResolution is newest', () => {
      const baseTime = Date.now()
      const local = createMemoryWithSessions(['session_1'], baseTime - 10000)
      const imported = createMemoryWithSessions(['session_1'], baseTime)

      const result = mergeEmotionalMemory(local, imported, 'newest')

      const merged = result.sessions.find(s => s.id === 'session_1')
      expect(merged?.timestamp).toBe(baseTime)
    })

    it('should prefer imported when conflictResolution is imported', () => {
      const baseTime = Date.now()
      const local = createMemoryWithSessions(['session_1'], baseTime - 10000)
      const imported = createMemoryWithSessions(['session_1'], baseTime)

      const result = mergeEmotionalMemory(local, imported, 'imported')

      const merged = result.sessions.find(s => s.id === 'session_1')
      expect(merged?.timestamp).toBe(baseTime)
    })

    it('should prefer local when conflictResolution is local', () => {
      const baseTime = Date.now()
      const local = createMemoryWithSessions(['session_1'], baseTime)
      const imported = createMemoryWithSessions(['session_1'], baseTime + 10000)

      const result = mergeEmotionalMemory(local, imported, 'local')

      const merged = result.sessions.find(s => s.id === 'session_1')
      expect(merged?.timestamp).toBe(baseTime)
    })

    it('should prune merged memory exceeding max sessions', () => {
      const local = createMemoryWithSessions(
        Array.from({ length: 40 }, (_, i) => `local_${i}`),
        Date.now() - 100000
      )
      const imported = createMemoryWithSessions(
        Array.from({ length: 40 }, (_, i) => `imported_${i}`),
        Date.now()
      )

      const result = mergeEmotionalMemory(local, imported)

      expect(result.sessions.length).toBeLessThanOrEqual(DEFAULT_MAX_SESSIONS)
    })
  })

  describe('validateEmotionalMemory', () => {
    it('should return true for valid emotional memory', () => {
      const memory = createDefaultEmotionalMemory()

      expect(validateEmotionalMemory(memory)).toBe(true)
    })

    it('should return true for memory with sessions', () => {
      const memory = createMemoryWithSessions(['session_1'])

      expect(validateEmotionalMemory(memory)).toBe(true)
    })

    it('should return false for null', () => {
      expect(validateEmotionalMemory(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(validateEmotionalMemory(undefined)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(validateEmotionalMemory('string')).toBe(false)
      expect(validateEmotionalMemory(123)).toBe(false)
      expect(validateEmotionalMemory([])).toBe(false)
    })

    it('should return false for object without version', () => {
      expect(validateEmotionalMemory({
        sessions: [],
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      })).toBe(false)
    })

    it('should return false for object without sessions array', () => {
      expect(validateEmotionalMemory({
        version: EMOTIONAL_MEMORY_VERSION,
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      })).toBe(false)
    })

    it('should return false for sessions with invalid session object', () => {
      expect(validateEmotionalMemory({
        version: EMOTIONAL_MEMORY_VERSION,
        sessions: [{ id: 123 }],
        aggregateMetrics: createDefaultAggregateMetrics(),
        lastUpdated: Date.now()
      })).toBe(false)
    })
  })

  describe('exportEmotionalMemory and importEmotionalMemory', () => {
    it('should export and import memory correctly', () => {
      const original = createMemoryWithSessions(['session_1', 'session_2'])

      const exported = exportEmotionalMemory(original)
      const imported = importEmotionalMemory(exported)

      expect(imported).not.toBeNull()
      expect(imported!.sessions.length).toBe(2)
      expect(imported!.sessions[0].id).toBe('session_1')
    })

    it('should return null for invalid JSON', () => {
      const result = importEmotionalMemory('not valid json')

      expect(result).toBeNull()
    })

    it('should return null for invalid memory structure', () => {
      const result = importEmotionalMemory('{"version": 0}')

      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = importEmotionalMemory('')

      expect(result).toBeNull()
    })
  })
})

function createMockSession(
  startDay: number,
  endDay: number,
  overrides: Partial<SessionSummary> = {}
): SessionSummary {
  return {
    id: `session_${startDay}`,
    startDay,
    endDay,
    totalDays: endDay - startDay,
    actionCounts: { study: 3, tuna: 2, rest: 1 },
    borrowCount: 0,
    bodyPartRepaymentCount: 0,
    contractAccepted: false,
    contractFinalProgress: 0,
    finalTier: '普通班',
    finalDebt: 1000,
    finalCash: 500,
    antiProfileStreakMax: 0,
    routePreference: 'mixed',
    timestamp: Date.now(),
    ...overrides
  }
}

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  const schoolOverrides = overrides.school || {}
  const econOverrides = overrides.econ || {}

  const defaultState: GameState = {
    started: true,
    seed: 12345,
    stats: {
      daoXin: 1,
      faLi: 0,
      rouTi: 5,
      fatigue: 30,
      focus: 80
    },
    econ: {
      cash: 1000,
      collectionFee: 0,
      debtPrincipal: 10000,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 1,
      ...econOverrides
    },
    school: {
      day: 7,
      week: 1,
      slot: 'morning',
      classTier: '普通班',
      lastExamScore: 60,
      lastRank: 20,
      perks: {
        mealSubsidy: 0,
        focusBonus: 0
      },
      ...schoolOverrides
    },
    contract: {
      active: false,
      name: '',
      patron: '',
      progress: 0,
      vigilance: 0,
      lastTriggerDay: 0
    },
    logs: [],
    bodyPartRepayment: {},
    daySlotActions: { morning: 'study', afternoon: 'tuna', night: 'rest' },
    domestication: 0,
    numbness: 0,
    lastStrongCollapseDay: 0,
    nextStrongCollapseEarliestDay: 0,
    collapseFirstDone: {},
    collapseModifierActive: false,
    summaryUnlocked: false,
    summaryUnlockedAtDay: 0,
    summarySeen: false,
    summarySeenAtDay: 0,
    profileSnapshot: undefined,
    antiProfileDayStreak: 0,
    ...overrides
  }

  if (overrides.daySlotActions) {
    defaultState.daySlotActions = overrides.daySlotActions
  }

  return defaultState
}

function createMemoryWithMetrics(
  metricsOverrides: Partial<{
    avgBorrowRate: number
    avgScoreRouteRate: number
    avgBodyRepaymentRate: number
    avgContractAcceptRate: number
    avgRestRate: number
    antiProfileStreakAvg: number
  }>
): EmotionalMemory {
  const sessions: SessionSummary[] = []
  const baseMetrics = {
    totalSessions: 0,
    totalActions: 0,
    avgBorrowRate: 0,
    avgScoreRouteRate: 0,
    avgBodyRepaymentRate: 0,
    avgContractAcceptRate: 0,
    avgRestRate: 0,
    antiProfileStreakAvg: 0,
    ...metricsOverrides
  }

  if (metricsOverrides.avgBorrowRate !== undefined) {
    for (let i = 0; i < 10; i++) {
      sessions.push(createMockSession(i * 7, (i + 1) * 7, {
        borrowCount: Math.floor(metricsOverrides.avgBorrowRate * 21)
      }))
    }
    baseMetrics.totalSessions = 10
    baseMetrics.totalActions = 210
  }

  return {
    version: EMOTIONAL_MEMORY_VERSION,
    sessions,
    aggregateMetrics: baseMetrics as any,
    lastUpdated: Date.now()
  }
}

function createMemoryWithSessions(sessionIds: string[], timestamp?: number): EmotionalMemory {
  const sessions: SessionSummary[] = sessionIds.map((id, index) =>
    createMockSession(index * 7, (index + 1) * 7, {
      id,
      timestamp: timestamp ?? Date.now()
    })
  )

  return {
    version: EMOTIONAL_MEMORY_VERSION,
    sessions,
    aggregateMetrics: createDefaultAggregateMetrics(),
    lastUpdated: Date.now()
  }
}
