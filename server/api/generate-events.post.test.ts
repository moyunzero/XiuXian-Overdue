/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'
import {
  buildGenerationPrompt,
  parseJsonFromContent,
  validateAndFilterEvents,
  applyNumericalConstraints,
  MIN_EVENTS,
  MAX_EVENTS
} from './generate-events.post'

describe('generate-events API 核心逻辑', () => {
  describe('buildGenerationPrompt', () => {
    it('应包含所有画像信息', () => {
      const context = {
        profile: {
          tags: ['workaholic', 'defaulter'],
          financialRisk: 'high',
          compliance: 'rebel',
          educationCredit: 'poor',
          bodyAsset: 'partial'
        },
        gameState: {
          school: { day: 15, classTier: '普通班' },
          econ: { cash: 500, debtPrincipal: 8000, delinquency: 2 },
          stats: { fatigue: 75 }
        },
        recentEvents: [
          { family: 'collection', title: '催收短信' },
          { family: 'parttime', title: '加班邀约' }
        ]
      }

      const prompt = buildGenerationPrompt(context)

      expect(prompt).toContain('workaholic, defaulter')
      expect(prompt).toContain('high')
      expect(prompt).toContain('rebel')
      expect(prompt).toContain('15')
      expect(prompt).toContain('500')
      expect(prompt).toContain('8000')
      expect(prompt).toContain('75')
      expect(prompt).toContain('collection: 催收短信')
      expect(prompt).toContain('parttime: 加班邀约')
      expect(prompt).toContain(`${MIN_EVENTS}~${MAX_EVENTS}`)
    })

    it('应处理缺失字段的情况', () => {
      const context = {}

      const prompt = buildGenerationPrompt(context)

      expect(prompt).toContain('无')
      expect(prompt).toContain('未知')
      expect(prompt).toContain('0')
    })
  })

  describe('parseJsonFromContent', () => {
    it('应解析直接 JSON 数组', () => {
      const content = JSON.stringify([{ id: 'test', title: 'Test' }])
      const result = parseJsonFromContent(content)

      expect(result).toHaveLength(1)
      expect((result as any)[0].id).toBe('test')
    })

    it('应解析 { events: [...] } 格式', () => {
      const content = JSON.stringify({ events: [{ id: 'test' }] })
      const result = parseJsonFromContent(content)

      expect(result).toHaveLength(1)
    })

    it('应解析 { data: [...] } 格式', () => {
      const content = JSON.stringify({ data: [{ id: 'test' }] })
      const result = parseJsonFromContent(content)

      expect(result).toHaveLength(1)
    })

    it('应提取 Markdown 代码块中的 JSON', () => {
      const content = '```json\n[{"id": "md-test"}]\n```'
      const result = parseJsonFromContent(content)

      expect(result).toHaveLength(1)
      expect((result as any)[0].id).toBe('md-test')
    })

    it('应提取 ``` 代码块中的 JSON（无语言标记）', () => {
      const content = '```\n[{"id": "plain-test"}]\n```'
      const result = parseJsonFromContent(content)

      expect(result).toHaveLength(1)
    })

    it('应提取纯文本中的 JSON 数组', () => {
      const content = 'Here is the result: [{"id": "embedded"}] end.'
      const result = parseJsonFromContent(content)

      expect(result).toHaveLength(1)
    })

    it('无法解析时应返回空数组', () => {
      const content = 'This is just text, no JSON here.'
      const result = parseJsonFromContent(content)

      expect(result).toEqual([])
    })
  })

  describe('validateAndFilterEvents', () => {
    const validEvent = {
      id: 'ai-001',
      title: '测试事件',
      body: '事件描述',
      type: 'collection',
      options: [
        { id: 'opt1', label: '选项一', effects: [] }
      ]
    }

    it('应保留有效事件', () => {
      const result = validateAndFilterEvents([validEvent])

      expect(result).toHaveLength(1)
    })

    it('应过滤缺少 id 的事件', () => {
      const { id, ...missingId } = validEvent
      const result = validateAndFilterEvents([missingId])

      expect(result).toHaveLength(0)
    })

    it('应过滤缺少 title 的事件', () => {
      const { title, ...missingTitle } = validEvent
      const result = validateAndFilterEvents([missingTitle])

      expect(result).toHaveLength(0)
    })

    it('应过滤缺少 body 的事件', () => {
      const { body, ...missingBody } = validEvent
      const result = validateAndFilterEvents([missingBody])

      expect(result).toHaveLength(0)
    })

    it('应过滤缺少 type 的事件', () => {
      const { type, ...missingType } = validEvent
      const result = validateAndFilterEvents([missingType])

      expect(result).toHaveLength(0)
    })

    it('应过滤空 options 的事件', () => {
      const result = validateAndFilterEvents([{ ...validEvent, options: [] }])

      expect(result).toHaveLength(0)
    })

    it('应过滤非对象输入', () => {
      const result = validateAndFilterEvents([null, 'string', 123, undefined])

      expect(result).toHaveLength(0)
    })

    it('应过滤非数组输入', () => {
      const result = validateAndFilterEvents('not an array' as any)

      expect(result).toEqual([])
    })

    it('应过滤选项中缺少 id 的事件', () => {
      const badOption = { ...validEvent, options: [{ label: 'no id', effects: [] }] }
      const result = validateAndFilterEvents([badOption])

      expect(result).toHaveLength(0)
    })

    it('应过滤选项中缺少 label 的事件', () => {
      const badOption = { ...validEvent, options: [{ id: 'o1', effects: [] }] }
      const result = validateAndFilterEvents([badOption])

      expect(result).toHaveLength(0)
    })
  })

  describe('applyNumericalConstraints', () => {
    it('应设置默认 phase 为 afterAction', () => {
      const event: Record<string, unknown> = {
        id: 'test',
        options: []
      }

      const result = applyNumericalConstraints(event)

      expect(result.phase).toBe('afterAction')
    })

    it('应保留已有的 phase', () => {
      const event: Record<string, unknown> = {
        id: 'test',
        phase: 'endOfDay',
        options: []
      }

      const result = applyNumericalConstraints(event)

      expect(result.phase).toBe('endOfDay')
    })

    it('应将 weight 约束到 0.5~2.0 范围', () => {
      const low: Record<string, unknown> = { id: 'test', weight: 0.1, options: [] }
      const high: Record<string, unknown> = { id: 'test', weight: 5.0, options: [] }

      expect(applyNumericalConstraints(low).weight).toBe(0.5)
      expect(applyNumericalConstraints(high).weight).toBe(2.0)
    })

    it('应设置默认 weight 为 1.0', () => {
      const event: Record<string, unknown> = { id: 'test', options: [] }

      expect(applyNumericalConstraints(event).weight).toBe(1.0)
    })

    it('应设置默认 cooldownDays 为 7', () => {
      const event: Record<string, unknown> = { id: 'test', options: [] }

      expect(applyNumericalConstraints(event).cooldownDays).toBe(7)
    })

    it('应约束 econ effect 的 delta <= 5000', () => {
      const event: Record<string, unknown> = {
        id: 'test',
        options: [{
          id: 'o1',
          label: 'Test',
          effects: [{ kind: 'econ', delta: 10000 }]
        }]
      }

      const result = applyNumericalConstraints(event)
      const effects = (result.options as any[])[0].effects

      expect(effects[0].delta).toBe(5000)
    })

    it('应约束 stat effect 的 delta <= 20', () => {
      const event: Record<string, unknown> = {
        id: 'test',
        options: [{
          id: 'o1',
          label: 'Test',
          effects: [{ kind: 'stat', delta: 50 }]
        }]
      }

      const result = applyNumericalConstraints(event)
      const effects = (result.options as any[])[0].effects

      expect(effects[0].delta).toBe(20)
    })

    it('应约束负值 delta', () => {
      const event: Record<string, unknown> = {
        id: 'test',
        options: [{
          id: 'o1',
          label: 'Test',
          effects: [
            { kind: 'econ', delta: -8000 },
            { kind: 'stat', delta: -30 }
          ]
        }]
      }

      const result = applyNumericalConstraints(event)
      const effects = (result.options as any[])[0].effects

      expect(effects[0].delta).toBe(-5000)
      expect(effects[1].delta).toBe(-20)
    })
  })
})
