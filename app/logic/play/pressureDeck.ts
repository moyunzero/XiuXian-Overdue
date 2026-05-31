import pressureCardsJson from '../../../data/pressureCards.json'
import type { LifeStage, PlayRunState, PressureCardDef, PressureRoundState } from '~/types/play'
import { applyPlayEffectsToRun } from './playEffects'
import { getJobById } from './jobs'
import { cardWeightForLifeStageRun, weightedPickOne } from './deckWeights'
import { tickEndlessAfterPressureRound } from './endlessFlow'
import { advancePlayRunCalendarDay } from './playDayCycle'
import { tickWorkAfterPressureRound } from './workFlow'
import { syncFoundationProgressFromStats } from './uniFlow'
import { scheduleExamBossIfDue } from './examBoss'
import { refreshRunInbox } from './inboxFromTemplates'
import { mulberry32 } from '~/utils/rng'
import {
  finalizeOfferedCardIds,
  isDegeneratePressureOffer,
  type PressureOfferTuple
} from './pressureOfferIntegrity'

export { isDegeneratePressureOffer, uniqueOfferedCount } from './pressureOfferIntegrity'

export const PRESSURE_CARDS: PressureCardDef[] = pressureCardsJson as PressureCardDef[]

export function getPressureCardById(id: string): PressureCardDef | undefined {
  return PRESSURE_CARDS.find((c) => c.id === id)
}

export function cardsForLifeStage(stage: LifeStage): PressureCardDef[] {
  return PRESSURE_CARDS.filter((c) => c.lifeStages.includes(stage))
}

function meetsRequires(card: PressureCardDef, run: PlayRunState): boolean {
  const req = card.requires
  if (!req || !run.econ) return true
  if (req.minCash !== undefined && run.econ.cash < req.minCash) return false
  if (req.maxDelinquency !== undefined && run.econ.delinquency > req.maxDelinquency) return false
  if (req.tags?.length) {
    const has = req.tags.some((t) => run.profileTags.includes(t))
    if (!has) return false
  }
  return true
}

const WORK_JOB_UNLOCK_CARD_IDS = new Set(['work-overtime', 'work-kpi-review', 'work-shame-gig'])

function cardAvailableForWorkRun(card: PressureCardDef, run: PlayRunState): boolean {
  if (!WORK_JOB_UNLOCK_CARD_IDS.has(card.id)) return true
  const job = run.work?.jobId ? getJobById(run.work.jobId) : null
  if (!job) return false
  return job.pressureCardUnlocks.includes(card.id)
}

function cardAvailableForEndlessRealm(card: PressureCardDef, run: PlayRunState): boolean {
  if (run.runMode !== 'endless') return true
  if (!card.realmTiers?.length) return true
  return card.realmTiers.includes(run.realmTier)
}

/** 当前 run 可参与发牌的压力牌（门槛 + 岗位解锁 + 境界过滤） */
export function eligiblePressureCardsForRun(run: PlayRunState): PressureCardDef[] {
  return cardsForLifeStage(run.lifeStage)
    .filter((c) => cardAvailableForEndlessRealm(c, run))
    .filter((c) => meetsRequires(c, run))
    .filter((c) => run.lifeStage !== 'work' || cardAvailableForWorkRun(c, run))
}

function withoutExcluded(cards: PressureCardDef[], picked: PressureCardDef[]): PressureCardDef[] {
  const excluded = new Set<string>()
  for (const p of picked) {
    for (const id of p.excludesCardIds ?? []) excluded.add(id)
  }
  return cards.filter((c) => !excluded.has(c.id))
}

const AGENCY_TAGS = new Set(['rest', 'study', 'train'])
const AGENCY_TITLE_HINTS = [
  '最低还款',
  '硬睡',
  '静室',
  '吐纳',
  '图书馆',
  '月考',
  '闭关',
  '功法',
  '发薪',
  '零工',
  '杂务'
]

/** 玩家可主动用于推进/止损的牌（用于四选二能动性下限） */
export function isAgencyPressureCard(card: PressureCardDef): boolean {
  if (card.tags.some((t) => AGENCY_TAGS.has(t))) return true
  return AGENCY_TITLE_HINTS.some((hint) => card.title.includes(hint))
}

