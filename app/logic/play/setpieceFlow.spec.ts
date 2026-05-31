import { describe, expect, it } from 'vitest'
import type { PlayRunState } from '~/types/play'
import type { StartConfig } from '~/types/game'
import {
  endlessSetpieceBlocksPlay,
  hsSetpieceBlocksPressure,
  prepareEndlessRunForPlay
} from '~/logic/play/setpieceFlow'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'

const start: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

function baseRun(): PlayRunState {
  return {
    ...createPlayRunFromStartConfig(start, 'slot1', { runMode: 'endless' }),
    lifeStage: 'hs',
    pressure: {
      round: 1,
      offeredCardIds: ['hs-study', 'hs-rest', 'hs-parttime', 'hs-default'],
      playedCardIds: [],
      resolved: true
    }
  }
}

describe('setpieceFlow (endless-only)', () => {
  it('hsSetpieceBlocksPressure only checks valid exam/body', () => {
    expect(
      hsSetpieceBlocksPressure({
        ...baseRun(),
        setpiece: {
          examBossPending: {
            score: 600,
            rank: 50,
            classTier: '重点班',
            tierBefore: '普通班',
            tierAfter: '重点班',
            perksDelta: { mealSubsidy: 0, focusBonus: 0 },
            week: 4,
            perkSummary: 'test'
          }
        }
      })
    ).toBe(true)
    expect(
      hsSetpieceBlocksPressure({ ...baseRun(), setpiece: { examBossPending: {} as never } })
    ).toBe(false)
    expect(
      hsSetpieceBlocksPressure({ ...baseRun(), setpiece: { bodyMortgagePending: {} as never } })
    ).toBe(true)
    expect(hsSetpieceBlocksPressure(baseRun())).toBe(false)
  })

  it('endlessSetpieceBlocksPlay blocks breakthrough/body/job-choice', () => {
    const run = {
      ...baseRun(),
      lifeStage: 'work' as const,
      work: { jobId: null, educationTags: [], monthlyTarget: 0, kpiScore: 0, shameEvents: 0 }
    }
    expect(endlessSetpieceBlocksPlay(run)).toBe(true)
    expect(
      endlessSetpieceBlocksPlay({ ...run, work: { ...run.work!, jobId: 'errand-runner' } })
    ).toBe(false)
  })

  it('prepareEndlessRunForPlay starts next pressure round', () => {
    const run = prepareEndlessRunForPlay(baseRun())
    expect(run.pressure?.resolved).toBe(false)
  })

  it('prepareEndlessRunForPlay normalizes mortal realm to qi', () => {
    const run = prepareEndlessRunForPlay({
      ...baseRun(),
      realmTier: 'mortal'
    })
    expect(run.realmTier).toBe('qi')
  })

  it('prepareEndlessRunForPlay initializes endless runtime in hs stage', () => {
    const run = prepareEndlessRunForPlay({
      ...baseRun(),
      realmTier: 'qi',
      endless: undefined
    })
    expect(run.endless).toBeTruthy()
    expect(run.endless?.daysInCurrentRealm).toBe(0)
  })
})
