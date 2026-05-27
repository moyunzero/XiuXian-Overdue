import { describe, expect, it } from 'vitest'
import { defaultState } from '~/composables/useGameState'
import { createInitialAct1State } from './createInitialAct1State'
import { applyFamilyOutcomeEffects } from './familyLedger'
import { deriveMetaUnlocks, derivePermanentModifiers } from './act1Settlement'
import { applyAct1CarryoverToGame, carryoverFromPersist } from './act1Carryover'
import type { StartConfig } from '~/types/game'

const cfg: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

describe('act1Carryover', () => {
  it('从已结算存档提取 carryover', () => {
    let act1 = createInitialAct1State(cfg)
    act1 = applyFamilyOutcomeEffects(act1, 'saved-costly')
    const persist = {
      startConfig: cfg,
      act1,
      metaUnlocks: deriveMetaUnlocks(act1),
      permanentModifiers: derivePermanentModifiers(act1),
      settled: true
    }
    const c = carryoverFromPersist(persist)
    expect(c.metaUnlocks).toContain('family-guarantor')
    expect(c.permanentModifiers.interestRateMultiplier).toBeGreaterThan(1)
    expect(c.familyOutcome).toBe('saved-costly')
  })

  it('接入周目2时叠乘日利率并写入日志', () => {
    const g = defaultState()
    g.econ.dailyRate = 0.008
    applyAct1CarryoverToGame(g, {
      metaUnlocks: ['witness-departure'],
      permanentModifiers: { interestRateMultiplier: 1.08 },
      familyOutcome: 'left'
    })
    expect(g.econ.dailyRate).toBeCloseTo(0.008 * 1.08, 5)
    expect(g.act1Carryover?.metaUnlocks).toContain('witness-departure')
    expect(g.logs[0]?.title).toBe('制度档案结转')
  })
})
