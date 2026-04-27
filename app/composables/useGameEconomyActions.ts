import { type Ref } from 'vue'
import type { GameState } from '~/types/game'
import { uid } from '~/utils/rng'
import * as Engine from '~/logic/gameEngine'
import { applyRepaymentByPriority } from './useGame.economy'

interface UseGameComputed {
  totalDebt: Ref<number>
  minPayment: Ref<number>
  refreshProfileSnapshot: () => void
}

interface UseGameStorage {
  activeSlot: Ref<string>
  saveToSlot: (slotId: string) => void
}

export function useGameEconomyActions(
  game: Ref<GameState>,
  gameComputed: UseGameComputed,
  storage: UseGameStorage
) {
  const addLog = (g: GameState, title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
    g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
    if (g.logs.length > 120) g.logs.pop()
  }

  const creditLimit = (totalDebt: number) => Math.max(2000, 50000 - totalDebt)

  const borrow = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    const effectiveCreditLimit = creditLimit(gameComputed.totalDebt.value)

    if (a > effectiveCreditLimit) {
      addLog(g, '额度不足', `当前可借额度仅¥${Math.floor(effectiveCreditLimit).toLocaleString()}，申请被拒绝。`, 'danger')
      storage.saveToSlot(storage.activeSlot.value)
      return
    }
    const effectivePrincipal = g.bodyReputation === 'marked' ? Math.floor(a * 1.2) : a
    g.econ.debtPrincipal += effectivePrincipal
    g.econ.cash += a
    const logDetail =
      g.bodyReputation === 'marked'
        ? `经系统评估，您的申请已通过。到账¥${a.toLocaleString()}。`
        : `你借到¥${a.toLocaleString()}。利息不会因为你的梦想而心软。`
    addLog(g, '借贷到账', logDetail, 'warn')

    if (!g.sessionMetrics) {
      g.sessionMetrics = {
        actionCounts: {},
        borrowCount: 0,
        bodyPartRepaymentCount: 0,
        antiProfileActionCount: 0,
        restCount: 0,
        startTime: Date.now()
      }
    }
    g.sessionMetrics.borrowCount = (g.sessionMetrics.borrowCount || 0) + 1
    g.sessionMetrics.actionCounts['borrow'] = (g.sessionMetrics.actionCounts['borrow'] || 0) + 1

    gameComputed.refreshProfileSnapshot()
    storage.saveToSlot(storage.activeSlot.value)
  }

  const repay = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    if (g.econ.cash <= 0) return

    if (Engine.isDebtLocked(g)) {
      addLog(g, '还款被拒绝', '该债务已被系统锁定，必须通过身体抵押方式偿还。现金无法直接抵扣。', 'warn')
      storage.saveToSlot(storage.activeSlot.value)
      return
    }

    const budget = Math.min(a, g.econ.cash, gameComputed.totalDebt.value)
    const repayment = applyRepaymentByPriority(g, budget)
    if (repayment.totalPaid <= 0) {
      addLog(g, '还款未记账', '无可还债务或余额不足。', 'warn')
      storage.saveToSlot(storage.activeSlot.value)
      return
    }
    g.econ.cash -= repayment.totalPaid
    g.econ.lastPaymentDay = g.school.day
    let delinquencyNote = ''
    if (repayment.totalPaid >= gameComputed.minPayment.value && g.econ.delinquency > 0) {
      g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
      delinquencyNote = ` 逾期等级降低至${g.econ.delinquency}级。`
    }
    addLog(
      g,
      '还款',
      `系统已记账：¥${repayment.totalPaid.toLocaleString()}（利息¥${repayment.interestPaid.toLocaleString()}、费用¥${repayment.feePaid.toLocaleString()}、本金¥${repayment.principalPaid.toLocaleString()}）。${delinquencyNote}剩余债务：¥${(g.econ.debtPrincipal + g.econ.collectionFee + g.econ.debtInterestAccrued).toLocaleString()}。`,
      'ok'
    )
    gameComputed.refreshProfileSnapshot()
    storage.saveToSlot(storage.activeSlot.value)
  }

  return {
    creditLimit,
    borrow,
    repay
  }
}
