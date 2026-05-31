/**
 * S0 线性三步大卡流程回归：面试 → 灵贷 → 家庭，最短路径 3 条。
 */
import { describe, expect, it } from 'vitest'
import type { StartConfig } from '~/types/game'
import { createInitialAct1State } from './createInitialAct1State'
import {
  applyCollectionChoice,
  applyFamilyExpense,
  applyFamilyOutcomeEffects
} from './familyLedger'
import {
  buildEnrollmentFeeContract,
  buildLoanContract,
  DEFAULT_DRAW_AMOUNT,
  pickDefaultProductId,
  drawCredit
} from './loanProducts'
import { markModuleComplete } from './moduleProgress'
import { deriveAct1Modifiers } from './startConfigModifiers'
import { scoreInterview } from './scoreInterview'
import {
  collectionLadderStage,
  deriveS0Step,
  moduleForS0Step,
  syncSetpieceFromAct1
} from './s0Flow'

const cfg: StartConfig = {
  playerName: '你',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 0,
  startingCity: '嵩阳市'
}

const rejectAnswers = {
  sleep: '5plus',
  course: 'behind',
  'family-invest': 'none',
  'track-organ': 'no',
  'track-soul': 'no',
  'track-metabolism': 'no',
  'track-gender': 'no',
  honesty: 'no'
}

function completeInterview(state = createInitialAct1State(cfg), answers = rejectAnswers) {
  const mods = deriveAct1Modifiers(cfg)
  const { score, result, tags } = scoreInterview(answers, cfg, mods)
  return markModuleComplete(
    {
      ...state,
      interview: { completed: true, result, score, answers },
      profileTags: [...new Set([...state.profileTags, ...tags])],
      pressure: state.pressure + (result === 'reject' ? 8 : 5)
    },
    'interview'
  )
}

function completeLoan(state: ReturnType<typeof completeInterview>) {
  const mods = deriveAct1Modifiers(cfg)
  const productId = pickDefaultProductId(state.loanMeta.adDismissCount, state.loanMeta.comparedProducts)
  const contract = buildLoanContract(
    productId,
    mods,
    state.interview.result,
    state.profileTags,
    state.day
  )!
  const enrollment = buildEnrollmentFeeContract(state.interview.result, mods, state.day)
  let loans = [...state.loans, contract]
  if (enrollment) loans = [...loans, enrollment]
  const drawn = drawCredit({ creditLineUsed: state.creditLineUsed, loans }, DEFAULT_DRAW_AMOUNT, contract.id)
  return markModuleComplete(
    {
      ...state,
      loans: drawn.loans,
      creditLineUsed: drawn.creditLineUsed,
      cash: state.cash + drawn.cashDelta + (enrollment?.drawn ?? 0),
      loanMeta: { ...state.loanMeta, popupAcknowledged: true, comparedProducts: true }
    },
    'loan'
  )
}

function familyLeftOutcome(state: ReturnType<typeof completeLoan>) {
  let s = applyFamilyExpense(state, 'pill-pack')
  s = applyCollectionChoice(s, 'ack').state
  s = applyCollectionChoice(s, 'shield').state
  const { forceOutcome } = applyCollectionChoice(s, 'accept-left')
  expect(forceOutcome).toBe('left')
  s = applyFamilyOutcomeEffects(s, 'left')
  return markModuleComplete(s, 'family')
}

describe('s0Flow', () => {
  it('deriveS0Step 随模块完成线性推进', () => {
    let s = createInitialAct1State(cfg)
    expect(deriveS0Step(s)).toBe('interview')
    expect(moduleForS0Step('interview')).toBe('interview')

    s = completeInterview(s)
    expect(deriveS0Step(s)).toBe('loan')
    expect(moduleForS0Step('loan')).toBe('loan')

    s = completeLoan(s)
    expect(deriveS0Step(s)).toBe('family')

    s = familyLeftOutcome(s)
    expect(deriveS0Step(s)).toBe('s0-complete')
    expect(moduleForS0Step('s0-complete')).toBeNull()
  })

  it('路径 1：面试拒档 → 灵贷 → 家庭最短迁出', () => {
    const done = familyLeftOutcome(completeLoan(completeInterview()))
    expect(done.completedModules).toEqual(['interview', 'loan', 'family'])
    expect(done.familyOutcome).toBe('left')
    expect(deriveS0Step(done)).toBe('s0-complete')
  })

  it('路径 2：联系家人路径不必刷满 3 次要钱即可进结局档', () => {
    let s = completeLoan(completeInterview())
    s = applyFamilyExpense(s, 'pill-pack')
    s = applyCollectionChoice(s, 'ack').state
    s = applyCollectionChoice(s, 'contact-family').state
    expect(collectionLadderStage(s)).toBe(3)
    expect(deriveS0Step(s)).toBe('family')
  })

  it('路径 3：附条件录取 → 灵贷 → 扛下后付费挽留', () => {
    const passAnswers = {
      sleep: 'under2',
      course: 'finishing',
      'family-invest': 'partial',
      'track-organ': 'aware',
      'track-soul': 'considering',
      'track-metabolism': 'no',
      'track-gender': 'open',
      honesty: 'yes'
    }
    let s = completeInterview(createInitialAct1State(cfg), passAnswers)
    expect(s.interview.result).not.toBe('reject')
    s = completeLoan(s)
    s = applyFamilyExpense(s, 'pill-pack')
    s = applyCollectionChoice(s, 'ack').state
    s = applyCollectionChoice(s, 'shield').state
    const { forceOutcome } = applyCollectionChoice(s, 'pay-save')
    expect(forceOutcome).toBe('saved-costly')
    s = applyFamilyOutcomeEffects(s, 'saved-costly')
    s = markModuleComplete(s, 'family')
    expect(deriveS0Step(s)).toBe('s0-complete')
    expect(s.familyOutcome).toBe('saved-costly')
  })

  it('syncSetpieceFromAct1 写入 interview / loanPopup / collectionLadder', () => {
    let s = createInitialAct1State(cfg)
    expect(syncSetpieceFromAct1(s).collectionLadder?.stage).toBe(0)

    s = completeLoan(completeInterview())
    s = applyFamilyExpense(s, 'pill-pack')
    const sp = syncSetpieceFromAct1(s)
    expect(sp.interview?.phase).toBe('done')
    expect(sp.loanPopup?.signed).toBe(true)
    expect(sp.collectionLadder?.stage).toBeGreaterThanOrEqual(1)
  })
})
