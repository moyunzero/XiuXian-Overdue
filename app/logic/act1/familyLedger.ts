import type { Act1State, FamilyOutcome, LoanContract } from '~/types/act1'
import {
  FAMILY_GUARANTOR_RATE_BUMP,
  FAMILY_SAVED_COSTLY_CASH_COST
} from './act1Settlement'
import type { Act1Notification } from './loanProducts'

export type FamilyExpenseId = 'rent-root' | 'pill-pack' | 'cram-vip' | 'borrow-fee'

/** 要钱达到此次数后，催收进入「明显升级」档位 */
export const COLLECTION_ESCALATION_REQUESTS = 3

export interface FamilyExpense {
  id: FamilyExpenseId
  label: string
  cashCost: number
  resilienceDelta: number
  pressureDelta: number
  detail: string
}

export const FAMILY_EXPENSES: FamilyExpense[] = [
  {
    id: 'rent-root',
    label: '租灵根（首期）',
    cashCost: 2_000,
    resilienceDelta: -22,
    pressureDelta: 10,
    detail: '家庭账户划出大额，韧性骤降。'
  },
  {
    id: 'pill-pack',
    label: '培元药剂包',
    cashCost: 800,
    resilienceDelta: -12,
    pressureDelta: 6,
    detail: '停服则道心倒退——短信已群发。'
  },
  {
    id: 'cram-vip',
    label: '补习班 VIP',
    cashCost: 1_200,
    resilienceDelta: -14,
    pressureDelta: 5,
    detail: '家人沉默转账，备注仅「别丢脸」。'
  },
  {
    id: 'borrow-fee',
    label: '借读费首期',
    cashCost: 3_500,
    resilienceDelta: -20,
    pressureDelta: 12,
    detail: '与灵贷合同联动扣款，催收档位上升。'
  }
]

export interface CollectionBeat {
  stage: number
  title: string
  body: string
  choices: { id: string; label: string; disabled?: boolean; hint?: string }[]
}

export function hasRequestedExpense(state: Act1State, expenseId: FamilyExpenseId): boolean {
  return state.profileTags.includes(`spent-${expenseId}`)
}

export function canRequestFamilyExpense(state: Act1State, expenseId: FamilyExpenseId): boolean {
  if (state.completedModules.includes('family')) return false
  if (hasRequestedExpense(state, expenseId)) return false
  if (state.familyResilience <= 0) return false
  return FAMILY_EXPENSES.some((e) => e.id === expenseId)
}

export function isCollectionEscalated(state: Act1State): boolean {
  return state.familyMeta.moneyRequests >= COLLECTION_ESCALATION_REQUESTS
}

/** 第二档（联系人）是否已处理 */
export function isStage2CollectionResolved(state: Act1State): boolean {
  return (
    state.profileTags.includes('collection-shielded') ||
    state.profileTags.includes('family-contacted')
  )
}

/**
 * 当前可展示的最高催收档。
 * - 第 3 档（迁出 / 结局）：要钱满 3 次 **或** 第二档已处理（不必再刷 3 张卡）
 * - PRD 9.6 的「≥3 次」指催收话术加码（isCollectionEscalated），不是结案门槛
 */
export function maxCollectionStageForDisplay(state: Act1State): number {
  const { moneyRequests } = state.familyMeta
  if (moneyRequests < 1) return 0
  if (moneyRequests >= COLLECTION_ESCALATION_REQUESTS) return 3
  if (isStage2CollectionResolved(state)) return 3
  return 2
}

/** @deprecated 使用 maxCollectionStageForDisplay(state) */
export function maxCollectionStageByMoneyRequests(moneyRequests: number): number {
  if (moneyRequests < 1) return 0
  if (moneyRequests < COLLECTION_ESCALATION_REQUESTS) return 2
  return 3
}

