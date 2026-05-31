import type { GameState } from '~/types/game'
import type { BodyMortgageOffer, BodyMortgagePending, BodyPartId, PlayRunState } from '~/types/play'
import * as Engine from '~/logic/gameEngine'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'

export const BODY_PART_LABELS: Record<BodyPartId, string> = {
  LeftPalm: '左手掌',
  RightPalm: '右手掌',
  LeftArm: '左臂',
  RightArm: '右臂',
  LeftLeg: '左腿',
  RightLeg: '右腿'
}

const BODY_PART_PREREQS: Partial<Record<BodyPartId, BodyPartId>> = {
  LeftArm: 'LeftPalm',
  RightArm: 'RightPalm'
}

const BODY_PART_ORDER: BodyPartId[] = [
  'LeftPalm',
  'RightPalm',
  'LeftArm',
  'RightArm',
  'LeftLeg',
  'RightLeg'
]

export function playRunToGameSlice(run: PlayRunState): GameState {
  if (!run.school || !run.econ || !run.stats) {
    throw new Error('playRunToGameSlice requires hs econ/stats/school')
  }
  return {
    started: true,
    seed: run.seed ?? 1,
    startConfig: run.start,
    stats: { ...run.stats },
    econ: { ...run.econ },
    school: { ...run.school },
    cashDayStreak: 0,
    scoreDayStreak: 0,
    contract: {
      active: false,
      name: '',
      patron: '',
      progress: 0,
      vigilance: 0,
      lastTriggerDay: 0
    },
    logs: [],
    eventHistory: {},
    familyHistory: {},
    bodyPartRepayment: { ...(run.bodyPartRepayment ?? {}) },
    bodyIntegrity: run.bodyIntegrity ?? 1,
    bodyReputation: run.bodyReputation ?? 'clean',
    buyDebasement: run.buyDebasement ?? 0,
    daySlotActions: {},
    domestication: run.mandate?.domestication ?? 0,
    numbness: run.mandate?.numbness ?? 0,
    lastBodyPartRepaymentDay: run.lastBodyPartRepaymentDay
  }
}

export function shouldOfferBodyMortgage(
  run: PlayRunState,
  rand: () => number
): { trigger: boolean; mandatory: boolean } {
  if (!run.econ || !run.school) return { trigger: false, mandatory: false }
  const g = playRunToGameSlice(run)
  return Engine.shouldTriggerRepaymentEvent(g, rand)
}

export function listBodyMortgageOffers(run: PlayRunState): BodyMortgageOffer[] {
  const g = playRunToGameSlice(run)
  const repaid = g.bodyPartRepayment ?? {}
  const mortgageType = Engine.determineMortgageType(g)

  return BODY_PART_ORDER.filter((id) => !repaid[id]).map((partId) => {
    const dynamicValue = Engine.calculateDynamicValuation(partId, {
      faLi: g.stats.faLi,
      rouTi: g.stats.rouTi,
      fatigue: g.stats.fatigue,
      buyDebasement: g.buyDebasement ?? 0
    })
    const benefits = Engine.calculateBodyMortgageBenefits(partId, mortgageType, g)
    const repaymentValue =
      benefits.debtReduction > 0 ? benefits.debtReduction : dynamicValue

    return {
      partId,
      label: BODY_PART_LABELS[partId],
      repaymentValue,
      lockedDebtAdded: benefits.type === 'debt_reduction' ? benefits.debtReduction : 0,
      mortgageType: benefits.type,
      narrative: benefits.narrative,
      irreversible: true as const
    }
  })
}

export function buildBodyMortgagePending(run: PlayRunState, rand: () => number): BodyMortgagePending | null {
  const check = shouldOfferBodyMortgage(run, rand)
  if (!check.trigger) return null
  const offers = listBodyMortgageOffers(run)
  if (offers.length === 0) return null
  return { offers, mandatory: check.mandatory }
}

function canRepayPart(g: GameState, partId: BodyPartId): boolean {
  const prereq = BODY_PART_PREREQS[partId]
  if (prereq && !g.bodyPartRepayment?.[prereq]) return false
  return !g.bodyPartRepayment?.[partId]
}

/** 执行身体抵押并写回 PlayRunState */
export function applyBodyMortgageToRun(run: PlayRunState, partId: BodyPartId): PlayRunState {
  const g = playRunToGameSlice(run)
  if (!canRepayPart(g, partId)) return run

  const mortgageType = Engine.determineMortgageType(g)
  const mortgageResult = Engine.calculateBodyMortgageBenefits(partId, mortgageType, g)
  Engine.applyBodyMortgageEffect(g, mortgageResult)

  if (mortgageType === 'debt_reduction') {
    g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
  }

  if (!g.bodyPartRepayment) g.bodyPartRepayment = {}
  g.bodyPartRepayment[partId] = true
  g.lastBodyPartRepaymentDay = g.school.day

  const lienId = `lien-${partId}-${g.school.day}`
  const label = BODY_PART_LABELS[partId]
  const logLine = `身体抵押：${label}（${mortgageType === 'debt_reduction' ? '减债型' : mortgageType === 'access_grant' ? '准入型' : '修行加速型'}）`

  const nextTags = [...run.profileTags]
  if (!nextTags.includes('body-marked')) nextTags.push('body-marked')

  const setpiece = { ...run.setpiece }
  delete setpiece.bodyMortgagePending

  return {
    ...run,
    econ: { ...g.econ },
    stats: { ...g.stats },
    bodyPartRepayment: { ...g.bodyPartRepayment },
    bodyIntegrity: g.bodyIntegrity,
    bodyReputation: g.bodyReputation,
    lastBodyPartRepaymentDay: g.lastBodyPartRepaymentDay,
    bodyLiens: [...(run.bodyLiens ?? []), lienId],
    profileTags: nextTags,
    logs: [logLine, ...run.logs].slice(0, 80),
    setpiece
  }
}

export function dismissBodyMortgage(run: PlayRunState): PlayRunState {
  if (!run.setpiece?.bodyMortgagePending) return run
  const setpiece = { ...run.setpiece }
  delete setpiece.bodyMortgagePending
  return {
    ...run,
    setpiece,
    logs: ['你拒绝了身体抵押方案，催收档位维持。', ...run.logs].slice(0, 80)
  }
}

export function debtAfterMortgageDelta(before: PlayRunState, after: PlayRunState): number {
  return fullDebtFromRun(before) - fullDebtFromRun(after)
}
