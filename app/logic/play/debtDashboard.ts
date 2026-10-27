import type { PlayRunState, DebtDashboardVM } from '~/types/play'
import { getSectChoiceById } from '~/logic/play/sectChoices'
import { getWorkCollectionBeat } from '~/logic/play/workCollection'

const PAYMENT_CYCLE_DAYS = 7

export function fullDebtFromRun(run: PlayRunState): number {
  if (!run.econ) return 0
  return run.econ.collectionFee + run.econ.debtPrincipal + run.econ.debtInterestAccrued
}

export function minPaymentForRun(run: PlayRunState): number {
  const debt = fullDebtFromRun(run)
  const del = run.econ?.delinquency ?? 0
  const base = Math.max(200, Math.floor(debt * 0.08))
  return base + del * 80
}

export interface AntiPatternLines {
  headline: string
  pressureDetail: string
  delinquency: number
  mingUnderpayStreak?: number
}

/** LOOP-06：逾期与冥币未达标反模式文案，数字与 run 字段同源 */
export function buildAntiPatternLines(run: PlayRunState): AntiPatternLines {
  const delinquency = run.econ?.delinquency ?? 0
  const mingUnderpayStreak = run.ghostLedger?.mingUnderpayStreak ?? 0
  const minPayment = minPaymentForRun(run)

  let headline = '本周账期已滚动入账'
  if (mingUnderpayStreak >= 2) {
    headline = `冥币配额连续 ${mingUnderpayStreak} 周未达标——阳债上浮已记入鬼账。`
  } else if (delinquency >= 2) {
    headline = `账期又紧了一档——最低还款已抬至 ¥${minPayment.toLocaleString()}（逾期 ${delinquency} 次）`
  }

  let pressureDetail = ''
  if (mingUnderpayStreak >= 1) {
    pressureDetail = `冥币配额 ${mingUnderpayStreak} 周未达标——阳债上浮已记入鬼账。`
  }

  return {
    headline,
    pressureDetail,
    delinquency,
    ...(mingUnderpayStreak >= 1 ? { mingUnderpayStreak } : {})
  }
}

export function buildDebtDashboardVM(run: PlayRunState): DebtDashboardVM | null {
  if (!run.econ || !run.school) return null
  const totalDue = fullDebtFromRun(run)
  const lastPay = run.econ.lastPaymentDay
  const nextPaymentDay = lastPay + PAYMENT_CYCLE_DAYS
  const daysUntilPayment = Math.max(0, nextPaymentDay - run.school.day)

  const antiPattern = buildAntiPatternLines(run)
  const base: DebtDashboardVM = {
    principal: run.econ.debtPrincipal,
    interestAccrued: run.econ.debtInterestAccrued,
    totalDue,
    nextPaymentDay,
    daysUntilPayment,
    delinquencyLevel: run.econ.delinquency,
    dailyRate: run.econ.dailyRate,
    collectionFee: run.econ.collectionFee,
    cash: run.econ.cash,
    minPayment: minPaymentForRun(run),
    antiPatternHeadline: antiPattern.headline,
    ...(run.ghostLedger
      ? {
          dualLedgerYang: run.ghostLedger.yangDebtCarried,
          dualLedgerMing: run.ghostLedger.mingCoin
        }
      : {}),
    ...(run.runMode === 'chapter' && run.chapter
      ? {
          billingPeriodLabel: `第 ${run.chapter.chapterWeekIndex}/${run.chapter.weekBudget} 周账期`,
          contractWeeksRemaining: run.chapter.weeksRemaining
        }
      : {})
  }

  if (run.lifeStage === 'work') {
    const projectedWeeklyInterest = Math.floor(run.econ.debtPrincipal * run.econ.dailyRate * 7)
    const beat = getWorkCollectionBeat(run.econ.delinquency)
    const compoundWarning =
      projectedWeeklyInterest > run.econ.cash
        ? '本周预估利息已超过现金结余——制度默认你还不起。'
        : undefined
    return {
      ...base,
      collectionFeeLabel: '五险一金池',
      maintenanceCoeff: run.maintenanceCoeff ?? 1,
      projectedWeeklyInterest,
      compoundWarning,
      workCollectionTitle: beat.title,
      workCollectionBody: beat.body
    }
  }

  if (run.lifeStage !== 'uni' || !run.uni) return base

  const activeSubs = run.uni.subscriptions.filter((s) => s.active)
  return {
    ...base,
    sectDisplayName: getSectChoiceById(run.uni.sectId)?.name,
    subscriptionMonthly: activeSubs.reduce((n, s) => n + s.monthlyCost, 0),
    maintenanceCoeff: run.maintenanceCoeff ?? 1
  }
}

export function debtPressurePercent(run: PlayRunState): number {
  const vm = buildDebtDashboardVM(run)
  if (!vm) return 0
  const cash = Math.max(1, vm.cash)
  return Math.min(100, Math.round((vm.totalDue / (vm.totalDue + cash)) * 100))
}
