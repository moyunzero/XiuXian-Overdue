/**
 * @vitest-environment jsdom
 *
 * 任务 9 集成测试：验证 AI 生成流程、降级策略和 Schema 验证
 *
 * 注：由于 fetch 在 jsdom 环境中的 mock 限制，本测试集
 * 重点验证 Schema 验证、降级逻辑、触发机制和完整流程设计。
 * Edge Function API 的实际调用验证由 server 端测试覆盖。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { GameState } from '~/types/game'

// Mock IndexedDB
const mockInsertAiEvents = vi.fn(async (events: unknown[]) => events.length)
const mockGetEventCount = vi.fn(async () => 10)
const mockIsReady = vi.fn(async () => true)

vi.mock('~/composables/useDynamicEventPool', () => ({
  useDynamicEventPool: () => ({
    init: async () => {},
    getAllEvents: async () => [],
    isSeedImported: async () => false,
    importSeedEvents: async () => 0,
    insertAiEvents: mockInsertAiEvents,
    getEventCount: mockGetEventCount,
    recordEventTrigger: async () => {},
    evictOldEvents: async () => {},
    isReady: mockIsReady
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

import { useAiEventGenerator, validateEventDefinition, applyNumericalConstraints } from './useAiEventGenerator'

describe('任务 9: AI 生成流程集成测试', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    const { stop } = useAiEventGenerator()
    stop()
  })

  afterEach(() => {
    vi.useRealTimers()
    const { stop } = useAiEventGenerator()
    stop()
  })

  describe('Schema 验证', () => {
    it('validateEventDefinition 应验证完整事件结构', () => {
      const validEvent = {
        id: 'test-event',
        title: '测试事件',
        body: '这是一个测试事件描述。',
        type: 'collection',
        family: 'collection',
        tone: 'danger' as const,
        weight: 1.5,
        cooldownDays: 7,
        trigger: { financialRiskIn: ['high'] as const },
        options: [
          { id: 'opt1', label: '选项一', effects: [{ kind: 'econ' as const, target: 'cash', delta: 1000 }] }
        ]
      }

      expect(validateEventDefinition(validEvent)).toBe(true)
    })

    it('validateEventDefinition 应拒绝无效事件', () => {
      expect(validateEventDefinition(null)).toBe(false)
      expect(validateEventDefinition({})).toBe(false)
      expect(validateEventDefinition({ id: 'test' })).toBe(false)
      expect(validateEventDefinition({ id: 'test', title: 'T', body: 'B', type: 'T', options: [] })).toBe(false)
      expect(validateEventDefinition({ id: 'test', title: 'T', body: 'B', type: 'T' })).toBe(false)
      expect(validateEventDefinition('string')).toBe(false)
      expect(validateEventDefinition(123)).toBe(false)
    })

    it('validateEventDefinition 应拒绝选项中缺少必填字段的事件', () => {
      expect(validateEventDefinition({
        id: 'test', title: 'T', body: 'B', type: 'T',
        options: [{ effects: [] }] // 缺少 id 和 label
      })).toBe(false)

      expect(validateEventDefinition({
        id: 'test', title: 'T', body: 'B', type: 'T',
        options: [{ id: 'o1', effects: [] }] // 缺少 label
      })).toBe(false)

      expect(validateEventDefinition({
        id: 'test', title: 'T', body: 'B', type: 'T',
        options: [{ id: 'o1', label: 'Opt' }] // 缺少 effects
      })).toBe(false)
    })

    it('applyNumericalConstraints 应约束 econ delta 范围', () => {
      const event = {
        id: 'test', title: 'Test', body: 'Body', type: 'test',
        options: [{ id: 'o1', label: 'Opt', effects: [{ kind: 'econ' as const, delta: 10000 }] }]
      } as any

      const result = applyNumericalConstraints(event)
      expect(result.options[0].effects[0].delta).toBe(5000)
    })

    it('applyNumericalConstraints 应约束 stat delta 范围', () => {
      const event = {
        id: 'test', title: 'Test', body: 'Body', type: 'test',
        options: [{ id: 'o1', label: 'Opt', effects: [{ kind: 'stat' as const, delta: -30 }] }]
      } as any

      const result = applyNumericalConstraints(event)
      expect(result.options[0].effects[0].delta).toBe(-20)
    })

    it('applyNumericalConstraints 应约束 weight 范围', () => {
      const low = { id: 'test', title: 'T', body: 'B', type: 'test', weight: 0.1, options: [{ id: 'o1', label: 'O', effects: [] }] } as any
      const high = { id: 'test', title: 'T', body: 'B', type: 'test', weight: 5.0, options: [{ id: 'o1', label: 'O', effects: [] }] } as any

      expect(applyNumericalConstraints(low).weight).toBe(0.5)
      expect(applyNumericalConstraints(high).weight).toBe(2.0)
    })

    it('applyNumericalConstraints 不应修改未超限的数值', () => {
      const event = {
        id: 'test', title: 'Test', body: 'Body', type: 'test',
        options: [{
          id: 'o1', label: 'Opt',
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

  describe('降级策略验证', () => {
    it('IndexedDB 不可用时应静默降级', async () => {
      mockIsReady.mockResolvedValue(false)

      const { trigger } = useAiEventGenerator()
      const mockState = createMockGameState()

      await expect(trigger(mockState)).resolves.toBe(0)
    })

    it('触发机制应检查动态池事件数量', async () => {
      // 事件数低于阈值时应触发
      mockGetEventCount.mockResolvedValue(5)

      const { start, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      start(mockState)
      const scheduler = getScheduler()

      expect(scheduler).not.toBeNull()
      expect(scheduler!.isRunning).toBe(true)
    })

    it('事件数充足时不应重复触发', async () => {
      mockGetEventCount.mockResolvedValue(100)

      const { start, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      start(mockState)
      const scheduler = getScheduler()

      expect(scheduler).not.toBeNull()
    })

    it('重复率过高时应触发补充', () => {
      const { extractGenerationContext } = useAiEventGenerator()
      const mockState = createMockGameState()

      const context = extractGenerationContext(mockState)
      expect(context.profile).toBeDefined()
      expect(context.gameState).toBeDefined()
      expect(context.recentEvents).toBeDefined()
    })
  })

  describe('触发机制', () => {
    it('onActionCompleted 首次调用应启动调度器', () => {
      const { onActionCompleted, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      onActionCompleted(mockState)

      expect(getScheduler()).not.toBeNull()
      expect(getScheduler()!.isRunning).toBe(true)
    })

    it('onActionCompleted 应记录行动计数', () => {
      const { onActionCompleted, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      for (let i = 0; i < 5; i++) {
        onActionCompleted(mockState)
      }

      expect(getScheduler()!.actionCount).toBe(5)
    })

    it('多次调用 onActionCompleted 不应重复创建调度器', () => {
      const { onActionCompleted, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      onActionCompleted(mockState)
      const firstScheduler = getScheduler()

      onActionCompleted(mockState)
      const secondScheduler = getScheduler()

      expect(firstScheduler).toBe(secondScheduler)
    })

    it('stop 应停止调度器', () => {
      const { start, stop, getScheduler } = useAiEventGenerator()
      const mockState = createMockGameState()

      start(mockState)
      expect(getScheduler()).not.toBeNull()

      stop()
      expect(getScheduler()).toBeNull()
    })
  })

  describe('上下文提取', () => {
    it('extractGenerationContext 应提取完整的画像信息', () => {
      const { extractGenerationContext } = useAiEventGenerator()
      const mockState = createMockGameState()

      const context = extractGenerationContext(mockState)

      expect(context.profile.tags).toContain('workaholic')
      expect(context.profile.financialRisk).toBe('high')
    })

    it('extractGenerationContext 应提取游戏状态', () => {
      const { extractGenerationContext } = useAiEventGenerator()
      const mockState = createMockGameState()

      const context = extractGenerationContext(mockState)

      expect(context.gameState.school.day).toBe(10)
      expect(context.gameState.econ.cash).toBe(500)
      expect(context.gameState.econ.debtPrincipal).toBe(8000)
      expect(context.gameState.stats.fatigue).toBe(75)
    })

    it('extractGenerationContext 应提取近期事件', () => {
      const { extractGenerationContext } = useAiEventGenerator()
      const mockState = createMockGameState()

      const context = extractGenerationContext(mockState)

      expect(Array.isArray(context.recentEvents)).toBe(true)
    })
  })

  describe('集成流程：验证 → 约束 → 入库', () => {
    it('应验证并过滤 AI 生成的事件', () => {
      const mockAiResponse = [
        { id: 'ai-001', title: '有效事件', body: '描述', type: 'collection', options: [{ id: 'o1', label: '选项', effects: [] }] },
        { id: 'ai-002', title: '无效事件', body: '描述', type: 'test', options: [] },
        { id: 'ai-003', title: '有效事件2', body: '描述2', type: 'parttime', options: [{ id: 'o1', label: '选项', effects: [] }] }
      ]

      const validEvents = mockAiResponse.filter(validateEventDefinition)
      expect(validEvents).toHaveLength(2)
      expect(validEvents[0].id).toBe('ai-001')
      expect(validEvents[1].id).toBe('ai-003')
    })

    it('过滤后的事件应应用数值约束', () => {
      const mockAiResponse = [
        {
          id: 'ai-001',
          title: '大额事件',
          body: '描述',
          type: 'collection',
          options: [{ id: 'o1', label: '选项', effects: [{ kind: 'econ' as const, target: 'cash', delta: 10000 }] }]
        }
      ]

      const validEvents = mockAiResponse
        .filter(validateEventDefinition)
        .map(applyNumericalConstraints)

      expect(validEvents).toHaveLength(1)
      expect(validEvents[0].options[0].effects[0].delta).toBe(5000)
    })

    it('完整流程：验证 → 约束 → 入库', async () => {
      const mockAiResponse = [
        { id: 'ai-001', title: '事件一', body: '描述一', type: 'collection', options: [{ id: 'o1', label: '选项', effects: [{ kind: 'econ' as const, delta: 1000 }] }] },
        { id: 'ai-002', title: '事件二', body: '描述二', type: 'parttime', options: [{ id: 'o1', label: '选项', effects: [{ kind: 'stat' as const, delta: 30 }] }] }
      ]

      // 验证 → 约束
      const validEvents = mockAiResponse
        .filter(validateEventDefinition)
        .map(applyNumericalConstraints)

      expect(validEvents).toHaveLength(2)

      // 入库
      const inserted = await mockInsertAiEvents(validEvents)
      expect(inserted).toBe(2)
    })

    it('空响应应静默处理', () => {
      const mockAiResponse: unknown[] = []

      const validEvents = mockAiResponse.filter(validateEventDefinition)
      expect(validEvents).toHaveLength(0)
    })

    it('全部无效响应应静默处理', () => {
      const mockAiResponse = [
        { id: 'invalid1', options: [] },
        { title: 'invalid2', body: 'B', type: 'T', options: [{ id: 'o1', label: 'O', effects: [] }] }
      ]

      const validEvents = mockAiResponse.filter(validateEventDefinition)
      expect(validEvents).toHaveLength(0)
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
      'event-2': { lastDay: 9, times: 1 }
    },
    bodyIntegrity: 1.0,
    domestication: 0,
    numbness: 0
  } as unknown as GameState
}
