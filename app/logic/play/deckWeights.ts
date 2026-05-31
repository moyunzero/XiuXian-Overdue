import type { ClassTier } from '~/types/game'
import type { PressureCardDef, PlayRunState, UniRankCohort } from '~/types/play'
import { getJobById } from '~/logic/play/jobs'

/** 分班档位对压力牌 tag 的相对权重（>1 更易出现） */
const TIER_TAG_WEIGHT: Record<ClassTier, Record<string, number>> = {
  示范班: { study: 2.2, rest: 1.3, train: 1.4, work: 0.45, risk: 0.65 },
  普通班: { study: 1, rest: 1, train: 1, work: 1, risk: 1 },
  末位班: { study: 0.55, rest: 0.85, work: 1.9, risk: 1.45, train: 1.15 }
}

export function cardWeightForTier(card: PressureCardDef, tier: ClassTier): number {
  const table = TIER_TAG_WEIGHT[tier] ?? TIER_TAG_WEIGHT['普通班']
  let weight = 1
  for (const tag of card.tags) {
    const mult = table[tag]
    if (mult !== undefined) weight *= mult
  }
  return Math.max(0.01, weight)
}

const COHORT_TAG_WEIGHT: Record<UniRankCohort, Record<string, number>> = {
  elite: { study: 1.85, rest: 1.2, train: 1.35, work: 0.55, risk: 0.7 },
  normal: { study: 1, rest: 1, train: 1, work: 1, risk: 1 },
  tail: { study: 0.65, rest: 0.9, work: 1.55, risk: 1.5, train: 1.1 }
}

const SECT_TAG_BIAS: Record<string, Record<string, number>> = {
  'sect-cloud': { study: 1.3, rest: 1.25, train: 1.1 },
  'sect-iron': { work: 1.45, study: 1.05, train: 1.15 },
  'sect-ash': { risk: 1.5, work: 1.3 }
}

export function cardWeightForUniRun(card: PressureCardDef, run: PlayRunState): number {
  const tier: ClassTier = run.school?.classTier ?? '普通班'
  let weight = cardWeightForTier(card, tier)
  const cohort = run.uni?.rankCohort ?? 'normal'
  const cohortTable = COHORT_TAG_WEIGHT[cohort]
  for (const tag of card.tags) {
    const mult = cohortTable[tag]
    if (mult !== undefined) weight *= mult
  }
  const sectId = run.uni?.sectId
  if (sectId) {
    const sectTable = SECT_TAG_BIAS[sectId]
    if (sectTable) {
      for (const tag of card.tags) {
        const mult = sectTable[tag]
        if (mult !== undefined) weight *= mult
      }
    }
  }
  return Math.max(0.01, weight)
}

const WORK_TAG_WEIGHT: Record<string, number> = {
  work: 1.1,
  risk: 0.85,
  rest: 1.25,
  study: 1.2,
  train: 1.05
}

/** 职场：岗位解锁、逾期、末位班履历加权 */
export function cardWeightForWorkRun(card: PressureCardDef, run: PlayRunState): number {
  const tier: ClassTier = run.school?.classTier ?? '普通班'
  let weight = cardWeightForTier(card, tier)
  for (const tag of card.tags) {
    const mult = WORK_TAG_WEIGHT[tag]
    if (mult !== undefined) weight *= mult
  }
  const job = run.work?.jobId ? getJobById(run.work.jobId) : null
  if (job?.pressureCardUnlocks.includes(card.id)) weight *= 1.6
  const del = run.econ?.delinquency ?? 0
  if (del >= 2 && card.tags.includes('risk')) weight *= 0.95 + del * 0.04
  if ((run.work?.shameEvents ?? 0) >= 1 && card.id === 'work-shame-gig') weight *= 1.25
  if (run.work?.educationTags.includes('tier-tail') && card.tags.includes('work')) {
    weight *= 1.1
  }
  return Math.max(0.01, weight)
}

const ENDLESS_REALM_TAG_WEIGHT: Record<string, Record<string, number>> = {
  qi: { study: 1.3, rest: 1.28, train: 1.22, work: 0.72, risk: 0.68 },
  foundation: { study: 1.38, rest: 1.3, train: 1.18, work: 0.75, risk: 0.68 },
  purple: { study: 1.18, rest: 1.15, train: 1.12, work: 0.88, risk: 0.82 },
  core: { study: 1.08, rest: 1.12, train: 1.05, work: 0.95, risk: 0.88 }
}

export function cardWeightForLifeStageRun(card: PressureCardDef, run: PlayRunState): number {
  const tier: ClassTier = run.school?.classTier ?? '普通班'
  let weight = 1
  if (run.lifeStage === 'uni') weight = cardWeightForUniRun(card, run)
  else if (run.lifeStage === 'work') weight = cardWeightForWorkRun(card, run)
  else weight = cardWeightForTier(card, tier)

  if (run.runMode === 'endless') {
    const table = ENDLESS_REALM_TAG_WEIGHT[run.realmTier]
    if (table) {
      for (const tag of card.tags) {
        const mult = table[tag]
        if (mult !== undefined) weight *= mult
      }
    }
  }
  return Math.max(0.01, weight)
}

/** 按权重无放回抽取 1 张 */
export function weightedPickOne<T>(
  items: T[],
  weightOf: (item: T) => number,
  rand: () => number
): T | undefined {
  if (!items.length) return undefined
  const weights = items.map(weightOf)
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return items[Math.floor(rand() * items.length)]
  let roll = rand() * total
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) return items[i]
  }
  return items[items.length - 1]
}
