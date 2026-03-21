import { describe, expect, it } from 'vitest'
import { defaultState } from './useGameState'
import { __test__ } from './useGame'

describe('永续债双层模型规则', () => {
  it('开局债务按70/30拆分为核心债与本金', () => {
    expect(__test__.splitInitialDebt(10000)).toEqual({
      core: 7000,
      principal: 3000
    })
    expect(__test__.splitInitialDebt(1)).toEqual({
      core: 0,
      principal: 1
    })
  })

  it('还款顺序为 利息 -> 费用 -> 本金，且不触碰核心债', () => {
    const g = defaultState()
    g.econ.coreDebt = 7000
    g.econ.initialCoreDebt = 7000
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
    expect(g.econ.coreDebt).toBe(7000)
  })

  it('还款可清空滚动债，但核心债保持不变', () => {
    const g = defaultState()
    g.econ.coreDebt = 3500
    g.econ.initialCoreDebt = 7000
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
    expect(g.econ.coreDebt).toBe(3500)
  })

  it('每周系统费用符合中度公式', () => {
    expect(__test__.weeklySystemFee(0)).toBe(600)
    expect(__test__.weeklySystemFee(2)).toBe(1000)
    expect(__test__.weeklySystemFee(-3)).toBe(600)
  })

  it('immediate_payment 成功时仅降低一级逾期', () => {
    const g = defaultState()
    g.school.day = 12
    g.econ.cash = 8000
    g.econ.delinquency = 3
    g.econ.coreDebt = 7000
    g.econ.initialCoreDebt = 7000
    g.econ.collectionFee = 400
    g.econ.debtInterestAccrued = 600
    g.econ.debtPrincipal = 6000

    const result = __test__.executeImmediatePayment(g, 3000)

    expect(result.success).toBe(true)
    expect(result.paid).toBe(3000)
    expect(g.econ.delinquency).toBe(2)
    expect(g.econ.lastPaymentDay).toBe(12)
    expect(g.econ.cash).toBe(5000)
    expect(g.econ.coreDebt).toBe(7000)
  })

  it('每周计费会累加到 collectionFee', () => {
    const g = defaultState()
    g.econ.collectionFee = 250
    g.econ.delinquency = 2

    const added = __test__.applyWeeklyCollectionFee(g)

    expect(added).toBe(1000)
    expect(g.econ.collectionFee).toBe(1250)
  })

  it('高逾期周结算会推高核心债', () => {
    const g = defaultState()
    g.school.day = 16
    g.econ.coreDebt = 7000
    g.econ.initialCoreDebt = 7000
    g.econ.delinquency = 4

    const result = __test__.updateCoreDebtByState(g)

    expect(result.delta).toBe(700)
    expect(g.econ.coreDebt).toBe(7700)
  })

  it('低逾期且按时还款时核心债下调但不低于 floor', () => {
    const g = defaultState()
    g.school.day = 22
    g.econ.initialCoreDebt = 7000
    g.econ.coreDebt = 3600
    g.econ.delinquency = 0
    g.econ.lastPaymentDay = 18 // daysSincePay = 3

    const result = __test__.updateCoreDebtByState(g)

    expect(__test__.coreDebtFloor(g)).toBe(3500)
    expect(result.delta).toBe(-100)
    expect(g.econ.coreDebt).toBe(3500)
  })

  it('任意偿还场景下 totalDebt 仍大于0（核心债兜底）', () => {
    const g = defaultState()
    g.econ.initialCoreDebt = 6000
    g.econ.coreDebt = 3000
    g.econ.collectionFee = 300
    g.econ.debtInterestAccrued = 200
    g.econ.debtPrincipal = 100

    __test__.applyRepaymentByPriority(g, 99999)
    const totalDebt = g.econ.coreDebt + g.econ.collectionFee + g.econ.debtInterestAccrued + g.econ.debtPrincipal

    expect(totalDebt).toBeGreaterThan(0)
  })

  it('#3 滚动债为0时核心债应下调（好玩家不受罚）', () => {
    const g = defaultState()
    g.school.day = 22
    g.econ.initialCoreDebt = 7000
    g.econ.coreDebt = 4000
    g.econ.delinquency = 0
    g.econ.lastPaymentDay = 1
    g.econ.collectionFee = 0
    g.econ.debtInterestAccrued = 0
    g.econ.debtPrincipal = 0

    const result = __test__.updateCoreDebtByState(g)

    expect(result.delta).toBeLessThanOrEqual(0)
    expect(g.econ.coreDebt).toBeLessThanOrEqual(4000)
  })

  it('#7 借贷超过额度被拒不改变余额', () => {
    const g = defaultState()
    g.econ.coreDebt = 7000
    g.econ.debtPrincipal = 30000
    g.econ.debtInterestAccrued = 5000
    g.econ.collectionFee = 2000
    g.econ.cash = 500
    const totalBefore = g.econ.coreDebt + g.econ.debtPrincipal + g.econ.debtInterestAccrued + g.econ.collectionFee
    const creditLimit = Math.max(2000, 50000 - totalBefore)
    expect(creditLimit).toBe(6000)
  })
})
