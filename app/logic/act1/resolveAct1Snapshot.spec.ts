import { describe, expect, it } from 'vitest'
import { createInitialAct1State } from './createInitialAct1State'
import { applyFamilyOutcomeEffects } from './familyLedger'
import { resolveAct1Snapshot, withAct1Snapshot } from './resolveAct1Snapshot'
import { createHsFieldsFromStart, ensureHsRunReady } from '~/logic/play/createHsPlayState'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import type { StartConfig } from '~/types/game'
import type { PlayRunState } from '~/types/play'

const cfg: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

describe('resolveAct1Snapshot', () => {
  it('ensureHsRunReady 为仅有 HS 字段、无 act1 的 run 补快照', () => {
    const act1 = applyFamilyOutcomeEffects(createInitialAct1State(cfg), 'left')
    const hs = createHsFieldsFromStart(cfg, undefined, act1)
    const run: PlayRunState = {
      ...createPlayRunFromStartConfig(cfg, 'slot1'),
      ...hs,
      lifeStage: 'hs',
      runStatus: 'active',
      inbox: []
    }
    expect(run.act1).toBeUndefined()

    const ready = ensureHsRunReady(run, undefined, act1)
    expect(ready.act1).toBeDefined()
    expect(ready.act1?.familyOutcome).toBe('left')
  })

  it('无 run.act1 时从 slot persist 解析，不依赖终章流程', () => {
    const act1 = applyFamilyOutcomeEffects(createInitialAct1State(cfg), 'left')
    const hs = createHsFieldsFromStart(cfg, undefined, act1)
    let run: PlayRunState = {
      ...createPlayRunFromStartConfig(cfg, 'slot1'),
      ...hs,
      lifeStage: 'hs',
      runStatus: 'active',
      inbox: [],
      setpiece: {},
      school: { ...hs.school!, day: 15, week: 3 }
    }
    const ready = ensureHsRunReady(run, undefined, act1)
    expect(ready.act1?.familyOutcome).toBe('left')
  })

  it('仅有 carryover 时合成最小 act1', () => {
    const run = withAct1Snapshot(
      {
        ...createPlayRunFromStartConfig(cfg, 'slot1'),
        carryoverFromAct1: {
          metaUnlocks: [],
          permanentModifiers: {},
          familyOutcome: 'saved-costly'
        }
      },
      null
    )
    expect(resolveAct1Snapshot(run).familyOutcome).toBe('saved-costly')
  })
})
