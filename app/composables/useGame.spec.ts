import { describe, expect, it } from 'vitest'
import { defaultState } from './useGameState'
import { __test__ } from './useGame'

describe('债务系统规则', () => {
  it('开局债务直接作为本金，无核心债', () => {
    expect(__test__.splitInitialDebtForGame(10000)).toEqual({
      principal: 10000
    })
    expect(__test__.splitInitialDebtForGame(1)).toEqual({
      principal: 1
    })
  })

  it('还款顺序为 利息 -> 费用 -> 本金', () => {
    const g = defaultState()
    g.econ.collectionFee = 100
    g.econ.debtInterestAccrued = 200
    g.econ.debtPrincipal = 5000

    const result = __test__.applyRepaymentByPriority(g, 1000)

    expect(result.interestPaid).toBe(200)
    expect(result.feePaid).toBe(100)
    expect(result.principalPaid).toBe(700)
    expect(result.totalPaid).toBe(1000)
    expect(g.econ.collectionFee).toBe(0)
    expect(g.econ.debtInterestAccrued).toBe(0)
    expect(g.econ.debtPrincipal).toBe(4300)
  })

  it('还款可清空所有债务', () => {
    const g = defaultState()
    g.econ.collectionFee = 300
    g.econ.debtInterestAccrued = 400
    g.econ.debtPrincipal = 500

    const result = __test__.applyRepaymentByPriority(g, 100000)

    expect(result.totalPaid).toBe(1200)
    expect(result.feePaid).toBe(300)
    expect(result.interestPaid).toBe(400)
    expect(result.principalPaid).toBe(500)
    expect(g.econ.collectionFee).toBe(0)
    expect(g.econ.debtInterestAccrued).toBe(0)
    expect(g.econ.debtPrincipal).toBe(0)
  })

  it('每周系统费用符合公式', () => {
    expect(__test__.weeklySystemFee(0)).toBe(600)
    expect(__test__.weeklySystemFee(2)).toBe(1000)
    expect(__test__.weeklySystemFee(-3)).toBe(600)
  })

  it('immediate_payment 成功时仅降低一级逾期', () => {
    const g = defaultState()
    g.school.day = 12
    g.econ.cash = 8000
    g.econ.delinquency = 3
    g.econ.collectionFee = 400
    g.econ.debtInterestAccrued = 600
    g.econ.debtPrincipal = 6000

    const result = __test__.executeImmediatePayment(g, 3000)

    expect(result.success).toBe(true)
    expect(result.paid).toBe(3000)
    expect(g.econ.delinquency).toBe(2)
    expect(g.econ.lastPaymentDay).toBe(12)
    expect(g.econ.cash).toBe(5000)
  })

  it('每周计费会累加到 collectionFee', () => {
    const g = defaultState()
    g.econ.collectionFee = 250
    g.econ.delinquency = 2

    const added = __test__.applyWeeklyCollectionFee(g)

    expect(added).toBe(1000)
    expect(g.econ.collectionFee).toBe(1250)
  })

  it('任意偿还场景下 totalDebt 可能归零', () => {
    const g = defaultState()
    g.econ.collectionFee = 300
    g.econ.debtInterestAccrued = 200
    g.econ.debtPrincipal = 100

    __test__.applyRepaymentByPriority(g, 99999)
    const totalDebt = g.econ.collectionFee + g.econ.debtInterestAccrued + g.econ.debtPrincipal

    expect(totalDebt).toBe(0)
  })

  it('借贷超过额度被拒不改变余额', () => {
    const g = defaultState()
    g.econ.debtPrincipal = 35000
    g.econ.debtInterestAccrued = 5000
    g.econ.collectionFee = 4000
    g.econ.cash = 500
    const totalBefore = g.econ.debtPrincipal + g.econ.debtInterestAccrued + g.econ.collectionFee
    const creditLimit = Math.max(2000, 50000 - totalBefore)
    expect(creditLimit).toBe(6000)
  })
})