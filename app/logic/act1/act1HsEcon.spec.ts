import { describe, expect, it } from 'vitest'
import { createInitialAct1State } from './createInitialAct1State'
import { drawCredit, buildLoanContract } from './loanProducts'
import { deriveAct1Modifiers } from './startConfigModifiers'
import { mergeAct1LedgerIntoHsEcon, act1LedgerTotalDue } from './act1HsEcon'
import { defaultState } from '~/composables/useGameState'
import type { StartConfig } from '~/types/game'

const cfg: StartConfig = {
  playerName: '你',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 5000,
  startingCity: '嵩阳市'
}

describe('act1HsEcon', () => {
  it('合并 Act1 贷款本金/利息与现金', () => {
    let act1 = createInitialAct1State(cfg)
    const mods = deriveAct1Modifiers(cfg)
    const loan = buildLoanContract('platform-standard', mods, 'conditional', act1.profileTags)!
    act1 = {
      ...act1,
      loans: [...act1.loans, loan],
      cash: act1.cash + 2000
    }
    const drawn = drawCredit(act1, 3000, loan.id)
    act1 = { ...act1, loans: drawn.loans, creditLineUsed: drawn.creditLineUsed, cash: act1.cash + drawn.cashDelta }

    const base = defaultState().econ
    const merged = mergeAct1LedgerIntoHsEcon(act1, base)

    expect(merged.cash).toBe(Math.floor(act1.cash))
    expect(merged.debtPrincipal).toBe(act1.loans.reduce((s, l) => s + l.drawn, 0))
    expect(merged.debtInterestAccrued).toBeGreaterThanOrEqual(0)
    expect(merged.debtPrincipal + merged.debtInterestAccrued).toBe(act1LedgerTotalDue(act1))
    expect(merged.delinquency).toBeGreaterThanOrEqual(act1.delinquency)
  })

  it('按余额加权日利率', () => {
    const act1 = createInitialAct1State({ ...cfg, initialDebt: 0 })
    act1.loans = [
      {
        id: 'a',
        lenderName: 'A',
        principal: 10_000,
        drawn: 10_000,
        accruedInterest: 0,
        dailyRate: 0.01,
        graceDaysLeft: 0,
        tags: []
      },
      {
        id: 'b',
        lenderName: 'B',
        principal: 10_000,
        drawn: 10_000,
        accruedInterest: 0,
        dailyRate: 0.002,
        graceDaysLeft: 0,
        tags: []
      }
    ]
    const merged = mergeAct1LedgerIntoHsEcon(act1, defaultState().econ)
    expect(merged.dailyRate).toBeCloseTo(0.006, 5)
  })
})
