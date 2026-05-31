import { describe, expect, it } from 'vitest'
import type { PlayRunState } from '~/types/play'
import type { StartConfig } from '~/types/game'
import { createHsFieldsFromStart } from '~/logic/play/createHsPlayState'
import {
  applyBodyMortgageToRun,
  buildBodyMortgagePending,
  shouldOfferBodyMortgage,
  debtAfterMortgageDelta
} from '~/logic/play/bodyMortgage'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'

const start: StartConfig = {
  playerName: '测试',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 12000,
  startingCity: '嵩阳市'
}

function hsRun(overrides?: Partial<PlayRunState>): PlayRunState {
  const hs = createHsFieldsFromStart(start)
  return {
    schemaVersion: 4,
    runId: 'test-run',
    runMode: 'endless',
    createdAt: '',
    updatedAt: '',
    lifeStage: 'hs',
    chapterIndex: 0,
    realmTier: 'mortal',
    realmIndex: 0,
    start,
    slotId: 'slot1',
    runStatus: 'active',
    logs: hs.logs,
    profileTags: hs.profileTags,
    inbox: [],
    ...hs,
    ...overrides
  }
}

describe('bodyMortgage play adapter', () => {
  it('逾期≥3 且现金不足时触发抵押 offer', () => {
    const run = hsRun()
    run.econ!.delinquency = 3
    run.econ!.cash = 40
    run.econ!.debtPrincipal = 60_000
    run.school!.day = 10

    expect(shouldOfferBodyMortgage(run, () => 0).trigger).toBe(true)
    const pending = buildBodyMortgagePending(run, () => 0)
    expect(pending?.offers.length).toBeGreaterThan(0)
    expect(pending?.offers[0]?.irreversible).toBe(true)
  })

  it('最短路径：强制执行 → 左手掌抵押 → 债务下降 + lien 入账', () => {
    const run = hsRun()
    run.econ!.delinquency = 4
    run.econ!.cash = 20
    run.econ!.debtPrincipal = 90_000
    run.econ!.debtInterestAccrued = 5000
    run.econ!.lastPaymentDay = 0
    run.school!.day = 28

    const check = shouldOfferBodyMortgage(run, () => 0)
    expect(check.trigger).toBe(true)
    expect(check.mandatory).toBe(true)

    const beforeDebt = fullDebtFromRun(run)
    const after = applyBodyMortgageToRun(run, 'LeftPalm')

    expect(debtAfterMortgageDelta(run, after)).toBeGreaterThan(0)
    expect(fullDebtFromRun(after)).toBeLessThan(beforeDebt)
    expect(after.bodyPartRepayment?.LeftPalm).toBe(true)
    expect(after.bodyLiens?.length).toBe(1)
    expect(after.bodyLiens![0]).toMatch(/^lien-LeftPalm-/)
    expect(after.profileTags).toContain('body-marked')
    expect(after.setpiece?.bodyMortgagePending).toBeUndefined()
  })

  it('滚动负债为 0 时不触发抵押（即使逾期档位高）', () => {
    const run = hsRun()
    run.econ!.delinquency = 4
    run.econ!.cash = 0
    run.econ!.debtPrincipal = 0
    run.econ!.debtInterestAccrued = 0
    run.econ!.collectionFee = 0
    run.school!.day = 28

    expect(shouldOfferBodyMortgage(run, () => 0).trigger).toBe(false)
    expect(buildBodyMortgagePending(run, () => 0)).toBeNull()
  })

  it('臂部抵押须先偿还对应手掌', () => {
    const run = hsRun()
    run.econ!.delinquency = 3
    run.econ!.cash = 10
    run.econ!.debtPrincipal = 80_000
    run.school!.day = 28

    const unchanged = applyBodyMortgageToRun(run, 'LeftArm')
    expect(unchanged.bodyPartRepayment?.LeftArm).toBeUndefined()

    const afterPalm = applyBodyMortgageToRun(run, 'LeftPalm')
    const afterArm = applyBodyMortgageToRun(afterPalm, 'LeftArm')
    expect(afterArm.bodyPartRepayment?.LeftArm).toBe(true)
  })
})