function agencyBuckets(card: PressureCardDef): string[] {
  const buckets: string[] = []
  if (card.tags.includes('rest')) buckets.push('rest')
  if (card.tags.includes('study')) buckets.push('study')
  if (card.tags.includes('train')) buckets.push('train')
  if (card.title.includes('最低还款')) buckets.push('repay')
  else if (
    card.title.includes('发薪') ||
    card.title.includes('零工') ||
    card.title.includes('杂务')
  ) {
    buckets.push('income')
  }
  if (!buckets.length && isAgencyPressureCard(card)) buckets.push('other')
  return buckets
}

function agencyBucketCount(cards: PressureCardDef[]): number {
  const buckets = new Set<string>()
  for (const card of cards.filter(isAgencyPressureCard)) {
    for (const bucket of agencyBuckets(card)) buckets.add(bucket)
  }
  return buckets.size
}

function ensureMinimumAgencyCards(
  picked: PressureCardDef[],
  eligible: PressureCardDef[],
  run: PlayRunState,
  rand: () => number
): PressureCardDef[] {
  if (picked.length < 4) return picked

  const result = [...picked]
  const used = () => new Set(result.map((c) => c.id))
  const agencyPool = (preferBucket?: string) =>
    eligible.filter((c) => {
      if (!isAgencyPressureCard(c) || used().has(c.id)) return false
      if (!preferBucket) return true
      return agencyBuckets(c).includes(preferBucket)
    })

  const replaceWeakest = (pool: PressureCardDef[]) => {
    const candidates = result
      .map((card, index) => ({
        index,
        agency: isAgencyPressureCard(card),
        weight: cardWeightForLifeStageRun(card, run)
      }))
      .filter((row) => !row.agency)
      .sort((a, b) => a.weight - b.weight)
    if (!candidates.length || !pool.length) return false
    const replacement = weightedPickOne(pool, (c) => cardWeightForLifeStageRun(c, run), rand)
    if (!replacement) return false
    result[candidates[0]!.index] = replacement
    return true
  }

  let agencyCount = result.filter(isAgencyPressureCard).length
  while (agencyCount < 2) {
    if (!replaceWeakest(agencyPool())) break
    agencyCount = result.filter(isAgencyPressureCard).length
  }

  const existingBuckets = new Set<string>()
  for (const card of result.filter(isAgencyPressureCard)) {
    for (const bucket of agencyBuckets(card)) existingBuckets.add(bucket)
  }
  for (const bucket of ['rest', 'study', 'train', 'repay', 'income']) {
    if (agencyBucketCount(result) >= 2) break
    if (existingBuckets.has(bucket)) continue
    if (!replaceWeakest(agencyPool(bucket))) continue
    existingBuckets.add(bucket)
  }

  while (agencyBucketCount(result) < 2) {
    const agencyCards = result.filter(isAgencyPressureCard)
    const bucketCounts = new Map<string, number>()
    for (const card of agencyCards) {
      for (const bucket of agencyBuckets(card)) {
        bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1)
      }
    }
    const dominantBucket = [...bucketCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const missingBuckets = ['rest', 'study', 'train', 'repay', 'income'].filter((b) => !bucketCounts.has(b))
    if (!dominantBucket || !missingBuckets.length) break
    const replaceIndex = result.findIndex(
      (card) => isAgencyPressureCard(card) && agencyBuckets(card).includes(dominantBucket)
    )
    if (replaceIndex < 0) break
    const pool = agencyPool(missingBuckets[0]).filter((c) => !result.some((r) => r.id === c.id))
    const replacement = weightedPickOne(pool, (c) => cardWeightForLifeStageRun(c, run), rand)
    if (!replacement) break
    result[replaceIndex] = replacement
  }

  return result
}

export function dealPressureCards(run: PlayRunState, rand: () => number = Math.random): PressureCardDef[] {
  const eligible = eligiblePressureCardsForRun(run)
  const picked: PressureCardDef[] = []
  let pool = [...eligible]

  for (let i = 0; i < 4; i++) {
    pool = withoutExcluded(pool, picked)
    if (!pool.length) break
    const weightOf = (c: PressureCardDef) => cardWeightForLifeStageRun(c, run)
    const next = weightedPickOne(pool, weightOf, rand)
    if (!next) break
    picked.push(next)
    pool = pool.filter((c) => c.id !== next.id)
  }

  while (picked.length < 4 && eligible.length > 0) {
    const nextCard =
      eligible.find((c) => !picked.some((p) => p.id === c.id)) ??
      eligible[picked.length % eligible.length]!
    picked.push(nextCard)
  }

  return ensureMinimumAgencyCards(picked.slice(0, 4), eligible, run, rand)
}

