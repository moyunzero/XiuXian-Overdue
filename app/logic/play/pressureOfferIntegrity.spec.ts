import { describe, expect, it } from 'vitest'
import type { PressureCardDef } from '~/types/play'
import {
  PRESSURE_OFFER_COUNT,
  finalizeOfferedCardIds,
  isDegeneratePressureOffer,
  uniqueOfferedCount
} from './pressureOfferIntegrity'
import { cardsForLifeStage, startPressureRound } from './pressureDeck'
import { createPlayRunFromStartConfig } from './createPlayRun'
import { createHsFieldsFromStart } from './createHsPlayState'
import { createWorkStateFromUni } from './createWorkPlayState'
import { applyJobChoice } from './workFlow'
import { mulberry32 } from '~/utils/rng'

const start = {
  playerName: '试玩',
  background: '贫民' as const,
  talent: '无灵根' as const,
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

function errandWorkRun() {
  const hs = createHsFieldsFromStart(start)
  let run = createPlayRunFromStartConfig(start, 'slot1')
  run = {
    ...run,
    ...hs,
    lifeStage: 'work',
    profileTags: ['hs-graduated', 'uni-enrolled', 'tier-tail'],
    work: createWorkStateFromUni({
      ...run,
      profileTags: ['hs-graduated', 'uni-enrolled', 'tier-tail'],
      school: { ...hs.school!, classTier: '末位班' }
    })
  }
  run = applyJobChoice(run, 'errand-runner')
  run = {
    ...run,
    econ: { ...run.econ!, cash: 10_390, delinquency: 5, debtPrincipal: 22_987 }
  }
  return run
}

describe('pressureOfferIntegrity', () => {
  it('isDegeneratePressureOffer 识别四张同 ID', () => {
    expect(isDegeneratePressureOffer(['work-rest', 'work-rest', 'work-rest', 'work-rest'])).toBe(
      true
    )
    expect(isDegeneratePressureOffer(['a', 'b', 'c', 'd'])).toBe(false)
  })

  it('finalizeOfferedCardIds 在 eligible≥4 时产出 4 个不同 ID', () => {
    const eligible = cardsForLifeStage('work')
    expect(eligible.length).toBeGreaterThanOrEqual(PRESSURE_OFFER_COUNT)
    const run = errandWorkRun()
    for (let seed = 0; seed < 40; seed++) {
      const ids = finalizeOfferedCardIds(['work-rest'], eligible, run, mulberry32(seed))
      expect(uniqueOfferedCount(ids), `seed ${seed}`).toBe(PRESSURE_OFFER_COUNT)
    }
  })

  it('startPressureRound 职场 errand-runner 多 seed 无退化四同牌', () => {
    const run = errandWorkRun()
    for (let seed = 0; seed < 50; seed++) {
      const next = startPressureRound(run, mulberry32(seed))
      const ids = next.pressure!.offeredCardIds
      expect(isDegeneratePressureOffer(ids), `seed ${seed}: ${ids.join(',')}`).toBe(false)
      expect(uniqueOfferedCount(ids)).toBe(PRESSURE_OFFER_COUNT)
    }
  })
})
