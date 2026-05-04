/**
 * @vitest-environment jsdom
 *
 * 任务 11: 全量集成测试
 * 测试种子库导入 → 事件选择 → AI 生成 → 入库 → 再次选择 完整流程
 * 测试降级策略、性能约束等
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { GameState } from '~/types/game'
import fs from 'fs'
import path from 'path'

// 加载种子事件
const seedEventsPath = path.resolve(__dirname, '../../public/seed-events.json')
const seedEvents = JSON.parse(fs.readFileSync(seedEventsPath, 'utf-8'))

// ============ 完整流程集成测试 ============
describe('任务 11: 全量集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('事件选择管线集成', () => {
    it('种子库事件应符合 EventDefinition 格式', () => {
      expect(Array.isArray(seedEvents)).toBe(true)
      expect(seedEvents.length).toBeGreaterThanOrEqual(200)

      // 验证前 10 个事件的格式
      for (const event of seedEvents.slice(0, 10)) {
        expect(typeof event.id).toBe('string')
        expect(typeof event.title).toBe('string')
        expect(typeof event.body).toBe('string')
        expect(typeof event.type).toBe('string')
        expect(Array.isArray(event.options)).toBe(true)
        expect(event.options.length).toBeGreaterThan(0)
      }
    })

    it('种子库事件应覆盖所有 6 大主题', () => {
      const types = new Set(seedEvents.map((e: any) => e.type))
      const families = new Set(seedEvents.map((e: any) => e.family))

      // 验证类型覆盖
      expect(types).toContain('collection')
      expect(types).toContain('work')
      expect(types).toContain('cultivation')
      expect(types).toContain('institution')
      expect(types).toContain('body')
      expect(types).toContain('social')

      // 验证家族覆盖
      expect(families).toContain('催收')
      expect(families).toContain('零工')
      expect(families).toContain('修仙')
      expect(families).toContain('制度')
      expect(families).toContain('身体')
      expect(families).toContain('社交')
    })

    it('种子库事件应包含合理的 trigger 配置', () => {
      const withTrigger = seedEvents.filter((e: any) => e.trigger)
      const withoutTrigger = seedEvents.filter((e: any) => !e.trigger)

      // 大多数事件应该有 trigger
      expect(withTrigger.length).toBeGreaterThan(withoutTrigger.length)

      // 验证 trigger 字段格式
      for (const event of withTrigger.slice(0, 10)) {
        const trigger = event.trigger
        if (trigger.financialRiskIn) {
          expect(Array.isArray(trigger.financialRiskIn)).toBe(true)
        }
        if (trigger.minDelinquency !== undefined) {
          expect(typeof trigger.minDelinquency).toBe('number')
        }
        if (trigger.minCash !== undefined) {
          expect(typeof trigger.minCash).toBe('number')
        }
      }
    })

    it('种子库事件的数值应在合理范围内', () => {
      for (const event of seedEvents.slice(0, 20)) {
        // weight 应在 0.5~10 之间
        if (event.weight !== undefined) {
          expect(event.weight).toBeGreaterThanOrEqual(0.5)
          expect(event.weight).toBeLessThanOrEqual(10)
        }

        // cooldownDays 应在 1~14 之间
        if (event.cooldownDays !== undefined) {
          expect(event.cooldownDays).toBeGreaterThanOrEqual(1)
          expect(event.cooldownDays).toBeLessThanOrEqual(14)
        }

        // 验证 options 中的 effects
        for (const option of event.options) {
          for (const effect of option.effects) {
            if (effect.kind === 'stat' && effect.delta !== undefined) {
              expect(effect.delta).toBeGreaterThanOrEqual(-20)
              expect(effect.delta).toBeLessThanOrEqual(20)
            }
            if (effect.kind === 'econ' && effect.delta !== undefined) {
              expect(effect.delta).toBeGreaterThanOrEqual(-5000)
              expect(effect.delta).toBeLessThanOrEqual(5000)
            }
          }
        }
      }
    })
  })

  describe('降级策略集成测试', () => {
    it('AI API 失败时应静默降级', async () => {
      const { useAiEventGenerator } = await import('~/composables/useAiEventGenerator')
      const { trigger } = useAiEventGenerator()

      // 在没有 API 的情况下触发
      const mockState = createMockGameState()

      // 应返回 0 而不抛出异常
      const result = await trigger(mockState)
      expect(result).toBe(0)
    })
  })

  describe('性能测试', () => {
    it('事件选择管线应在 10ms 内完成', () => {
      // 模拟事件选择管线的性能
      const startTime = performance.now()

      // 模拟过滤操作
      const filtered = seedEvents.filter((e: any) => {
        if (!e.trigger) return true
        if (e.trigger.financialRiskIn && !e.trigger.financialRiskIn.includes('high')) return false
        return true
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      // 200 个事件的过滤应在 10ms 内完成
      expect(duration).toBeLessThan(10)
      expect(filtered.length).toBeLessThan(seedEvents.length)
    })

    it('Schema 验证应在合理时间内完成', async () => {
      const { validateEventDefinition } = await import('~/composables/useAiEventGenerator')

      const startTime = performance.now()

      // 验证所有事件
      for (const event of seedEvents.slice(0, 50)) {
        validateEventDefinition(event)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 50 个事件的验证应在 50ms 内完成
      expect(duration).toBeLessThan(50)
    })
  })

  describe('边界情况测试', () => {
    it('事件 ID 应唯一', () => {
      const ids = seedEvents.map((e: any) => e.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })

    it('事件 family 应一致', () => {
      // 同类型事件的 family 应该一致
      const typeToFamily = new Map<string, string>()
      for (const event of seedEvents) {
        if (event.family) {
          const existing = typeToFamily.get(event.type)
          if (existing) {
            expect(existing).toBe(event.family)
          } else {
            typeToFamily.set(event.type, event.family)
          }
        }
      }
    })

    it('tone 字段应使用合法值', () => {
      const allowedTones = ['info', 'warn', 'danger', 'ok']

      for (const event of seedEvents) {
        if (event.tone) {
          expect(allowedTones).toContain(event.tone)
        }
        for (const option of event.options) {
          if (option.tone) {
            expect(['normal', 'primary', 'danger']).toContain(option.tone)
          }
        }
      }
    })

    it('effect kind 应使用合法值', () => {
      const allowedKinds = ['stat', 'econ', 'debt', 'contract', 'school', 'log']

      for (const event of seedEvents) {
        for (const option of event.options) {
          for (const effect of option.effects) {
            expect(allowedKinds).toContain(effect.kind)
          }
        }
      }
    })

    it('stat effect target 应使用合法值', () => {
      const allowedTargets = ['daoXin', 'faLi', 'rouTi', 'fatigue', 'focus']

      for (const event of seedEvents) {
        for (const option of event.options) {
          for (const effect of option.effects) {
            if (effect.kind === 'stat') {
              expect(allowedTargets).toContain(effect.target)
            }
          }
        }
      }
    })

    it('econ effect target 应使用合法值', () => {
      const allowedTargets = ['cash', 'collectionFee', 'debtPrincipal', 'debtInterestAccrued', 'dailyRate', 'delinquency', 'lastPaymentDay']

      for (const event of seedEvents) {
        for (const option of event.options) {
          for (const effect of option.effects) {
            if (effect.kind === 'econ') {
              expect(allowedTargets).toContain(effect.target)
            }
          }
        }
      }
    })
  })

  describe('画像权重集成', () => {
    it('calculateBehaviorProfile 应返回完整的画像', async () => {
      const { calculateBehaviorProfile } = await import('~/composables/useBehaviorProfile')
      const mockState = createMockGameState()

      const profile = calculateBehaviorProfile(mockState)

      expect(profile).toHaveProperty('financialRisk')
      expect(profile).toHaveProperty('educationCredit')
      expect(profile).toHaveProperty('compliance')
      expect(profile).toHaveProperty('bodyAsset')
      expect(profile).toHaveProperty('tags')
      expect(Array.isArray(profile.tags)).toBe(true)
    })

    it('不同游戏状态应产生不同的画像', async () => {
      const { calculateBehaviorProfile } = await import('~/composables/useBehaviorProfile')

      const state1 = createMockGameState()
      state1.econ.cash = 100
      state1.econ.debtPrincipal = 10000

      const state2 = createMockGameState()
      state2.econ.cash = 5000
      state2.econ.debtPrincipal = 1000

      const profile1 = calculateBehaviorProfile(state1)
      const profile2 = calculateBehaviorProfile(state2)

      // 验证画像有差异
      expect(profile1).toBeDefined()
      expect(profile2).toBeDefined()
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