/** 读档/异常：未结算回合若 offered 退化，重发本回合手牌（不增加 round） */
export function redeployDegeneratePressureOffer(
  run: PlayRunState,
  rand: () => number = Math.random
): PlayRunState {
  const p = run.pressure
  if (!p || p.resolved || !isDegeneratePressureOffer(p.offeredCardIds)) return run
  const eligible = eligiblePressureCardsForRun(run)
  const offeredCardIds: PressureOfferTuple = finalizeOfferedCardIds(
    [],
    eligible,
    run,
    rand
  )
  return {
    ...run,
    pressure: { ...p, offeredCardIds, playedCardIds: [] }
  }
}

export function startPressureRound(run: PlayRunState, rand: () => number = Math.random): PlayRunState {
  const dealt = dealPressureCards(run, rand)
  const eligible = eligiblePressureCardsForRun(run)
  const offeredCardIds = finalizeOfferedCardIds(
    dealt.map((c) => c.id),
    eligible,
    run,
    rand
  )
  const round = (run.pressure?.round ?? 0) + 1
  const pressure: PressureRoundState = {
    round,
    offeredCardIds,
    playedCardIds: [],
    resolved: false
  }
  return { ...run, pressure }
}

export function togglePressureCard(run: PlayRunState, cardId: string): PlayRunState {
  const p = run.pressure
  if (!p || p.resolved) return run
  if (!p.offeredCardIds.includes(cardId)) return run

  const played = [...p.playedCardIds]
  const idx = played.indexOf(cardId)
  if (idx >= 0) {
    played.splice(idx, 1)
  } else if (played.length < 2) {
    played.push(cardId)
  }

  return { ...run, pressure: { ...p, playedCardIds: played } }
}

export function canEndRound(run: PlayRunState): boolean {
  const p = run.pressure
  return !!p && !p.resolved && p.playedCardIds.length === 2
}

export function applyPlayedCards(run: PlayRunState, ids: string[]): PlayRunState {
  let next = run
  for (const id of ids) {
    const card = getPressureCardById(id)
    if (!card) continue
    next = applyPlayEffectsToRun(next, card.effectsOnPlay)
  }
  return next
}

export function applySkippedFerment(run: PlayRunState, offered: string[], played: string[]): PlayRunState {
  const skipped = offered.filter((id) => !played.includes(id))
  let next = run
  for (const id of skipped) {
    const card = getPressureCardById(id)
    if (!card?.effectsOnSkip?.length) continue
    next = applyPlayEffectsToRun(next, card.effectsOnSkip)
  }
  return next
}

export function resolvePressureRound(run: PlayRunState): PlayRunState {
  const p = run.pressure
  if (!p || p.resolved || p.playedCardIds.length !== 2) return run

  let next = applyPlayedCards(run, p.playedCardIds)
  next = applySkippedFerment(next, [...p.offeredCardIds], p.playedCardIds)
  if (next.school && next.econ && next.stats) {
    next = advancePlayRunCalendarDay(next)
  }
  next = scheduleExamBossIfDue(next)
  next = refreshRunInbox(next)
  next = syncFoundationProgressFromStats(next)
  if (next.lifeStage === 'work') {
    next = tickWorkAfterPressureRound(next)
  }
  if (next.runMode === 'endless') {
    next = tickEndlessAfterPressureRound(next)
  }
  next = {
    ...next,
    pressure: { ...p, resolved: true }
  }
  return next
}

export function rngForRun(run: PlayRunState, salt = 0): () => number {
  const seed = (run.seed ?? 1) + (run.school?.day ?? 1) * 997 + salt
  return mulberry32(seed)
}

export function beginNextRoundAfterResolve(run: PlayRunState): PlayRunState {
  if (!run.pressure?.resolved) return run
  const rand = rngForRun(run, run.pressure.round * 13)
  return startPressureRound(run, rand)
}
