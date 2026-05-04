/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { GameState } from '~/types/game'

// Mock IndexedDB 相关
vi.mock('~/composables/useDynamicEventPool', () => ({
  useDynamicEventPool: () => ({
    init: async () => {},
    getAllEvents: async () => [],
    isSeedImported: async () => false,
    importSeedEvents: async () => 0,
    insertAiEvents: async (events: unknown[]) => events.length,
    getEventCount: async () => 10,
    recordEventTrigger: async () => {},
    evictOldEvents: async () => {},
    isReady: async () => true
  })
}))

vi.mock('~/composables/useBehaviorProfile', () => ({
  calculateBehaviorProfile: (g: GameState) => ({
    financialRisk: 'high',
    educationCredit: 'fair',
    compliance: 'neutral',
    bodyAsset: 'intact',
    tags: ['workaholic']
  })
}))

import { useAiEventGenerator } from './useAiEventGenerator'

describe('useAiEventGenerator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const { stop } = useAiEventGenerator()
    stop()
  })

  afterEach(() => {
    vi.useRealTimers()
    const { stop } = useAiEventGenerator()
    stop()
  })

  describe('validateEventDefinition', () => {
    const validEvent = {
      id: 'test-event',
      title: '测试事件',
      body: '这是一个测试事件。',
      type: 'collection',
      options: [
        { id: 'opt1', label: '选项一', effects: [] }
      ]
    }

    it('应接受完整有效的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      expect(validateEventDefinition(validEvent)).toBe(true)
    })

    it('应拒绝非对象输入', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      expect(validateEventDefinition(null)).toBe(false)
      expect(validateEventDefinition(undefined)).toBe(false)
      expect(validateEventDefinition('string')).toBe(false)
      expect(validateEventDefinition(123)).toBe(false)
    })

    it('应拒绝缺少 id 的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      const { id, ...rest } = validEvent
      expect(validateEventDefinition(rest)).toBe(false)
    })

    it('应拒绝空 id', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      expect(validateEventDefinition({ ...validEvent, id: '' })).toBe(false)
    })

    it('应拒绝缺少 title 的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      const { title, ...rest } = validEvent
      expect(validateEventDefinition(rest)).toBe(false)
    })

    it('应拒绝缺少 body 的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      const { body, ...rest } = validEvent
      expect(validateEventDefinition(rest)).toBe(false)
    })

    it('应拒绝缺少 type 的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      const { type, ...rest } = validEvent
      expect(validateEventDefinition(rest)).toBe(false)
    })

    it('应拒绝空 options 数组', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      expect(validateEventDefinition({ ...validEvent, options: [] })).toBe(false)
    })

    it('应拒绝缺少 options 的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      const { options, ...rest } = validEvent
      expect(validateEventDefinition(rest)).toBe(false)
    })

    it('应拒绝选项中缺少 id 的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      const bad = { ...validEvent, options: [{ label: 'no id', effects: [] }] }
      expect(validateEventDefinition(bad)).toBe(false)
    })

    it('应拒绝选项中缺少 label 的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      const bad = { ...validEvent, options: [{ id: 'o1', effects: [] }] }
      expect(validateEventDefinition(bad)).toBe(false)
    })

    it('应拒绝选项中 effects 不是数组的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      const bad = { ...validEvent, options: [{ id: 'o1', label: 'Test', effects: 'not-array' }] }
      expect(validateEventDefinition(bad)).toBe(false)
    })

    it('应接受带有可选字段的事件', () => {
      const { validateEventDefinition } = useAiEventGenerator()
      const fullEvent = {
        ...validEvent,
        family: 'collection',
        tone: 'danger' as const,
        phase: 'afterAction' as const,
        weight: 1.5,
        cooldownDays: 7,
        maxTimes: 3,
        trigger: { financialRiskIn: ['high'] as const }
      }
      expect(validateEventDefinition(fullEvent)).toBe(true)
    })
  })

  describe('applyNumericalConstraints', () => {
    it('应约束 econ effect 的 delta 范围', () => {
      const { applyNumericalConstraints } = useAiEventGenerator()
      const event = {
        id: 'test',
        title: 'Test',
        body: 'Body',
        type: 'test',
        options: [{
          id: 'o1',
          label: 'Opt',
          effects: [{ kind: 'econ' as const, target: 'cash', delta: 10000 }]
        }]
      } as any

      const result = applyNumericalConstraints(event)
      expect(result.options[0].effects[0].delta).toBe(5000)
    })

    it('应约束 stat effect 的 delta 范围', () => {
      const { applyNumericalConstraints } = useAiEventGenerator()
      const event = {
        id: 'test',
        title: 'Test',
        body: 'Body',
        type: 'test',
        options: [{
          id: 'o1',
          label: 'Opt',
          effects: [{ kind: 'stat' as const, target: 'fatigue', delta: -30 }]
        }]
      } as any

      const result = applyNumericalConstraints(event)
      expect(result.options[0].effects[0].delta).toBe(-20)
    })

    it('应约束 weight 范围', () => {
      const { applyNumericalConstraints } = useAiEventGenerator()
      const lowWeight = {
        id: 'test', title: 'T', body: 'B', type: 'test', weight: 0.1,
        options: [{ id: 'o1', label: 'O', effects: [] }]
      } as any
      const highWeight = {
        id: 'test', title: 'T', body: 'B', type: 'test', weight: 5.0,
        options: [{ id: 'o1', label: 'O', effects: [] }]
      } as any

      expect(applyNumericalConstraints(lowWeight).weight).toBe(0.5)
      expect(applyNumericalConstraints(highWeight).weight).toBe(2.0)
    })

    it('不应修改未超限的数值', () => {
      const { applyNumericalConstraints } = useAiEventGenerator()
      const event = {
        id: 'test',
        title: 'Test',
        body: 'Body',
        type: 'test',
        options: [{
          id: 'o1',
          label: 'Opt',
          effects: [
            { kind: 'econ' as const, delta: 100 },
            { kind: 'stat' as const, delta: 5 }
          ]
        }]
      } as any

      const result = applyNumericalConstraints(event)
      expect(result.options[0].effects[0].delta).toBe(100)
      expect(result.options[0].effects[1].delta).toBe(5)
    })
  })

  describe('onActionCompleted', () => {
    it('首次调用应启动后台生成', () => {
      const { onActionCompleted, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      onActionCompleted(mockState)

      const scheduler = getScheduler()
      expect(scheduler).not.toBeNull()
      expect(scheduler?.isRunning).toBe(true)
    })

    it('第 5 次行动应触发生成', () => {
      const { onActionCompleted, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      for (let i = 0; i < 5; i++) {
        onActionCompleted(mockState)
      }

      const scheduler = getScheduler()
      expect(scheduler?.actionCount).toBe(5)
    })

    it('第 5 次行动前应记录计数', () => {
      const { onActionCompleted, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      for (let i = 0; i < 3; i++) {
        onActionCompleted(mockState)
      }

      expect(getScheduler()?.actionCount).toBe(3)
    })
  })

  describe('stopBackgroundGeneration', () => {
    it('应停止定时器并清空调度器', () => {
      const { start, stop, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      start(mockState)
      expect(getScheduler()).not.toBeNull()

      stop()
      expect(getScheduler()).toBeNull()
    })
  })

  describe('extractGenerationContext', () => {
    it('应提取完整的画像和游戏状态', () => {
      const { extractGenerationContext } = useAiEventGenerator()
      const mockState = createMockGameState()

      const context = extractGenerationContext(mockState)

      expect(context.profile).toBeDefined()
      expect(context.profile.tags).toContain('workaholic')
      expect(context.gameState.school.day).toBe(10)
      expect(context.gameState.econ.cash).toBe(500)
      expect(context.gameState.econ.debtPrincipal).toBe(8000)
      expect(context.gameState.stats.fatigue).toBe(75)
      expect(Array.isArray(context.recentEvents)).toBe(true)
    })
  })
})

function createMockGameState(): GameState {
  return {
    started: true,
    seed: 12345,
    stats: {
      daoXin: 2,
      faLi: 10,
      rouTi: 1.5,
      fatigue: 75,
      focus: 40
    },
    econ: {
      cash: 500,
      debtPrincipal: 8000,
      debtInterestAccrued: 400,
      collectionFee: 100,
      delinquency: 2,
      dailyRate: 0.01,
      lastPaymentDay: 5
    },
    school: {
      day: 10,
      week: 2,
      slot: 'morning',
      classTier: '普通班',
      perks: { mealSubsidy: 40, focusBonus: 0 },
      lastExamScore: 450
    },
    contract: {
      active: false,
      progress: 0,
      vigilance: 35,
      lastTriggerDay: 0,
      lastTriggerSlot: 'none'
    },
    logs: [],
    eventHistory: {
      'event-1': { lastDay: 8, times: 3 },
      'event-2': { lastDay: 9, times: 1 },
      'event-3': { lastDay: 5, times: 2 }
    },
    bodyIntegrity: 1.0,
    domestication: 0,
    numbness: 0
  } as unknown as GameState
}
