import type { LifeStage, PlayRunState, PressureCardDef } from '~/types/play'
import { cardWeightForLifeStageRun, weightedPickOne } from './deckWeights'

/** 每回合展示的压力牌数量（四选二） */
export const PRESSURE_OFFER_COUNT = 4 as const

export type PressureOfferTuple = [string, string, string, string]

export function uniqueOfferedCount(ids: readonly string[]): number {
  return new Set(ids).size
}

/** 四张牌实质相同（无法四选二） */
export function isDegeneratePressureOffer(offeredCardIds: readonly string[]): boolean {
  return (
    offeredCardIds.length === PRESSURE_OFFER_COUNT && uniqueOfferedCount(offeredCardIds) < 2
  )
}

function defaultCardIdForStage(stage: LifeStage): string {
  if (stage === 'uni') return 'uni-rest-hall'
  if (stage === 'work') return 'work-rest'
  return 'hs-rest'
}

function cardWeightForRun(card: PressureCardDef, run: PlayRunState): number {
  return cardWeightForLifeStageRun(card, run)
}

function pickOneFromEligible(
  eligible: PressureCardDef[],
  excludeIds: Set<string>,
  run: PlayRunState,
  rand: () => number
): PressureCardDef | undefined {
  const pool = eligible.filter((c) => !excludeIds.has(c.id))
  if (!pool.length) return undefined
  return weightedPickOne(pool, (c) => cardWeightForRun(c, run), rand)
}

/**
 * 将发牌结果整理为恰好 4 个 offered ID。
 * - eligible ≥ 4：必须 4 个不同 ID（禁止用重复 ID 凑数）
 * - eligible < 4：允许重复，按 eligible 轮转，不用「复制上一张」
 */
export function finalizeOfferedCardIds(
  dealtIds: string[],
  eligible: PressureCardDef[],
  run: PlayRunState,
  rand: () => number
): PressureOfferTuple {
  const fallbackId = defaultCardIdForStage(run.lifeStage)

  if (!eligible.length) {
    return [fallbackId, fallbackId, fallbackId, fallbackId]
  }

  if (eligible.length >= PRESSURE_OFFER_COUNT) {
    const unique: string[] = []
    for (const id of dealtIds) {
      if (!unique.includes(id)) unique.push(id)
      if (unique.length === PRESSURE_OFFER_COUNT) break
    }
    const used = new Set(unique)
    while (unique.length < PRESSURE_OFFER_COUNT) {
      const next = pickOneFromEligible(eligible, used, run, rand)
      if (!next) break
      unique.push(next.id)
      used.add(next.id)
    }
    if (unique.length < PRESSURE_OFFER_COUNT) {
      for (const card of eligible) {
        if (unique.length >= PRESSURE_OFFER_COUNT) break
        if (!used.has(card.id)) {
          unique.push(card.id)
          used.add(card.id)
        }
      }
    }
    while (unique.length < PRESSURE_OFFER_COUNT) {
      unique.push(fallbackId)
    }
    return [unique[0]!, unique[1]!, unique[2]!, unique[3]!]
  }

  const ids: string[] = []
  for (let i = 0; i < PRESSURE_OFFER_COUNT; i++) {
    const fromDeal = dealtIds[i]
    if (fromDeal && eligible.some((c) => c.id === fromDeal)) {
      ids.push(fromDeal)
    } else {
      ids.push(eligible[i % eligible.length]!.id)
    }
  }
  return [ids[0]!, ids[1]!, ids[2]!, ids[3]!]
}