/** 展示用催收档位（选项推进 + 第二档结案后直达结局节拍） */
export function displayCollectionStage(state: Act1State): number {
  const { moneyRequests, collectionStage } = state.familyMeta
  if (moneyRequests < 1) return 0

  const max = maxCollectionStageForDisplay(state)
  let stage = Math.max(0, collectionStage)
  if (isStage2CollectionResolved(state) && max >= 3 && stage < 3) {
    stage = 3
  }
  return Math.min(stage, max)
}

const COLLECTION_CHOICE_FEEDBACK: Partial<Record<string, string>> = {
  ack: '已确认。催收线程进入下一档。',
  delay: '宽限申请已记入档案，逾期档位 +1。',
  shield: '已扛下催收（压力 +8）。请在下方选择家人去留以结案。',
  'contact-family': '已联系家人（韧性 -30）。请在下方选择家人去留以结案。',
  'accept-left': '已接受迁出预警，结局将走向离家。',
  'pay-save': '挽留金与担保已记录。',
  'false-hope': '家庭周转贷已签约，档案已标记。'
}

export function getCollectionBeat(state: Act1State): CollectionBeat | null {
  const { moneyRequests } = state.familyMeta
  if (moneyRequests < 1) return null

  const stage = displayCollectionStage(state)
  if (stage < 1) return null

  const escalated = isCollectionEscalated(state)
  const shielded = state.profileTags.includes('collection-shielded')
  const familyContacted = state.profileTags.includes('family-contacted')
  const stage2Resolved = shielded || familyContacted

  const beats: CollectionBeat[] = [
    {
      stage: 1,
      title: '灵信 · 还款提醒',
      body: escalated
        ? '系统：您的备用修为额度已动用。请于三日内确认还款计划。回复「知道了」不会降低利息。'
        : '系统：额度已动用。当前为提醒档，继续向家里要钱将升级催收。',
      choices: [
        { id: 'ack', label: '知道了' },
        { id: 'delay', label: '申请宽限（记入档案）', hint: '逾期档位 +1' }
      ]
    },
    {
      stage: 2,
      title: '电话记录 · 联系人',
      body: shielded
        ? '你已扛下本轮催收，紧急联系人不会被拨打。'
        : familyContacted
          ? '紧急联系人已拨打，家庭韧性已受重创。'
          : escalated
            ? '催收员：我们联系不上你本人。是否授权拨打家庭紧急联系人？'
            : '催收员：请确认还款来源。再次要钱后可能联系紧急联系人。',
      choices: stage2Resolved
        ? []
        : [
            {
              id: 'shield',
              label: '你扛下，不联系家人',
              hint: '压力 +8 · 解锁迁出档「挽留」',
              disabled: familyContacted
            },
            {
              id: 'contact-family',
              label: '联系家人（韧性暴跌）',
              hint: '家庭韧性 -30 · 压力 +15',
              disabled: shielded
            }
          ]
    },
    {
      stage: 3,
      title: '桌面留言 · 迁出预警',
      body: escalated
        ? '家人留言文件（加急）：监护人已收到迁出备案提示。你必须在本节拍做出去留决定，否则系统将按默认离场归档。'
        : '家人留言文件：若本周再无周转，监护人将按制度迁出备案。请在本节拍选择一项以结案家庭模块。',
      choices: [
        { id: 'accept-left', label: '接受迁出（默认结局）', hint: '家人离场' },
        {
          id: 'pay-save',
          label: '支付挽留金 + 家庭担保',
          disabled: !shielded,
          hint: shielded ? `现金 -¥${FAMILY_SAVED_COSTLY_CASH_COST.toLocaleString()} · 利率 +${FAMILY_GUARANTOR_RATE_BUMP * 100}%` : '需先在上一节拍选择「你扛下」'
        },
        {
          id: 'false-hope',
          label: '再签家庭周转贷（假希望）',
          hint: '入账 ¥5,000 · 韧性锁 1 · 高息'
        }
      ]
    }
  ]

  const idx = Math.min(stage, beats.length) - 1
  return beats[idx] ?? null
}

