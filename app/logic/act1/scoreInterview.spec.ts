import { describe, expect, it } from 'vitest'
import type { StartConfig } from '~/types/game'
import { deriveAct1Modifiers } from './startConfigModifiers'
import { scoreInterview } from './scoreInterview'

const baseAnswers = {
  sleep: 'under2',
  course: 'finishing',
  'family-invest': 'partial',
  'track-organ': 'aware',
  'track-soul': 'considering',
  'track-metabolism': 'no',
  'track-gender': 'open',
  honesty: 'yes'
}

function cfg(overrides: Partial<StartConfig>): StartConfig {
  return {
    playerName: '测试',
    background: '中产',
    talent: '无灵根',
    initialDebt: 0,
    startingCity: '嵩阳市',
    ...overrides
  }
}

describe('scoreInterview', () => {
  it('贫民差睡眠组合倾向低分/拒', () => {
    const c = cfg({ background: '贫民', talent: '无灵根' })
    const mods = deriveAct1Modifiers(c)
    const { score, result, tags } = scoreInterview(
      { ...baseAnswers, sleep: '5plus', course: 'behind', 'family-invest': 'none' },
      c,
      mods
    )
    expect(score).toBeLessThan(45)
    expect(['reject', 'conditional']).toContain(result)
    expect(tags).toContain('sleep-deficit')
  })

  it('天灵根+轨道+诚实可触发特招', () => {
    const c = cfg({ talent: '天灵根', background: '富户' })
    const mods = deriveAct1Modifiers(c)
    const { result, tags } = scoreInterview(
      {
        ...baseAnswers,
        'track-organ': 'signed',
        'track-soul': 'committed',
        'track-metabolism': 'adapted'
      },
      c,
      mods
    )
    expect(result).toBe('special')
    expect(tags).toContain('special-track-invite')
  })

  it('换出身改变分数门槛结果', () => {
    const poor = cfg({ background: '贫民' })
    const rich = cfg({ background: '富户' })
    const poorScore = scoreInterview(baseAnswers, poor, deriveAct1Modifiers(poor)).score
    const richScore = scoreInterview(baseAnswers, rich, deriveAct1Modifiers(rich)).score
    expect(richScore).toBeGreaterThan(poorScore)
  })
})
