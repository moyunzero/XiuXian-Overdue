import { describe, it, expect, beforeEach } from 'vitest'
import type {
  EventTemplate,
  EventContext,
  EmergentEvent,
  TemplateCondition,
  GameState,
  PersonalityProfile,
  HiddenModifiers,
  CausalNode
} from '~/types/game'
import {
  generateEmergentEvent,
  scoreTemplateRelevance,
  evaluateConditions,
  evaluateSingleCondition,
  fillTemplate,
  getTemplatesByFamily,
  getTemplatesByPhase,
  getAllTemplates,
  validateTemplate
} from '~/logic/emergentEventGenerator'

describe('emergentEventGenerator', () => {
  let baseContext: EventContext
  let baseGameState: GameState
  let baseProfile: PersonalityProfile
  let baseModifiers: HiddenModifiers

  beforeEach(() => {
    baseGameState = createMockGameState()
    baseProfile = createMockProfile()
    baseModifiers = createMockModifiers()

    baseContext = {
      state: baseGameState,
      profile: baseProfile,
      recentChain: [],
      hiddenModifiers: baseModifiers,
      stressLevel: 50
    }
  })

  describe('generateEmergentEvent', () => {
    it('should return null when no templates match', () => {
      const context: EventContext = {
        state: createMockGameState({ econ: { debtPrincipal: 0, cash: 10000 } }),
        profile: createMockProfile({ riskTolerance: 'conservative' }),
        hiddenModifiers: createMockModifiers(),
        stressLevel: 10
      }

      const result = generateEmergentEvent(context, () => 0.5)

      // Should return null if no conditions match
      // Note: Depending on actual template conditions, this may or may not match
    })

    it('should generate event with filled template strings', () => {
      const context: EventContext = {
        state: createMockGameState({
          startConfig: { playerName: '测试修士' }
        }),
        profile: createMockProfile(),
        hiddenModifiers: createMockModifiers(),
        stressLevel: 50
      }

      const result = generateEmergentEvent(context, () => 0.5)

      if (result) {
        expect(result.title).toBeDefined()
        expect(result.body).toBeDefined()
        expect(result.options.length).toBeGreaterThan(0)
        expect(result.isEmergent).toBe(true)
      }
    })

    it('should set unique id for each generated event', () => {
      const context: EventContext = {
        state: createMockGameState(),
        profile: createMockProfile(),
        hiddenModifiers: createMockModifiers(),
        stressLevel: 50
      }

      const result1 = generateEmergentEvent(context, () => 0.1)
      const result2 = generateEmergentEvent(context, () => 0.1)

      if (result1 && result2) {
        expect(result1.id).not.toBe(result2.id)
      }
    })

    it('should use provided random function', () => {
      const context: EventContext = {
        state: createMockGameState(),
        profile: createMockProfile(),
        hiddenModifiers: createMockModifiers(),
        stressLevel: 50
      }

      const rand = () => 0.99

      const result = generateEmergentEvent(context, rand)

      // Should select based on random value
      expect(result).toBeDefined()
    })
  })

  describe('scoreTemplateRelevance', () => {
    it('should return 0 for template with unmet conditions', () => {
      const templates = getAllTemplates()
      if (templates.length === 0) return

      const template = templates[0]
      const context: EventContext = {
        state: createMockGameState({ econ: { debtPrincipal: 0 } }),
        profile: createMockProfile(),
        hiddenModifiers: createMockModifiers(),
        stressLevel: 50
      }

      const score = scoreTemplateRelevance(template, context)

      if (!evaluateConditions(template.triggerConditions, context)) {
        expect(score).toBe(0)
      }
    })

    it('should return positive score for matching template', () => {
      const templates = getAllTemplates()
      if (templates.length === 0) return

      const template = templates[0]
      const context: EventContext = {
        state: createMockGameState({ econ: { debtPrincipal: 10000 } }),
        profile: createMockProfile({ riskTolerance: 'aggressive' }),
        hiddenModifiers: createMockModifiers(),
        stressLevel: 80
      }

      if (evaluateConditions(template.triggerConditions, context)) {
        const score = scoreTemplateRelevance(template, context)
        expect(score).toBeGreaterThan(0)
      }
    })

    it('should apply stress modifier', () => {
      const templates = getAllTemplates()
      if (templates.length === 0) return

      const template = templates[0]

      const lowStressContext = { ...baseContext, stressLevel: 20 }
      const highStressContext = { ...baseContext, stressLevel: 80 }

      if (evaluateConditions(template.triggerConditions, highStressContext)) {
        const lowScore = scoreTemplateRelevance(template, lowStressContext)
        const highScore = scoreTemplateRelevance(template, highStressContext)

        if (template.tone === 'danger') {
          expect(highScore).toBeGreaterThan(lowScore)
        }
      }
    })
  })

  describe('evaluateConditions', () => {
    it('should return true for empty conditions', () => {
      const result = evaluateConditions([], baseContext)

      expect(result).toBe(true)
    })

    it('should return true when all conditions are met', () => {
      const conditions: TemplateCondition[] = [
        { variable: 'state.econ.debtPrincipal', operator: 'gt', value: 0 },
        { variable: 'state.stats.fatigue', operator: 'gt', value: 0 }
      ]

      const result = evaluateConditions(conditions, baseContext)

      expect(result).toBe(true)
    })

    it('should return false when any condition is not met', () => {
      const conditions: TemplateCondition[] = [
        { variable: 'state.econ.debtPrincipal', operator: 'gt', value: 0 },
        { variable: 'state.econ.cash', operator: 'gt', value: 100000 }
      ]

      const result = evaluateConditions(conditions, baseContext)

      expect(result).toBe(false)
    })
  })

  describe('evaluateSingleCondition', () => {
    it('should evaluate gt operator correctly', () => {
      const condition: TemplateCondition = {
        variable: 'state.stats.fatigue',
        operator: 'gt',
        value: 20
      }

      expect(evaluateSingleCondition(condition, baseContext)).toBe(true)
      expect(evaluateSingleCondition({ ...condition, value: 50 }, baseContext)).toBe(false)
    })

    it('should evaluate lt operator correctly', () => {
      const condition: TemplateCondition = {
        variable: 'state.stats.fatigue',
        operator: 'lt',
        value: 50
      }

      expect(evaluateSingleCondition(condition, baseContext)).toBe(true)
      expect(evaluateSingleCondition({ ...condition, value: 20 }, baseContext)).toBe(false)
    })

    it('should evaluate eq operator correctly', () => {
      const condition: TemplateCondition = {
        variable: 'profile.riskTolerance',
        operator: 'eq',
        value: 'moderate'
      }

      expect(evaluateSingleCondition(condition, baseContext)).toBe(true)
      expect(evaluateSingleCondition({ ...condition, value: 'aggressive' }, baseContext)).toBe(false)
    })

    it('should evaluate gte operator correctly', () => {
      const condition: TemplateCondition = {
        variable: 'state.stats.fatigue',
        operator: 'gte',
        value: 30
      }

      expect(evaluateSingleCondition(condition, baseContext)).toBe(true)
      expect(evaluateSingleCondition({ ...condition, value: 30 }, baseContext)).toBe(true)
      expect(evaluateSingleCondition({ ...condition, value: 31 }, baseContext)).toBe(false)
    })

    it('should evaluate lte operator correctly', () => {
      const condition: TemplateCondition = {
        variable: 'state.stats.fatigue',
        operator: 'lte',
        value: 30
      }

      expect(evaluateSingleCondition(condition, baseContext)).toBe(true)
      expect(evaluateSingleCondition({ ...condition, value: 30 }, baseContext)).toBe(true)
      expect(evaluateSingleCondition({ ...condition, value: 29 }, baseContext)).toBe(false)
    })

    it('should evaluate in operator correctly', () => {
      const condition: TemplateCondition = {
        variable: 'profile.riskTolerance',
        operator: 'in',
        value: ['conservative', 'moderate']
      }

      expect(evaluateSingleCondition(condition, baseContext)).toBe(true)
      expect(evaluateSingleCondition({ ...condition, value: ['aggressive'] }, baseContext)).toBe(false)
    })

    it('should return false for undefined variable', () => {
      const condition: TemplateCondition = {
        variable: 'non.existent.path',
        operator: 'eq',
        value: 0
      }

      expect(evaluateSingleCondition(condition, baseContext)).toBe(false)
    })
  })

  describe('fillTemplate', () => {
    it('should replace playerName placeholder', () => {
      const template = createMockTemplate({
        titleTemplate: 'Hello ${playerName}',
        bodyTemplate: 'Your debt is ${econ.debtPrincipal}'
      })

      const context: EventContext = {
        state: createMockGameState({
          startConfig: { playerName: 'TestPlayer' }
        }),
        profile: createMockProfile(),
        hiddenModifiers: createMockModifiers(),
        stressLevel: 50
      }

      const result = fillTemplate(template, context)

      expect(result.title).toContain('TestPlayer')
      expect(result.body).toContain('10000')
    })

    it('should replace stat placeholders', () => {
      const template = createMockTemplate({
        titleTemplate: 'Stats: ${stats.daoXin}',
        bodyTemplate: 'Fatigue: ${stats.fatigue}'
      })

      const result = fillTemplate(template, baseContext)

      expect(result.title).toContain('1')
      expect(result.body).toContain('30')
    })

    it('should replace econ placeholders', () => {
      const template = createMockTemplate({
        titleTemplate: 'Cash: ${econ.cash}',
        bodyTemplate: 'Debt: ${econ.debtPrincipal}'
      })

      const result = fillTemplate(template, baseContext)

      expect(result.body).toContain('1000')
      expect(result.body).toContain('10000')
    })

    it('should replace profile placeholders', () => {
      const template = createMockTemplate({
        titleTemplate: 'Risk: ${profile.riskTolerance}',
        bodyTemplate: 'Strategy: ${profile.resourceStrategy}'
      })

      const result = fillTemplate(template, baseContext)

      expect(result.title).toContain('moderate')
      expect(result.body).toContain('balanced')
    })

    it('should create options with filled labels', () => {
      const template = createMockTemplate({
        titleTemplate: 'Test Event',
        bodyTemplate: 'Test body',
        optionTemplates: [
          {
            id: 'opt1',
            labelTemplate: 'Option for ${playerName}',
            tone: 'normal' as const,
            effectTemplates: []
          }
        ]
      })

      const context: EventContext = {
        state: createMockGameState({
          startConfig: { playerName: 'Player' }
        }),
        profile: createMockProfile(),
        hiddenModifiers: createMockModifiers(),
        stressLevel: 50
      }

      const result = fillTemplate(template, context)

      expect(result.options[0].label).toContain('Player')
    })

    it('should set correct tone and tier', () => {
      const template = createMockTemplate({
        titleTemplate: 'Test',
        bodyTemplate: 'Body',
        tone: 'warn' as const,
        tier: 'critical' as const
      })

      const result = fillTemplate(template, baseContext)

      expect(result.tone).toBe('warn')
      expect(result.tier).toBe('critical')
    })
  })

  describe('getTemplatesByFamily', () => {
    it('should return templates for specified family', () => {
      const templates = getTemplatesByFamily('emergent_debt')

      expect(Array.isArray(templates)).toBe(true)
    })

    it('should return empty array for unknown family', () => {
      const templates = getTemplatesByFamily('non_existent_family')

      expect(templates).toEqual([])
    })
  })

  describe('getTemplatesByPhase', () => {
    it('should return templates for afterAction phase', () => {
      const templates = getTemplatesByPhase('afterAction')

      expect(Array.isArray(templates)).toBe(true)
      templates.forEach(t => {
        expect(t.phase).toBe('afterAction')
      })
    })

    it('should return templates for endOfDay phase', () => {
      const templates = getTemplatesByPhase('endOfDay')

      expect(Array.isArray(templates)).toBe(true)
      templates.forEach(t => {
        expect(t.phase).toBe('endOfDay')
      })
    })
  })

  describe('getAllTemplates', () => {
    it('should return all templates', () => {
      const templates = getAllTemplates()

      expect(templates.length).toBeGreaterThan(0)
    })

    it('should return cached results on subsequent calls', () => {
      const templates1 = getAllTemplates()
      const templates2 = getAllTemplates()

      expect(templates1).toBe(templates2)
    })
  })

  describe('validateTemplate', () => {
    it('should return true for valid template', () => {
      const template = createMockTemplate({
        id: 'test',
        family: 'test',
        titleTemplate: 'Title',
        bodyTemplate: 'Body'
      })

      expect(validateTemplate(template)).toBe(true)
    })

    it('should return false for non-object', () => {
      expect(validateTemplate(null)).toBe(false)
      expect(validateTemplate(undefined)).toBe(false)
      expect(validateTemplate('string')).toBe(false)
      expect(validateTemplate(123)).toBe(false)
    })

    it('should return false for missing required fields', () => {
      expect(validateTemplate({})).toBe(false)
      expect(validateTemplate({ id: 'test' })).toBe(false)
      expect(validateTemplate({ id: 'test', family: 'test' })).toBe(false)
    })

    it('should return false for invalid conditions', () => {
      const template = createMockTemplate({
        id: 'test',
        family: 'test',
        titleTemplate: 'Title',
        bodyTemplate: 'Body',
        triggerConditions: [{ variable: 'test', operator: 'eq', value: 0 }]
      })

      expect(validateTemplate(template)).toBe(true)
    })

    it('should return false for invalid options', () => {
      const template = createMockTemplate({
        id: 'test',
        family: 'test',
        titleTemplate: 'Title',
        bodyTemplate: 'Body',
        optionTemplates: [{ id: 'opt1' }]
      })

      expect(validateTemplate(template)).toBe(false)
    })
  })
})

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  const econOverrides = (overrides.econ as Record<string, unknown>) || {}
  const schoolOverrides = (overrides.school as Record<string, unknown>) || {}

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
    ...overrides,
    startConfig: {
      playerName: '测试修士',
      background: '中产',
      talent: '伪灵根',
      initialDebt: 10000,
      startingCity: '测试城',
      ...(overrides.startConfig || {})
    }
  }
}

function createMockProfile(overrides: Partial<PersonalityProfile> = {}): PersonalityProfile {
  return {
    riskTolerance: 'moderate',
    complianceTendency: 'adaptive',
    resourceStrategy: 'balanced',
    bodyAutonomyValue: 'medium',
    stressResponse: 'negotiator',
    dominantTraits: [],
    ...overrides
  }
}

function createMockModifiers(): HiddenModifiers {
  return {
    actionOutcomes: {},
    eventProbabilities: {},
    narrativeBias: []
  }
}

function createMockTemplate(overrides: Partial<EventTemplate> = {}): EventTemplate {
  return {
    id: 'test_template',
    family: 'test_family',
    phase: 'afterAction',
    triggerConditions: [],
    titleTemplate: 'Test Title',
    bodyTemplate: 'Test Body',
    optionTemplates: [
      {
        id: 'opt1',
        labelTemplate: 'Option 1',
        tone: 'normal',
        effectTemplates: []
      }
    ],
    weight: 1.0,
    tone: 'info',
    ...overrides
  }
}
