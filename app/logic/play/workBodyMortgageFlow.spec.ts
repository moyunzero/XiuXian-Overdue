import { describe, expect, it } from 'vitest'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { createHsFieldsFromStart } from '~/logic/play/createHsPlayState'
import { createWorkStateFromUni } from '~/logic/play/createWorkPlayState'
import { applyJobChoice } from '~/logic/play/workFlow'
import {
  applyBodyMortgageToRun,
  dismissBodyMortgage,
  shouldOfferBodyMortgage
} from '~/logic/play/bodyMortgage'
import {
  afterWorkRoundGate,
  resumePressureAfterWorkSetpiece,
  shouldBeginNextPressureRoundAfterResolve,
  workSetpieceBlocksPlay
} from '~/logic/play/setpieceFlow'
import {
  canEndRound,
  resolvePressureRound,
  startPressureRound,
  togglePressureCard
} from '~/logic/play/pressureDeck'
import { mulberry32 } from '~/utils/rng'

const start = {
  playerName: '试玩',
  background: '贫民' as const,
  talent: '无灵根' as const,
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

function workRunWithJob() {
  const hs = createHsFieldsFromStart(start)
  let run = createPlayRunFromStartConfig(start, 'slot1')
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

function distressedWorkRun() {
  const run = workRunWithJob()
  run.econ!.delinquency = 4
  run.econ!.cash = 20
  run.econ!.debtPrincipal = 90_000
  run.econ!.debtInterestAccrued = 5000
  run.econ!.lastPaymentDay = 0
  run.school!.day = 28
  return run
}

describe('workBodyMortgageFlow', () => {
  it('afterWorkRoundGate 在职场逾期时可挂身体抵押并阻塞压力牌', () => {
    const run = distressedWorkRun()
    expect(shouldOfferBodyMortgage(run, () => 0).trigger).toBe(true)

    const gated = afterWorkRoundGate(run, () => 0)
    expect(gated.setpiece?.bodyMortgagePending).toBeTruthy()
    expect(workSetpieceBlocksPlay(gated)).toBe(true)
    expect(shouldBeginNextPressureRoundAfterResolve(gated, 'work')).toBe(false)
  })

  it('未入职时不挂身体抵押', () => {
    let run = distressedWorkRun()
    run = { ...run, work: { ...run.work!, jobId: null } }
    const gated = afterWorkRoundGate(run, () => 0)
    expect(gated.setpiece?.bodyMortgagePending).toBeUndefined()
  })

  it('回合结算 → 抵押屏 → 拒绝后恢复压力回合', () => {
    let run = startPressureRound(distressedWorkRun(), mulberry32(3))
    const [a, b] = run.pressure!.offeredCardIds
    run = togglePressureCard(run, a!)
    run = togglePressureCard(run, b!)
    expect(canEndRound(run)).toBe(true)
    run = resolvePressureRound(run)
    run = afterWorkRoundGate(run, () => 0)
    expect(run.setpiece?.bodyMortgagePending).toBeTruthy()

    run = dismissBodyMortgage(run)
    run = resumePressureAfterWorkSetpiece(run)
    expect(run.setpiece?.bodyMortgagePending).toBeUndefined()
    expect(run.pressure?.resolved).toBe(false)
  })

  it('接受抵押后清除挂起并标记部位', () => {
    let run = afterWorkRoundGate(distressedWorkRun(), () => 0)
    run = applyBodyMortgageToRun(run, 'LeftPalm')
    run = resumePressureAfterWorkSetpiece(run)
    expect(run.setpiece?.bodyMortgagePending).toBeUndefined()
    expect(run.bodyPartRepayment?.LeftPalm).toBe(true)
  })
})
