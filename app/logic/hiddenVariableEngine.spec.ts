import { describe, it, expect } from 'vitest'
import type {
  HiddenVariables,
  HiddenModifiers,
  PersonalityProfile,
  EmotionalMemory,
  GameState
} from '~/types/game'
import {
  createDefaultHiddenVariables,
  updateHiddenVariables,
  getEmotionalResidue,
  setEmotionalResidue,
  applyActionModifier,
  applyEventProbabilityModifier,
  buildModifiersFromProfile,
  deriveHiddenVariablesFromMemory,
  getNarrativeBiasTags,
  calculateStressLevel,
  serializeHiddenVariables,
  deserializeHiddenVariables,
  validateHiddenVariables,
  DEFAULT_HIDDEN_VARIABLES
} from '~/logic/hiddenVariableEngine'

describe('hiddenVariableEngine', () => {
  describe('createDefaultHiddenVariables', () => {
    it('should create default hidden variables', () => {
      const variables = createDefaultHiddenVariables()

      expect(variables.emotionalResidues).toBeDefined()
      expect(variables.emotionalResidues.borrowTrauma).toBe(0)
      expect(variables.environmentalFactors).toBeDefined()
      expect(variables.narrativeMomentum).toBeDefined()
    })

    it('should create independent copy', () => {
      const variables1 = createDefaultHiddenVariables()
      const variables2 = createDefaultHiddenVariables()

      variables1.emotionalResidues.borrowTrauma = 100

      expect(variables2.emotionalResidues.borrowTrauma).toBe(0)
    })
  })

  describe('updateHiddenVariables', () => {
    it('should update emotional residues', () => {
      const current = createDefaultHiddenVariables()
      const updated = updateHiddenVariables(current, {
        emotionalResidues: { borrowTrauma: 50 }
      })

      expect(updated.emotionalResidues.borrowTrauma).toBe(50)
      expect(updated.emotionalResidues.complianceFatigue).toBe(0)
    })

    it('should preserve existing values', () => {
      const current: HiddenVariables = {
        ...createDefaultHiddenVariables(),
        emotionalResidues: {
          borrowTrauma: 30,
          complianceFatigue: 20,
          bodyConcern: 10
        }
      }

      const updated = updateHiddenVariables(current, {
        emotionalResidues: { borrowTrauma: 50 }
      })

      expect(updated.emotionalResidues.borrowTrauma).toBe(50)
      expect(updated.emotionalResidues.complianceFatigue).toBe(20)
      expect(updated.emotionalResidues.bodyConcern).toBe(10)
    })

    it('should update environmental factors', () => {
      const current = createDefaultHiddenVariables()
      const updated = updateHiddenVariables(current, {
        environmentalFactors: { institutionalScrutiny: 30 }
      })

      expect(updated.environmentalFactors.institutionalScrutiny).toBe(30)
      expect(updated.environmentalFactors.marketConditions).toBe(0)
    })

    it('should update narrative momentum', () => {
      const current = createDefaultHiddenVariables()
      const updated = updateHiddenVariables(current, {
        narrativeMomentum: { crisisTendency: 1 }
      })

      expect(updated.narrativeMomentum.crisisTendency).toBe(1)
      expect(updated.narrativeMomentum.stabilityTendency).toBe(0)
    })
  })

  describe('getEmotionalResidue', () => {
    it('should return value for existing key', () => {
      const variables = createDefaultHiddenVariables()
      variables.emotionalResidues.borrowTrauma = 50

      expect(getEmotionalResidue(variables, 'borrowTrauma')).toBe(50)
    })

    it('should return 0 for non-existing key', () => {
      const variables = createDefaultHiddenVariables()

      expect(getEmotionalResidue(variables, 'nonExistent')).toBe(0)
    })
  })

  describe('setEmotionalResidue', () => {
    it('should set value for key', () => {
      const variables = createDefaultHiddenVariables()
      const updated = setEmotionalResidue(variables, 'borrowTrauma', 50)

      expect(updated.emotionalResidues.borrowTrauma).toBe(50)
    })

    it('should clamp negative values to 0', () => {
      const variables = createDefaultHiddenVariables()
      const updated = setEmotionalResidue(variables, 'borrowTrauma', -10)

      expect(updated.emotionalResidues.borrowTrauma).toBe(0)
    })
  })

  describe('applyActionModifier', () => {
    const modifiers: HiddenModifiers = {
      actionOutcomes: { study: 1.2, borrow: 0.8 },
      eventProbabilities: {},
      narrativeBias: []
    }

    it('should apply modifier when exists', () => {
      const result = applyActionModifier(10, 'study', modifiers)

      expect(result).toBe(12)
    })

    it('should return base value when no modifier', () => {
      const result = applyActionModifier(10, 'rest', modifiers)

      expect(result).toBe(10)
    })

    it('should apply less than 1 modifier', () => {
      const result = applyActionModifier(10, 'borrow', modifiers)

      expect(result).toBe(8)
    })

    it('should handle decimal values', () => {
      const result = applyActionModifier(5.5, 'study', modifiers)

      expect(result).toBe(6.6)
    })
  })

  describe('applyEventProbabilityModifier', () => {
    const modifiers: HiddenModifiers = {
      actionOutcomes: {},
      eventProbabilities: { debtCollection: 1.5, riskyContract: 0.7 },
      narrativeBias: []
    }

    it('should apply modifier when exists', () => {
      const result = applyEventProbabilityModifier(0.1, 'debtCollection', modifiers)

      expect(result).toBeCloseTo(0.15)
    })

    it('should return base probability when no modifier', () => {
      const result = applyEventProbabilityModifier(0.1, 'nonExistent', modifiers)

      expect(result).toBe(0.1)
    })
  })

  describe('buildModifiersFromProfile', () => {
    it('should build conservative modifiers', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'conservative',
        complianceTendency: 'resistant',
        resourceStrategy: 'accumulator',
        bodyAutonomyValue: 'high',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = buildModifiersFromProfile(profile)

      expect(modifiers.actionOutcomes.study).toBe(1.1)
      expect(modifiers.actionOutcomes.borrow).toBe(0.8)
      expect(modifiers.eventProbabilities.riskyContract).toBe(0.7)
    })

    it('should build aggressive modifiers', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'aggressive',
        complianceTendency: 'compliant',
        resourceStrategy: 'spender',
        bodyAutonomyValue: 'low',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = buildModifiersFromProfile(profile)

      expect(modifiers.actionOutcomes.study).toBe(0.9)
      expect(modifiers.actionOutcomes.borrow).toBe(1.2)
      expect(modifiers.eventProbabilities.riskyContract).toBe(1.3)
    })

    it('should build moderate modifiers', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'moderate',
        complianceTendency: 'adaptive',
        resourceStrategy: 'balanced',
        bodyAutonomyValue: 'medium',
        stressResponse: 'negotiator',
        dominantTraits: []
      }

      const modifiers = buildModifiersFromProfile(profile)

      expect(modifiers.actionOutcomes.study).toBe(1.0)
      expect(modifiers.actionOutcomes.borrow).toBe(1.0)
      expect(modifiers.eventProbabilities.riskyContract).toBe(1.0)
    })

    it('should include narrative bias for conservative profile', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'conservative',
        complianceTendency: 'resistant',
        resourceStrategy: 'accumulator',
        bodyAutonomyValue: 'high',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = buildModifiersFromProfile(profile)

      expect(modifiers.narrativeBias).toContain('caution')
      expect(modifiers.narrativeBias).toContain('stability')
    })

    it('should include narrative bias for aggressive profile', () => {
      const profile: PersonalityProfile = {
        riskTolerance: 'aggressive',
        complianceTendency: 'compliant',
        resourceStrategy: 'spender',
        bodyAutonomyValue: 'low',
        stressResponse: 'fighter',
        dominantTraits: []
      }

      const modifiers = buildModifiersFromProfile(profile)

      expect(modifiers.narrativeBias).toContain('crisis')
      expect(modifiers.narrativeBias).toContain('danger')
    })
  })

  describe('deriveHiddenVariablesFromMemory', () => {
    it('should derive borrow trauma from high borrow rate', () => {
      const memory: EmotionalMemory = {
        version: 1,
        sessions: [],
        aggregateMetrics: {
          totalSessions: 10,
          totalActions: 100,
          avgBorrowRate: 0.5,
          avgScoreRouteRate: 0.3,
          avgBodyRepaymentRate: 0.2,
          avgContractAcceptRate: 0.1,
          avgRestRate: 0.1,
          antiProfileStreakAvg: 0
        },
        lastUpdated: Date.now()
      }

      const variables = deriveHiddenVariablesFromMemory(memory)

      expect(variables.emotionalResidues.borrowTrauma).toBe(25)
    })

    it('should derive institutional scrutiny from high contract rate', () => {
      const memory: EmotionalMemory = {
        version: 1,
        sessions: [],
        aggregateMetrics: {
          totalSessions: 10,
          totalActions: 100,
          avgBorrowRate: 0.1,
          avgScoreRouteRate: 0.3,
          avgBodyRepaymentRate: 0.1,
          avgContractAcceptRate: 0.7,
          avgRestRate: 0.1,
          antiProfileStreakAvg: 0
        },
        lastUpdated: Date.now()
      }

      const variables = deriveHiddenVariablesFromMemory(memory)

      expect(variables.environmentalFactors.institutionalScrutiny).toBe(20)
    })

    it('should set crisis tendency for high borrow rate', () => {
      const memory: EmotionalMemory = {
        version: 1,
        sessions: [],
        aggregateMetrics: {
          totalSessions: 10,
          totalActions: 100,
          avgBorrowRate: 0.5,
          avgScoreRouteRate: 0.3,
          avgBodyRepaymentRate: 0.1,
          avgContractAcceptRate: 0.1,
          avgRestRate: 0.1,
          antiProfileStreakAvg: 0
        },
        lastUpdated: Date.now()
      }

      const variables = deriveHiddenVariablesFromMemory(memory)

      expect(variables.narrativeMomentum.crisisTendency).toBe(1)
    })

    it('should set stability tendency for high score route', () => {
      const memory: EmotionalMemory = {
        version: 1,
        sessions: [],
        aggregateMetrics: {
          totalSessions: 10,
          totalActions: 100,
          avgBorrowRate: 0.1,
          avgScoreRouteRate: 0.7,
          avgBodyRepaymentRate: 0.1,
          avgContractAcceptRate: 0.1,
          avgRestRate: 0.1,
          antiProfileStreakAvg: 0
        },
        lastUpdated: Date.now()
      }

      const variables = deriveHiddenVariablesFromMemory(memory)

      expect(variables.narrativeMomentum.stabilityTendency).toBe(1)
    })
  })

  describe('getNarrativeBiasTags', () => {
    it('should return crisis tags for high crisis tendency', () => {
      const variables: HiddenVariables = {
        ...createDefaultHiddenVariables(),
        narrativeMomentum: { crisisTendency: 1, stabilityTendency: 0 }
      }

      const tags = getNarrativeBiasTags(variables)

      expect(tags).toContain('crisis')
      expect(tags).toContain('danger')
      expect(tags).toContain('highStakes')
    })

    it('should return stability tags for high stability tendency', () => {
      const variables: HiddenVariables = {
        ...createDefaultHiddenVariables(),
        narrativeMomentum: { crisisTendency: 0, stabilityTendency: 1 }
      }

      const tags = getNarrativeBiasTags(variables)

      expect(tags).toContain('caution')
      expect(tags).toContain('stability')
      expect(tags).toContain('gradual')
    })

    it('should return debt anxiety for high borrow trauma', () => {
      const variables: HiddenVariables = {
        ...createDefaultHiddenVariables(),
        emotionalResidues: { borrowTrauma: 30, complianceFatigue: 0, bodyConcern: 0 }
      }

      const tags = getNarrativeBiasTags(variables)

      expect(tags).toContain('debtAnxiety')
    })
  })

  describe('calculateStressLevel', () => {
    it('should include fatigue contribution', () => {
      const variables = createDefaultHiddenVariables()
      const state = createMockGameState({ fatigue: 80 })

      const stress = calculateStressLevel(variables, state)

      expect(stress).toBeGreaterThan(20)
    })

    it('should include debt ratio contribution', () => {
      const variables = createDefaultHiddenVariables()
      const state = createMockGameState({
        econ: { debtPrincipal: 10000, cash: 100 }
      })

      const stress = calculateStressLevel(variables, state)

      expect(stress).toBeGreaterThan(0)
    })

    it('should include delinquency contribution', () => {
      const variables = createDefaultHiddenVariables()
      const state = createMockGameState({
        econ: { cash: 1000, debtPrincipal: 10000, delinquency: 3 }
      })

      const stress = calculateStressLevel(variables, state)

      expect(stress).toBeGreaterThan(10)
    })

    it('should clamp stress to 0-100 range', () => {
      const variables = createDefaultHiddenVariables()
      variables.emotionalResidues.borrowTrauma = 100
      variables.emotionalResidues.complianceFatigue = 100

      const state = createMockGameState({
        fatigue: 100,
        econ: { debtPrincipal: 100000, cash: 0, delinquency: 5 }
      })

      const stress = calculateStressLevel(variables, state)

      expect(stress).toBeLessThanOrEqual(100)
      expect(stress).toBeGreaterThanOrEqual(0)
    })
  })

  describe('serializeHiddenVariables and deserializeHiddenVariables', () => {
    it('should serialize and deserialize correctly', () => {
      const original: HiddenVariables = {
        emotionalResidues: { borrowTrauma: 30, complianceFatigue: 20, bodyConcern: 10 },
        environmentalFactors: { marketConditions: 5, institutionalScrutiny: 15 },
        npcAttitudes: { npc1: 10 },
        narrativeMomentum: { crisisTendency: 1, stabilityTendency: 0 }
      }

      const json = serializeHiddenVariables(original)
      const deserialized = deserializeHiddenVariables(json)

      expect(deserialized).toEqual(original)
    })

    it('should return null for invalid JSON', () => {
      const result = deserializeHiddenVariables('invalid json')

      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = deserializeHiddenVariables('')

      expect(result).toBeNull()
    })
  })

  describe('validateHiddenVariables', () => {
    it('should return true for valid hidden variables', () => {
      const variables = createDefaultHiddenVariables()

      expect(validateHiddenVariables(variables)).toBe(true)
    })

    it('should return false for null', () => {
      expect(validateHiddenVariables(null)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(validateHiddenVariables('string')).toBe(false)
      expect(validateHiddenVariables(123)).toBe(false)
    })

    it('should return false for missing emotionalResidues', () => {
      const invalid = {
        environmentalFactors: {},
        npcAttitudes: {},
        narrativeMomentum: {}
      }

      expect(validateHiddenVariables(invalid)).toBe(false)
    })

    it('should return false for missing environmentalFactors', () => {
      const invalid = {
        emotionalResidues: {},
        npcAttitudes: {},
        narrativeMomentum: {}
      }

      expect(validateHiddenVariables(invalid)).toBe(false)
    })
  })
})

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  const econOverrides = (overrides.econ as Record<string, unknown>) || {}

  return {
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
      classTier: '普通班' as const,
      lastExamScore: 60,
      lastRank: 20,
      perks: { mealSubsidy: 0, focusBonus: 0 }
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
}
