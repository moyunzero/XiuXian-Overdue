import type { GameState } from '~/types/game'

export function splitInitialDebtForGame(initialDebt: number): { principal: number } {
  const debt = Math.max(0, Math.floor(initialDebt))
  return { principal: debt }
}

export function weeklySystemFee(delinquency: number): number {
  return 600 + Math.max(0, delinquency) * 200
}

export function applyWeeklyCollectionFee(g: GameState): number {
  const fee = weeklySystemFee(g.econ.delinquency)
  g.econ.collectionFee = Math.max(0, g.econ.collectionFee + fee)
  return fee
}

export function applyRepaymentByPriority(g: GameState, budget: number): {
  feePaid: number
  interestPaid: number
  principalPaid: number
  totalPaid: number
} {
  let remaining = Math.max(0, Math.floor(budget))

  const interestPaid = Math.min(remaining, Math.max(0, g.econ.debtInterestAccrued))
  g.econ.debtInterestAccrued = Math.max(0, g.econ.debtInterestAccrued - interestPaid)
  remaining -= interestPaid

  const feePaid = Math.min(remaining, Math.max(0, g.econ.collectionFee))
  g.econ.collectionFee = Math.max(0, g.econ.collectionFee - feePaid)
  remaining -= feePaid

  const principalPaid = Math.min(remaining, Math.max(0, g.econ.debtPrincipal))
  g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal - principalPaid)

  return {
    feePaid,
    interestPaid,
    principalPaid,
    totalPaid: feePaid + interestPaid + principalPaid
  }
}

export function executeImmediatePayment(g: GameState, requestedAmount: number) {
  const budget = Math.max(0, Math.floor(requestedAmount))
  const repayment = applyRepaymentByPriority(g, budget)
  if (repayment.totalPaid <= 0) {
    return {
      success: false as const,
      paid: 0
    }
  }
  g.econ.cash = Math.max(0, g.econ.cash - repayment.totalPaid)
  g.econ.lastPaymentDay = g.school.day
  g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
  return {
    success: true as const,
    paid: repayment.totalPaid
  }
}

export const __test__economy = {
  splitInitialDebtForGame,
  weeklySystemFee,
  applyWeeklyCollectionFee,
  applyRepaymentByPriority,
  executeImmediatePayment
}