/** 是否已出现家人去留选项（选任一项即结案家庭模块） */
export function hasFamilyEndingChoices(state: Act1State): boolean {
  const beat = getCollectionBeat(state)
  if (!beat || beat.stage < 3) return false
  return beat.choices.some((c) =>
    ['accept-left', 'pay-save', 'false-hope'].includes(c.id)
  )
}

export function buildFamilyGuarantorContract(day: number): LoanContract {
  return {
    id: `loan-family-guarantor-${Date.now()}`,
    lenderName: '家庭担保合约',
    principal: 20_000,
    drawn: 0,
    accruedInterest: 0,
    dailyRate: 0.012,
    graceDaysLeft: 0,
    nextRepaymentDay: day + 30,
    tags: ['family-guarantor', 'signed']
  }
}

export function buildFamilyBridgeContract(day: number): LoanContract {
  return {
    id: `loan-family-bridge-${Date.now()}`,
    lenderName: '家庭周转贷',
    principal: 5_000,
    drawn: 5_000,
    accruedInterest: 0,
    dailyRate: 0.015,
    graceDaysLeft: 0,
    nextRepaymentDay: day + 7,
    tags: ['family-bridge', 'signed']
  }
}

/**
 * 向家里索要某项开支：家庭划款给你（增加现金），消耗家庭韧性。
 */
export function applyFamilyExpense(state: Act1State, expenseId: FamilyExpenseId): Act1State {
  const exp = FAMILY_EXPENSES.find((e) => e.id === expenseId)
  if (!exp || !canRequestFamilyExpense(state, expenseId)) return state

  const moneyRequests = state.familyMeta.moneyRequests + 1
  let collectionStage = state.familyMeta.collectionStage
  if (moneyRequests >= 1 && collectionStage < 1) collectionStage = 1
  if (moneyRequests >= 2 && collectionStage < 2) collectionStage = 2
  if (moneyRequests >= COLLECTION_ESCALATION_REQUESTS && collectionStage < 3) collectionStage = 3

  let next: Act1State = {
    ...state,
    cash: state.cash + exp.cashCost,
    familyResilience: Math.max(0, state.familyResilience + exp.resilienceDelta),
    pressure: Math.min(100, state.pressure + exp.pressureDelta),
    delinquency: state.delinquency + (exp.id === 'borrow-fee' ? 1 : 0),
    profileTags: [...state.profileTags, `spent-${exp.id}`, `request-${exp.id}`],
    familyMeta: { moneyRequests, collectionStage, lastChoiceFeedback: undefined }
  }

  if (next.familyResilience <= 0 && moneyRequests >= 2) {
    next = {
      ...next,
      profileTags: [...next.profileTags, 'family-exhausted']
    }
  }

  return next
}

export function shouldAutoFamilyLeft(state: Act1State): boolean {
  return (
    !state.completedModules.includes('family') &&
    state.familyResilience <= 0 &&
    state.familyMeta.moneyRequests >= 2
  )
}

function withCollectionFeedback(meta: Act1State['familyMeta'], choiceId: string): Act1State['familyMeta'] {
  const lastChoiceFeedback = COLLECTION_CHOICE_FEEDBACK[choiceId]
  return lastChoiceFeedback ? { ...meta, lastChoiceFeedback } : meta
}

