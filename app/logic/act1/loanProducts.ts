import type { Act1Modifiers, InterviewResult, LoanContract } from '~/types/act1'

export interface LoanProduct {
  id: string
  displayName: string
  principal: number
  graceDays: number
  baseDailyRate: number
  penaltyNote: string
  marketingLine: string
}

export const LOAN_PRODUCTS: LoanProduct[] = [
  {
    id: 'platform-standard',
    displayName: '天灵信贷 · 备用修为',
    principal: 12_000,
    graceDays: 30,
    baseDailyRate: 0.008,
    penaltyNote: '逾期按日计违约金；免息期内动用仍记征信。',
    marketingLine: '新用户三十天免息 · 额度随灵根画像浮动'
  },
  {
    id: 'aggressive-plus',
    displayName: '急用修为包',
    principal: 8_000,
    graceDays: 0,
    baseDailyRate: 0.018,
    penaltyNote: '无免息；提前结清仍收通道费。',
    marketingLine: '当日到账 · 适合已关闭多次推广的用户'
  }
]

export const LOAN_COMPARE_MS_REQUIRED = 30_000
export const DEFAULT_DRAW_AMOUNT = 3_000

export function getLoanProduct(id: string): LoanProduct | undefined {
  return LOAN_PRODUCTS.find((p) => p.id === id)
}

/** 关广告过多 → 主推急用包 */
export function pickDefaultProductId(adDismissCount: number, comparedProducts: boolean): string {
  if (adDismissCount >= 3) return 'aggressive-plus'
  if (comparedProducts) return 'platform-standard'
  return 'platform-standard'
}

/** 动用瞬间计提利息（免息期内为 0） */
export function interestOnDraw(loan: LoanContract, amount: number): number {
  if (amount <= 0) return 0
  if (loan.graceDaysLeft > 0) return 0
  return Math.round(amount * loan.dailyRate)
}

export function buildLoanContract(
  productId: string,
  mods: Act1Modifiers,
  interviewResult: InterviewResult | undefined,
  profileTags: string[],
  day = 1
): LoanContract | null {
  const product = getLoanProduct(productId)
  if (!product) return null

  let dailyRate = product.baseDailyRate * mods.regionRateMultiplier
  if (mods.loanRiskTier === 'high') dailyRate *= 1.15
  if (mods.loanRiskTier === 'low') dailyRate *= 0.92
  if (profileTags.includes('price-aware')) dailyRate *= 0.97
  if (interviewResult === 'reject') dailyRate *= 1.08

  const tags = ['signed', product.id, mods.loanRiskTier]

  return {
    id: `loan-${product.id}-${Date.now()}`,
    lenderName: product.displayName,
    principal: product.principal,
    drawn: 0,
    accruedInterest: 0,
    dailyRate: Math.round(dailyRate * 10000) / 10000,
    graceDaysLeft: product.graceDays,
    nextRepaymentDay: day + Math.max(product.graceDays, 7),
    tags
  }
}

/** 面试衔接：借读费分期附件（可与灵贷叠加） */
export function buildEnrollmentFeeContract(
  interviewResult: InterviewResult | undefined,
  mods: Act1Modifiers,
  day = 1
): LoanContract | null {
  if (interviewResult !== 'conditional' && interviewResult !== 'special' && interviewResult !== 'reject') {
    return null
  }

  const principal = interviewResult === 'reject' ? 18_000 : 15_000
  let dailyRate = 0.009 * mods.regionRateMultiplier
  if (interviewResult === 'reject') dailyRate *= 1.08
  if (mods.loanRiskTier === 'high') dailyRate *= 1.12

  const firstInstallment = interviewResult === 'reject' ? 2_500 : 2_000
  const interest = Math.round(firstInstallment * dailyRate)

  return {
    id: `loan-enrollment-${Date.now()}`,
    lenderName: '招办 · 借读费分期',
    principal,
    drawn: firstInstallment,
    accruedInterest: interest,
    dailyRate: Math.round(dailyRate * 10000) / 10000,
    graceDaysLeft: 0,
    nextRepaymentDay: day + 14,
    tags: ['enrollment-fee-rider', 'signed']
  }
}

