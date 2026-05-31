import { describe, expect, it } from 'vitest'
import type { StartConfig } from '~/types/game'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import { applyFamilyOutcomeEffects } from '~/logic/act1/familyLedger'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { settleAct1IntoPlayRun } from '~/logic/act1/act1PlayTransition'
import { prepareEndlessRunForPlay } from '~/logic/play/setpieceFlow'
import { buildBreakthroughPending, confirmBreakthrough } from '~/logic/play/breakthroughFlow'
import { resolvePressureRound } from '~/logic/play/pressureDeck'

const start: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 20_000,
  startingCity: '嵩阳市'
}

describe('endlessFromDay1Flow', () => {
  it('Act1 结算后直接进入 endless 首轮并自动段落推进', () => {
    const settledAct1 = applyFamilyOutcomeEffects(createInitialAct1State(start), 'left')
    const run = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'endless' })
    const hsRun = settleAct1IntoPlayRun(run, {
      startConfig: start,
      act1: settledAct1,
      metaUnlocks: [],
      permanentModifiers: {},
      settled: true
    })
    const ready = prepareEndlessRunForPlay({ ...hsRun, runMode: 'endless' })
    expect(ready.lifeStage).toBe('hs')
    expect(ready.pressure?.resolved).toBe(false)
    expect(ready.setpiece?.hsPromotionGatePending).toBeUndefined()
    expect(ready.setpiece?.uniFoundationGatePending).toBeUndefined()
    expect(ready.setpiece?.workPromotionGatePending).toBeUndefined()

    const pending = buildBreakthroughPending({
      ...ready,
      lifeStage: 'hs',
      realmTier: 'qi',
      endless: {
        maintenanceStack: 1,
        harvestRate: 0.2,
        daysInCurrentRealm: 6,
        breakthroughsCount: 0,
        irreversibleLiens: []
      }
    })
    expect(pending).not.toBeNull()
    const afterBreakthrough = confirmBreakthrough({
      ...ready,
      lifeStage: 'hs',
      realmTier: 'qi',
      setpiece: { ...ready.setpiece, breakthroughPending: pending! },
      endless: {
        maintenanceStack: 1,
        harvestRate: 0.2,
        daysInCurrentRealm: 6,
        breakthroughsCount: 0,
        irreversibleLiens: []
      }
    })
    expect(afterBreakthrough.lifeStage).toBe('uni')
    expect(afterBreakthrough.setpiece?.breakthroughPending).toBeUndefined()
    expect(afterBreakthrough.setpiece?.hsPromotionGatePending).toBeUndefined()
    expect(afterBreakthrough.setpiece?.uniFoundationGatePending).toBeUndefined()
    expect(afterBreakthrough.setpiece?.workPromotionGatePending).toBeUndefined()
  })

  it('hs endless 回合会累积境中日，避免破境卡死', () => {
    const settledAct1 = applyFamilyOutcomeEffects(createInitialAct1State(start), 'left')
    const run = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'endless' })
    const hsRun = settleAct1IntoPlayRun(run, {
      startConfig: start,
      act1: settledAct1,
      metaUnlocks: [],
      permanentModifiers: {},
      settled: true
    })
    const ready = prepareEndlessRunForPlay({ ...hsRun, runMode: 'endless' })
    expect(ready.endless).toBeTruthy()
    const simulated = resolvePressureRound({
      ...ready,
      pressure: {
        round: 1,
        offeredCardIds: ['hs-tuna', 'hs-rest', 'hs-library', 'hs-study'],
        playedCardIds: ['hs-tuna', 'hs-rest'],
        resolved: false
      }
    })
    expect(simulated.endless?.daysInCurrentRealm).toBeGreaterThanOrEqual(1)
  })
})
