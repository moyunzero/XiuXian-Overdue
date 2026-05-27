import { describe, expect, it } from 'vitest'
import { createInitialAct1State } from './createInitialAct1State'
import { isModuleUnlocked, markModuleComplete } from './moduleProgress'
import type { StartConfig } from '~/types/game'

const cfg: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

describe('moduleProgress', () => {
  it('面试默认可开，灵贷需面试完成', () => {
    let s = createInitialAct1State(cfg)
    expect(isModuleUnlocked(s, 'interview')).toBe(true)
    expect(isModuleUnlocked(s, 'loan')).toBe(false)
    s = markModuleComplete(s, 'interview')
    expect(isModuleUnlocked(s, 'loan')).toBe(true)
  })

  it('完成顺序不可跳关', () => {
    let s = createInitialAct1State(cfg)
    s = markModuleComplete(s, 'loan')
    expect(s.completedModules).not.toContain('loan')
  })
})