export interface DrawCreditResult {
  creditLineUsed: number
  loans: LoanContract[]
  cashDelta: number
  interestAdded: number
}

/** 动用额度：记入合同 drawn、计提利息，并返回应入账现金 */
export function drawCredit(
  state: { creditLineUsed: number; loans: LoanContract[] },
  amount: number,
  contractId: string
): DrawCreditResult {
  if (amount <= 0) {
    return { creditLineUsed: state.creditLineUsed, loans: state.loans, cashDelta: 0, interestAdded: 0 }
  }

  let interestAdded = 0
  const loans = state.loans.map((loan) => {
    if (loan.id !== contractId) return loan
    const interest = interestOnDraw(loan, amount)
    interestAdded += interest
    const drawn = loan.drawn + amount
    if (drawn > loan.principal) {
      throw new Error(`draw exceeds credit limit for ${loan.id}`)
    }
    return {
      ...loan,
      drawn,
      accruedInterest: loan.accruedInterest + interest
    }
  })

  return {
    creditLineUsed: state.creditLineUsed + amount,
    loans,
    cashDelta: amount,
    interestAdded
  }
}

export function normalizeLoanContract(raw: LoanContract): LoanContract {
  const drawn = raw.drawn ?? 0
  return {
    ...raw,
    drawn,
    accruedInterest: raw.accruedInterest ?? 0
  }
}

export function loanBalance(loan: LoanContract): number {
  return loan.drawn + loan.accruedInterest
}

export interface Act1Notification {
  id: string
  title: string
  body: string
  tone: 'info' | 'warn' | 'danger'
}

/** 灵贷相关通知（供系统通知窗） */
export function buildLoanNotifications(state: {
  completedModules: string[]
  pendingTodos: string[]
  interview: { result?: InterviewResult }
  loans: LoanContract[]
  loanMeta: { adDismissCount: number; comparedProducts: boolean }
}): Act1Notification[] {
  const items: Act1Notification[] = []

  if (state.pendingTodos.includes('todo-loan-popup')) {
    items.push({
      id: 'n-loan-popup',
      title: '灵贷推广',
      body: '右下角弹窗待处理。关闭三次将推送更高档位产品。',
      tone: 'danger'
    })
  }

  if (
    state.completedModules.includes('interview') &&
    !state.completedModules.includes('loan')
  ) {
    if (state.interview.result === 'conditional' || state.interview.result === 'reject') {
      items.push({
        id: 'n-enrollment-rider',
        title: '借读费分期附件',
        body:
          state.interview.result === 'reject'
            ? '硬拒/借读通道：签约时将同步挂载借读费分期，利率上浮。'
            : '附条件录取：签约灵贷时将同步生成借读费分期合同。',
        tone: 'warn'
      })
    }
    if (state.loanMeta.adDismissCount >= 2) {
      items.push({
        id: 'n-ad-tier',
        title: '推广档位调整',
        body: `已关闭推广 ${state.loanMeta.adDismissCount} 次，系统可能主推「急用修为包」。`,
        tone: 'info'
      })
    }
    if (!state.loanMeta.comparedProducts) {
      items.push({
        id: 'n-compare',
        title: '比价阅读',
        body: '在灵贷中心对比表停留满 30 秒可记入「比价」标签并略微下调标准产品日息。',
        tone: 'info'
      })
    }
  }

  for (const loan of state.loans) {
    if (loan.nextRepaymentDay && loan.drawn > 0) {
      items.push({
        id: `n-repay-${loan.id}`,
        title: `${loan.lenderName} · 还款提醒`,
        body: `已动用 ¥${loan.drawn.toLocaleString()}，下一还款日：阶段第 ${loan.nextRepaymentDay} 日。`,
        tone: loan.graceDaysLeft > 0 ? 'info' : 'warn'
      })
    }
  }

  return items
}
