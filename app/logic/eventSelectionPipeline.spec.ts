/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EventDefinition, GameState } from '~/types/game'
import type { BehaviorProfile } from '~/composables/useBehaviorProfile'

// 必须在模块顶层 mock
vi.mock('~/composables/useDynamicEventPool', () => ({
  useDynamicEventPool: () => ({
    init: async () => {},
    getAllEvents: async () => [],
    isSeedImported: async () => false,
    importSeedEvents: async () => 0,
    insertAiEvents: async () => 0,
    getEventCount: async () => 0,
    recordEventTrigger: async () => {},
    evictOldEvents: async () => {}
  })
}))

// 动态导入测试模块
import { calculateProfileMatchScore } from './eventSelectionPipeline'

function createEvent(overrides: Partial<EventDefinition> = {}): EventDefinition {
  return {
    id: 'test_event',
    title: 'Test Event',
    body: 'This is a test event.',
    type: 'test',
    phase: 'afterAction',
    weight: 1,
    trigger: {},
    options: [{ id: 'opt1', label: 'Option 1', effects: [] }],
    ...overrides
  }
}

describe('eventSelectionPipeline - 画像匹配', () => {
  describe('calculateProfileMatchScore', () => {
    it('无触发条件返回默认匹配度 0.5', () => {
      const event = createEvent({ trigger: undefined })
      const profile: BehaviorProfile = {
        financialRisk: 'low',
        educationCredit: 'good',
        compliance: 'neutral',
        bodyAsset: 'intact',
        tags: []
      }
      
      const score = calculateProfileMatchScore(event, profile)
      expect(score).toBe(0.5)
    })

    it('画像匹配时得分高', () => {
      const event = createEvent({
        trigger: { financialRiskIn: ['high', 'extreme'] }
      })
      const profile: BehaviorProfile = {
        financialRisk: 'high',
        educationCredit: 'good',
        compliance: 'neutral',
        bodyAsset: 'intact',
        tags: []
      }
      
      const score = calculateProfileMatchScore(event, profile)
      expect(score).toBe(1.0)
    })

    it('画像不匹配时得分低', () => {
      const event = createEvent({
        trigger: { financialRiskIn: ['high', 'extreme'] }
      })
      const profile: BehaviorProfile = {
        financialRisk: 'low',
        educationCredit: 'good',
        compliance: 'neutral',
        bodyAsset: 'intact',
        tags: []
      }
      
      const score = calculateProfileMatchScore(event, profile)
      expect(score).toBe(0.0)
    })

    it('多条件部分匹配', () => {
      const event = createEvent({
        trigger: { 
          financialRiskIn: ['high', 'extreme'],
          profileTagIn: ['workaholic']
        }
      })
      const profile: BehaviorProfile = {
        financialRisk: 'high',
        educationCredit: 'good',
        compliance: 'neutral',
        bodyAsset: 'intact',
        tags: ['workaholic', 'cultivator']
      }
      
      const score = calculateProfileMatchScore(event, profile)
      expect(score).toBe(1.0) // 2/2 匹配
    })
  })
})
