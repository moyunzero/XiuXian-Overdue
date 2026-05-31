import { describe, expect, it } from 'vitest'
import { applyPlayEffects, playEffectSliceFromRun } from '~/logic/play/playEffects'
import type { PlayRunState } from '~/types/play'

function minimalUniRun(): PlayRunState {
  return {
    schemaVersion: 4,
    runId: 'play-effects-test',
    runMode: 'endless',
    createdAt: '',
    updatedAt: '',
    lifeStage: 'uni',
    chapterIndex: 0,
    realmTier: 'foundation',
    realmIndex: 0,
    start: {
      playerName: '你',
      background: '贫民',
      talent: '无灵根',
      initialDebt: 0,
      startingCity: '嵩阳市'
    },
    slotId: 'slot1',
    runStatus: 'active',
    seed: 1,
    profileTags: [],
    logs: [],
    stats: { daoXin: 1, faLi: 1, rouTi: 0.6, fatigue: 0, focus: 50 },
    school: {
      day: 10,
      week: 2,
      slot: 'morning',
      classTier: '普通班',
      lastExamScore: 0,
      lastRank: 999,
      perks: { mealSubsidy: 0, focusBonus: 0 }
    },
    econ: {
      cash: 100,
      collectionFee: 0,
      debtPrincipal: 1000,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 0
    }
  }
}

describe('playEffects daoXin', () => {
  it('小步加成累加，不会在 1.5 前被 round 吞掉', () => {
    const slice = playEffectSliceFromRun(minimalUniRun())!
    const after = applyPlayEffects(slice, [
      { kind: 'stat', payload: { target: 'daoXin', op: 'add', value: 0.15 } },
      { kind: 'stat', payload: { target: 'daoXin', op: 'add', value: 0.08 } },
      { kind: 'stat', payload: { target: 'daoXin', op: 'add', value: 0.08 } },
      { kind: 'stat', payload: { target: 'daoXin', op: 'add', value: 0.15 } }
    ])
    expect(after.stats.daoXin).toBe(1.5)
  })

  it('多次 +0.08 可叠到筑基门槛 2', () => {
    const slice = playEffectSliceFromRun(minimalUniRun())!
    const effects = Array.from({ length: 13 }, () => ({
      kind: 'stat' as const,
      payload: { target: 'daoXin', op: 'add', value: 0.08 }
    }))
    const after = applyPlayEffects(slice, effects)
    expect(after.stats.daoXin).toBeGreaterThanOrEqual(2)
  })
})
