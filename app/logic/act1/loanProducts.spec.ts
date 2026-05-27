import { describe, expect, it } from 'vitest'
import { deriveAct1Modifiers } from './startConfigModifiers'
import type { StartConfig } from '~/types/game'
import {
  buildEnrollmentFeeContract,
  buildLoanContract,
  drawCredit,
  interestOnDraw,
  loanBalance,
  pickDefaultProductId
} from './loanProducts'

describe('loanProducts', () => {
  it('关广告 3 次主推急用包', () => {
    expect(pickDefaultProductId(3, false)).toBe('aggressive-plus')
    expect(pickDefaultProductId(0, true)).toBe('platform-standard')
  })

  it('签约生成合同并带地区系数', () => {
    const cfg: StartConfig = {
      playerName: '你',
      background: '贫民',
      talent: '无灵根',
      initialDebt: 60_000,
      startingCity: '昆墟'
    }
    const mods = deriveAct1Modifiers(cfg)
    const contract = buildLoanContract('platform-standard', mods, 'conditional', [])
    expect(contract).not.toBeNull()
    expect(contract!.principal).toBe(12_000)
    expect(contract!.drawn).toBe(0)
    expect(contract!.dailyRate).toBeGreaterThan(0)
    expect(contract!.graceDaysLeft).toBe(30)
  })

  it('附条件录取生成借读费附件', () => {
    const cfg: StartConfig = {
      playerName: '你',
      background: '中产',
      talent: '伪灵根',
      initialDebt: 0,
      startingCity: '昆墟'
    }
    const mods = deriveAct1Modifiers(cfg)
    const rider = buildEnrollmentFeeContract('conditional', mods)
    expect(rider).not.toBeNull()
    expect(rider!.drawn).toBeGreaterThan(0)
    expect(rider!.tags).toContain('enrollment-fee-rider')
  })

  it('drawCredit 增加动用本金、利息与现金入账', () => {
    const contract = buildLoanContract(
      'aggressive-plus',
      deriveAct1Modifiers({
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 0,
        startingCity: '昆墟'
      }),
      'reject',
      []
    )!
    const state = { creditLineUsed: 0, loans: [contract] }
    const next = drawCredit(state, 3000, contract.id)
    expect(next.creditLineUsed).toBe(3000)
    expect(next.cashDelta).toBe(3000)
    expect(next.loans[0]!.drawn).toBe(3000)
    expect(next.interestAdded).toBe(interestOnDraw(contract, 3000))
    expect(loanBalance(next.loans[0]!)).toBe(3000 + next.interestAdded)
  })
})