export function applyCollectionChoice(
  state: Act1State,
  choiceId: string
): { state: Act1State; forceOutcome?: FamilyOutcome } {
  if (choiceId === 'shield' && state.profileTags.includes('collection-shielded')) {
    return { state }
  }
  if (choiceId === 'contact-family' && state.profileTags.includes('family-contacted')) {
    return { state }
  }

  let next = { ...state }

  if (choiceId === 'delay') {
    next = { ...next, profileTags: [...next.profileTags, 'grace-requested'], delinquency: next.delinquency + 1 }
  }
  if (choiceId === 'contact-family') {
    next = {
      ...next,
      familyResilience: Math.max(0, next.familyResilience - 30),
      pressure: Math.min(100, next.pressure + 15),
      profileTags: [...next.profileTags, 'family-contacted']
    }
  }
  if (choiceId === 'shield') {
    next = {
      ...next,
      pressure: Math.min(100, next.pressure + 8),
      profileTags: [...next.profileTags, 'collection-shielded']
    }
  }
  if (choiceId === 'accept-left') {
    return {
      state: { ...next, familyMeta: withCollectionFeedback(next.familyMeta, choiceId) },
      forceOutcome: 'left'
    }
  }
  if (choiceId === 'pay-save') {
    if (!next.profileTags.includes('collection-shielded')) return { state: next }
    return {
      state: { ...next, familyMeta: withCollectionFeedback(next.familyMeta, choiceId) },
      forceOutcome: 'saved-costly'
    }
  }
  if (choiceId === 'false-hope') {
    return {
      state: { ...next, familyMeta: withCollectionFeedback(next.familyMeta, choiceId) },
      forceOutcome: 'saved-false-hope'
    }
  }

  const stage = next.familyMeta.collectionStage
  const maxStage = maxCollectionStageForDisplay(next)
  const nextStage = Math.min(stage + 1, maxStage)
  next = {
    ...next,
    familyMeta: withCollectionFeedback(
      nextStage > stage
        ? { ...next.familyMeta, collectionStage: nextStage }
        : next.familyMeta,
      choiceId
    )
  }
  return { state: next }
}

export function resolveFamilyEnding(state: Act1State, outcome: FamilyOutcome): Act1State {
  return { ...state, familyOutcome: outcome }
}

/** 三条家人结局的数值与合同副作用 */
export function applyFamilyOutcomeEffects(state: Act1State, outcome: FamilyOutcome): Act1State {
  let next = resolveFamilyEnding(state, outcome)

  if (outcome === 'saved-costly') {
    next = {
      ...next,
      cash: Math.max(0, next.cash - FAMILY_SAVED_COSTLY_CASH_COST),
      familyResilience: Math.min(100, next.familyResilience + 15),
      pressure: Math.min(100, next.pressure + 20),
      profileTags: [...new Set([...next.profileTags, 'family-saved-costly', 'family-guarantor'])],
      loans: [...next.loans, buildFamilyGuarantorContract(next.day)]
    }
  } else if (outcome === 'left') {
    next = {
      ...next,
      familyResilience: 0,
      pressure: Math.min(100, next.pressure + 8),
      profileTags: [...new Set([...next.profileTags, 'mother-left', 'witness-departure'])]
    }
  } else if (outcome === 'saved-false-hope') {
    next = {
      ...next,
      familyResilience: 1,
      pressure: Math.min(100, next.pressure + 10),
      profileTags: [...new Set([...next.profileTags, 'family-false-hope', 'family-bridge'])],
      loans: [...next.loans, buildFamilyBridgeContract(next.day)]
    }
  }

  return next
}

export function buildFamilyNotifications(state: Act1State): Act1Notification[] {
  const items: Act1Notification[] = []

  if (
    state.completedModules.includes('loan') &&
    !state.completedModules.includes('family')
  ) {
    items.push({
      id: 'n-family-ledger',
      title: '家庭账本待核对',
      body: '向家里要钱会消耗家庭韧性。满 3 次后催收将明显升级。',
      tone: 'warn'
    })
  }

  const beat = getCollectionBeat(state)
  if (beat) {
    items.push({
      id: `n-collection-${beat.stage}`,
      title: beat.title,
      body: beat.body,
      tone: isCollectionEscalated(state) ? 'danger' : 'warn'
    })
  }

  if (state.familyResilience <= 15 && !state.familyOutcome) {
    items.push({
      id: 'n-family-low',
      title: '家庭韧性预警',
      body: '韧性过低。可处理催收对话，或接受迁出结局。',
      tone: 'danger'
    })
  }

  return items
}
