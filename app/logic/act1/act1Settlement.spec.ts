import { describe, expect, it } from 'vitest'
import { createInitialAct1State } from './createInitialAct1State'
import { applyFamilyOutcomeEffects } from './familyLedger'
import {
  deriveMetaUnlocks,
  derivePermanentModifiers,
  FAMILY_GUARANTOR_RATE_BUMP
} from './act1Settlement'
import type { StartConfig } from '~/types/game'

const cfg: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 0,
  startingCity: '昆墟'
}

describe('act1Settlement', () => {
  it('救母代价产生永久利率系数', () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyOutcomeEffects(state, 'saved-costly')
    const mods = derivePermanentModifiers(state)
    expect(mods.interestRateMultiplier).toBeCloseTo(1 + FAMILY_GUARANTOR_RATE_BUMP)
    expect(deriveMetaUnlocks(state)).toContain('family-guarantor')
  })

  it('离场解锁 witness-departure', () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyOutcomeEffects(state, 'left')
    expect(deriveMetaUnlocks(state)).toContain('witness-departure')
    expect(derivePermanentModifiers(state).interestRateMultiplier).toBeUndefined()
  })

  it('假希望解锁 family-false-hope 并增加周转贷', () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyOutcomeEffects(state, 'saved-false-hope')
    expect(state.loans.some((l) => l.lenderName.includes('周转'))).toBe(true)
    expect(deriveMetaUnlocks(state)).toContain('family-false-hope')
  })
})
