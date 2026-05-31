import type { Act1ModuleId, Act1State } from '~/types/act1'
import type { SetpieceState } from '~/types/play'
import { displayCollectionStage } from './familyLedger'

export type S0Step = 'interview' | 'loan' | 'family' | 's0-complete'

export const S0_STEPS: S0Step[] = ['interview', 'loan', 'family', 's0-complete']

export const S0_STEP_LABELS: Record<S0Step, string> = {
  interview: '入学面试',
  loan: '灵贷首贷',
  family: '家庭账本',
  's0-complete': '入学前夜结案'
}

export const COLLECTION_LADDER_LABELS = ['未触发', '提醒', '联系人', '迁出预警'] as const

/** 线性 S0 当前大卡：由已完成模块推导，不依赖多窗口 focus。 */
export function deriveS0Step(act1: Act1State): S0Step {
  if (act1.completedModules.includes('family')) return 's0-complete'
  if (act1.completedModules.includes('loan')) return 'family'
  if (act1.completedModules.includes('interview')) return 'loan'
  return 'interview'
}

export function moduleForS0Step(step: S0Step): Act1ModuleId | null {
  if (step === 'interview') return 'interview'
  if (step === 'loan') return 'loan'
  if (step === 'family') return 'family'
  return null
}

export function s0StepIndex(step: S0Step): number {
  return S0_STEPS.indexOf(step)
}

/** 催收展示阶梯 0–3，与 familyLedger.displayCollectionStage 对齐。 */
export function collectionLadderStage(act1: Act1State): 0 | 1 | 2 | 3 {
  const stage = displayCollectionStage(act1)
  if (stage <= 0) return 0
  if (stage === 1) return 1
  if (stage === 2) return 2
  return 3
}

export function syncSetpieceFromAct1(act1: Act1State, prior?: SetpieceState): SetpieceState {
  const interviewDone = act1.completedModules.includes('interview')
  const loanDone = act1.completedModules.includes('loan')
  const hasAnswers = Object.keys(act1.interview.answers ?? {}).length > 0

  let interview: SetpieceState['interview']
  if (interviewDone) {
    interview = { phase: 'done', score: act1.interview.score }
  } else if (hasAnswers) {
    interview = { phase: 'quiz', score: act1.interview.score }
  } else {
    interview = prior?.interview
  }

  return {
    ...prior,
    interview,
    loanPopup: {
      dismissed: act1.loanMeta.popupAcknowledged || act1.loanMeta.adDismissCount > 0,
      signed: loanDone
    },
    collectionLadder: { stage: collectionLadderStage(act1) }
  }
}
