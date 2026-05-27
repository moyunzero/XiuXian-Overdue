import { describe, expect, it } from 'vitest'
import { deriveAct1Modifiers } from './startConfigModifiers'
import type { StartConfig } from '~/types/game'

const base: StartConfig = {
  playerName: '测试',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 0,
  startingCity: '嵩阳市'
}

describe('deriveAct1Modifiers', () => {
  it('富户出身提高家庭韧性基线', () => {
    const rich = deriveAct1Modifiers({ ...base, background: '富户' })
    const poor = deriveAct1Modifiers({ ...base, background: '贫民' })
    expect(rich.familyResilienceBase).toBeGreaterThan(poor.familyResilienceBase)
  })

  it('高初始债务提高灵贷风控档位', () => {
    const high = deriveAct1Modifiers({ ...base, initialDebt: 80_000 })
    expect(high.loanRiskTier).toBe('high')
  })

  it('天灵根提高面试偏置分', () => {
    const t = deriveAct1Modifiers({ ...base, talent: '天灵根' })
    const n = deriveAct1Modifiers({ ...base, talent: '无灵根' })
    expect(t.interviewBias).toBeGreaterThan(n.interviewBias)
  })
})
