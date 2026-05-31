import { describe, expect, it } from 'vitest'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { createHsFieldsFromStart } from '~/logic/play/createHsPlayState'
import { createWorkStateFromUni } from '~/logic/play/createWorkPlayState'
import { applyJobChoice } from '~/logic/play/workFlow'
import {
  cardsForLifeStage,
  dealPressureCards,
  startPressureRound,
  togglePressureCard,
  canEndRound,
  resolvePressureRound,
  beginNextRoundAfterResolve,
  uniqueOfferedCount
} from '~/logic/play/pressureDeck'
import { isDegeneratePressureOffer } from '~/logic/play/pressureOfferIntegrity'
import { prepareWorkRunForPlay } from '~/logic/play/setpieceFlow'
import { buildDebtDashboardVM } from '~/logic/play/debtDashboard'
import { mulberry32 } from '~/utils/rng'

const start = {
  playerName: '试玩',
  background: '贫民' as const,
  talent: '无灵根' as const,
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

function workRunWithJob(): ReturnType<typeof applyJobChoice> {
  const hs = createHsFieldsFromStart(start)
  let run = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'endless' })
  run = {
    ...run,
    ...hs,
    lifeStage: 'work',
    maintenanceCoeff: 1.15,
    profileTags: ['hs-graduated', 'uni-enrolled', 'tier-tail'],
    work: createWorkStateFromUni({
      ...run,
      profileTags: ['hs-graduated', 'uni-enrolled', 'tier-tail'],
      school: { ...hs.school!, classTier: '末位班' }
    })
  }
  return applyJobChoice(run, 'warehouse-sort')
}

describe('workPressureFlow', () => {
  it('work 牌池至少 8 张', () => {
    expect(cardsForLifeStage('work').length).toBeGreaterThanOrEqual(8)
  })

  it('入职后 prepareWorkRunForPlay 开局压力回合', () => {
    const run = prepareWorkRunForPlay(workRunWithJob())
    expect(run.pressure).toBeTruthy()
    expect(run.pressure!.resolved).toBe(false)
    expect(run.pressure!.offeredCardIds.length).toBe(4)
    expect(isDegeneratePressureOffer(run.pressure!.offeredCardIds)).toBe(false)
    expect(uniqueOfferedCount(run.pressure!.offeredCardIds)).toBe(4)
  })

  it('dealPressureCards 不含未解锁岗位牌', () => {
    const run = workRunWithJob()
    const rand = mulberry32(42)
    const dealt = dealPressureCards(run, rand)
    expect(dealt.some((c) => c.id === 'work-shame-gig')).toBe(false)
    expect(dealt.every((c) => c.lifeStages.includes('work'))).toBe(true)
  })

  it('结算一轮后 KPI 上升且债务仪表盘含职场字段', () => {
    let run = startPressureRound(workRunWithJob(), mulberry32(7))
    const kpi0 = run.work!.kpiScore
    const [a, b] = run.pressure!.offeredCardIds
    run = togglePressureCard(run, a!)
    run = togglePressureCard(run, b!)
    expect(canEndRound(run)).toBe(true)
    run = resolvePressureRound(run)
    expect(run.work!.kpiScore).toBeGreaterThan(kpi0)
    const vm = buildDebtDashboardVM(run)
    expect(vm?.collectionFeeLabel).toBe('五险一金池')
    expect(vm?.workCollectionTitle).toBeTruthy()
    expect(vm?.projectedWeeklyInterest).toBeGreaterThan(0)
  })

  it('结算后可自动进入下一轮', () => {
    let run = startPressureRound(workRunWithJob(), () => 0.1)
    const [a, b] = run.pressure!.offeredCardIds
    run = togglePressureCard(run, a!)
    run = togglePressureCard(run, b!)
    run = resolvePressureRound(run)
    run = beginNextRoundAfterResolve(run)
    expect(run.pressure?.resolved).toBe(false)
    expect(run.pressure?.round).toBe(2)
  })
})
