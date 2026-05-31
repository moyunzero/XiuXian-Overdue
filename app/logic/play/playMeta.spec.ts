import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PLAY_META,
  enrichCarryoverWithPlayMeta,
  HIDDEN_STANDARD_DEBT_NEVER_ZERO,
  mergePriorMetaUnlocks,
  normalizePlayMeta,
  recordRunToPlayMeta
} from './playMeta'
import { carryoverFromPersist } from '~/logic/act1/act1Carryover'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import type { StartConfig } from '~/types/game'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'

const start: StartConfig = {
  playerName: '测试',
  background: '中产',
  initialDebt: 0,
  talent: '无灵根',
  startingCity: '嵩阳市'
}

describe('playMeta', () => {
  it('normalizePlayMeta 补全默认字段', () => {
    const m = normalizePlayMeta({ priorMetaUnlocks: ['witness-departure'] })
    expect(m.aiEventsEnabled).toBe(true)
    expect(m.campaignCompletions).toBe(0)
    expect(m.priorMetaUnlocks).toEqual(['witness-departure'])
  })

  it('mergePriorMetaUnlocks 满 2 条解锁隐藏标准', () => {
    const next = mergePriorMetaUnlocks(DEFAULT_PLAY_META, [
      'witness-departure',
      'family-guarantor'
    ])
    expect(next.hiddenStandardsRevealed).toContain(HIDDEN_STANDARD_DEBT_NEVER_ZERO)
  })

  it('enrichCarryoverWithPlayMeta 合并逾期加成与灵信提示', () => {
    const persist = {
      startConfig: start,
      act1: createInitialAct1State(start),
      metaUnlocks: [],
      permanentModifiers: {},
      settled: true
    }
    const base = carryoverFromPersist(persist)
    const meta = mergePriorMetaUnlocks(DEFAULT_PLAY_META, ['family-false-hope'])
    const out = enrichCarryoverWithPlayMeta(base, meta)
    expect(out.startingDelinquencyBias).toBeGreaterThan(0)
    expect(out.unlockedInboxHints?.length).toBeGreaterThan(0)
  })

  it('recordRunToPlayMeta 战役结案递增 completions', () => {
    let run = createPlayRunFromStartConfig(start, 'slot1')
    run = {
      ...run,
      runStatus: 'archived',
      campaign: { completedStages: ['hs', 'uni', 'work'], stageDebtSnapshot: {}, stageHarvestRate: {}, chosenEnding: 'asset' }
    }
    const next = recordRunToPlayMeta(DEFAULT_PLAY_META, run)
    expect(next.campaignCompletions).toBe(1)
  })
})
