import type { Act1State } from '~/types/act1'
import type { EconomyState } from '~/types/game'
import { loanBalance } from './loanProducts'

function roundRate(rate: number): number {
  return Math.round(rate * 1_000_000) / 1_000_000
}

/** 入学前夜账本并入高中 econ（同一 run 结转；meta 利率叠乘在 carryover 之后调用） */
export function mergeAct1LedgerIntoHsEcon(act1: Act1State, econ: EconomyState): EconomyState {
  const totalDrawn = act1.loans.reduce((sum, loan) => sum + loan.drawn, 0)
  const totalInterest = act1.loans.reduce((sum, loan) => sum + loan.accruedInterest, 0)
  const totalBalance = totalDrawn + totalInterest

  let dailyRate = econ.dailyRate
  if (totalBalance > 0) {
    dailyRate = act1.loans.reduce((sum, loan) => {
      const bal = loanBalance(loan)
      if (bal <= 0) return sum
      return sum + (bal / totalBalance) * loan.dailyRate
    }, 0)
    dailyRate = roundRate(dailyRate)
  }

  return {
    ...econ,
    cash: Math.max(0, Math.floor(act1.cash)),
    debtPrincipal: totalDrawn,
    debtInterestAccrued: totalInterest,
    dailyRate: dailyRate > 0 ? dailyRate : econ.dailyRate,
    delinquency: Math.max(econ.delinquency, act1.delinquency),
    lastPaymentDay: 0
  }
}

export function act1LedgerTotalDue(act1: Act1State): number {
  return act1.loans.reduce((sum, loan) => sum + loanBalance(loan), 0)
}
