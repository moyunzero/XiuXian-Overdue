import type {
  MandateDeliveryDef,
  MandateEffect,
  MandatePoolKey,
  MandateResponseDef,
  MandateState
} from '~/types/chapter'
import { NUMBNESS_MUTE_THRESHOLD } from '~/logic/play/mandatePsy'
import type { PlayRunState } from '~/types/play'
import type { FamilyOutcome } from '~/types/act1'
import {
  getChapterConfig,
  isNodeWeek
} from '~/logic/play/chapterRegistry'
import { getMandateDef, listMandatesForPool } from '~/logic/play/mandateRegistry'

export const MAX_MANDATE_QUEUE = 3
export const ROUTINE_ROLL_MAX = 2

const FAMILY_ROLL_CHANCE: Partial<Record<FamilyOutcome, number>> = {
  left: 0.35,
  'saved-costly': 0.28,
  'saved-false-hope': 0.22,
  cutoff: 0.12
}

export interface MandateInboxPending {
  deliveryId: string
  title: string
  body: string
  queueSize: number
  responses: MandateResponseDef[]
  numbness: number
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1103515245 + 12345) >>> 0
    return s / 0x100000000
  }
}

function ensureMandate(run: PlayRunState): MandateState {
  return (
    run.mandate ?? {
      numbness: 0,
      domestication: 0,
      pendingDeliveryIds: [],
      supplyCutStreak: 0
    }
  )
}

function eligibleMandates(run: PlayRunState, defs: MandateDeliveryDef[]): MandateDeliveryDef[] {
  if (!run.chapter) return []
  const week = run.chapter.chapterWeekIndex
  const lifeStage = run.lifeStage
  const delinquency = run.econ?.delinquency ?? 0
  const pending = new Set(run.mandate?.pendingDeliveryIds ?? [])

  return defs.filter((def) => {
    if (pending.has(def.id)) return false
    if (!def.lifeStages.includes(lifeStage)) return false
    if (def.minWeek !== undefined && week < def.minWeek) return false
    if (def.maxWeek !== undefined && week > def.maxWeek) return false
    if (def.minDelinquency !== undefined && delinquency < def.minDelinquency) return false
    if (def.requiresTags?.length) {
      const ok = def.requiresTags.some((t) => run.profileTags.includes(t))
      if (!ok) return false
    }
    return true
  })
}

function pickRandom<T>(items: T[], rand: () => number): T | null {
  if (!items.length) return null
  return items[Math.floor(rand() * items.length)] ?? null
}

function routineRollCount(rand: () => number): number {
  const r = rand()
  if (r < 0.25) return 0
  if (r < 0.7) return 1
  return 2
}

function familyOutcomeOf(run: PlayRunState): FamilyOutcome | undefined {
  return run.carryoverFromAct1?.familyOutcome ?? run.act1?.familyOutcome
}

function shouldRollFamily(run: PlayRunState, rand: () => number): boolean {
  const outcome = familyOutcomeOf(run)
  if (!outcome) return false
  const chance = FAMILY_ROLL_CHANCE[outcome] ?? 0
  return rand() < chance
}

function appendPending(run: PlayRunState, id: string): PlayRunState {
  const mandate = ensureMandate(run)
  if (mandate.pendingDeliveryIds.includes(id)) return run
  if (mandate.pendingDeliveryIds.length >= MAX_MANDATE_QUEUE) return run
  return {
    ...run,
    mandate: {
      ...mandate,
      pendingDeliveryIds: [...mandate.pendingDeliveryIds, id]
    }
  }
}

function applyEffect(run: PlayRunState, effect: MandateEffect): PlayRunState {
  const mandate = ensureMandate(run)
  let next: PlayRunState = { ...run, mandate: { ...mandate } }
  const logs = [...next.logs]

  switch (effect.kind) {
    case 'cash':
      if (next.econ && effect.value) {
        next = { ...next, econ: { ...next.econ, cash: next.econ.cash + effect.value } }
      }
      break
    case 'delinquency':
      if (next.econ && effect.value) {
        next = {
          ...next,
          econ: {
            ...next.econ,
            delinquency: (next.econ.delinquency ?? 0) + effect.value
          }
        }
      }
      break
    case 'domestication':
      if (effect.value) {
        next.mandate = {
          ...next.mandate!,
          domestication: clamp(next.mandate!.domestication + effect.value, 0, 100)
        }
      }
      break
    case 'numbness':
      if (effect.value) {
        next.mandate = {
          ...next.mandate!,
          numbness: clamp(next.mandate!.numbness + effect.value, 0, 100)
        }
      }
      break
    case 'supplyCutStreak':
      if (effect.value) {
        next.mandate = {
          ...next.mandate!,
          supplyCutStreak: Math.max(0, next.mandate!.supplyCutStreak + effect.value)
        }
      }
      break
    case 'log':
      if (effect.message) logs.unshift(effect.message)
      break
    default:
      break
  }

  return { ...next, logs: logs.slice(0, 80) }
}

function applyEffects(run: PlayRunState, effects: MandateEffect[]): PlayRunState {
  return effects.reduce((acc, eff) => applyEffect(acc, eff), run)
}

/** 新周开始时掷来文并追加队列（config 驱动，禁止 week 魔数） */
export function rollMandatesForWeek(run: PlayRunState): PlayRunState {
  if (run.runMode !== 'chapter' || !run.chapter) return run

  const mandate = ensureMandate(run)
  if (mandate.pendingDeliveryIds.length >= MAX_MANDATE_QUEUE) return run

  const config = getChapterConfig(run.chapter.chapterId)
  const week = run.chapter.chapterWeekIndex
  const rand = seededRand((run.seed ?? 1) * 1009 + week * 97)

  let next = run
  const picked = new Set<string>()

  const tryPick = (pool: MandatePoolKey) => {
    const eligible = eligibleMandates(next, listMandatesForPool(config, pool)).filter(
      (d) => !picked.has(d.id)
    )
    const choice = pickRandom(eligible, rand)
    if (!choice) return
    picked.add(choice.id)
    next = appendPending(next, choice.id)
  }

  const routineCount = Math.min(
    routineRollCount(rand),
    MAX_MANDATE_QUEUE - (next.mandate?.pendingDeliveryIds.length ?? 0)
  )
  for (let i = 0; i < routineCount; i++) {
    if ((next.mandate?.pendingDeliveryIds.length ?? 0) >= MAX_MANDATE_QUEUE) break
    tryPick('routine')
  }

  if (isNodeWeek(config, week) && (next.mandate?.pendingDeliveryIds.length ?? 0) < MAX_MANDATE_QUEUE) {
    tryPick('nodeBonus')
  }

  if (
    shouldRollFamily(next, rand) &&
    (next.mandate?.pendingDeliveryIds.length ?? 0) < MAX_MANDATE_QUEUE
  ) {
    tryPick('family')
  }

  return next
}

export function visibleResponsesForRun(
  run: PlayRunState,
  def: MandateDeliveryDef
): MandateResponseDef[] {
  const numbness = run.mandate?.numbness ?? 0
  const highNumb = numbness >= NUMBNESS_MUTE_THRESHOLD
  if (!highNumb) return def.responses
  const grit = def.responses.filter((r) => r.grit)
  const compliant = def.responses.filter((r) => !r.grit)
  if (grit.length >= 1) return [...compliant.slice(0, 1), ...grit]
  return def.responses
}

export function buildMandateInboxPending(run: PlayRunState): MandateInboxPending | null {
  const id = run.mandate?.pendingDeliveryIds[0]
  if (!id) return null
  const def = getMandateDef(id)
  if (!def) return null
  return {
    deliveryId: id,
    title: def.title,
    body: def.body,
    queueSize: run.mandate!.pendingDeliveryIds.length,
    responses: visibleResponsesForRun(run, def),
    numbness: run.mandate!.numbness
  }
}

export function respondToMandate(run: PlayRunState, responseId: string): PlayRunState {
  const pending = run.mandate?.pendingDeliveryIds ?? []
  const deliveryId = pending[0]
  if (!deliveryId) return run

  const def = getMandateDef(deliveryId)
  if (!def) {
    return {
      ...run,
      mandate: {
        ...ensureMandate(run),
        pendingDeliveryIds: pending.slice(1)
      }
    }
  }

  const visible = visibleResponsesForRun(run, def)
  const response = visible.find((r) => r.id === responseId) ?? def.responses.find((r) => r.id === responseId)
  if (!response) return run

  let next = applyEffects(run, response.effects)
  const mandate = ensureMandate(next)
  next = {
    ...next,
    mandate: {
      ...mandate,
      pendingDeliveryIds: mandate.pendingDeliveryIds.slice(1)
    }
  }
  return next
}

/** 队列已满时阻塞新周推进 */
export function mandateQueueBlocksWeekAdvance(run: PlayRunState): boolean {
  return (run.mandate?.pendingDeliveryIds.length ?? 0) >= MAX_MANDATE_QUEUE
}

/** 测试 helper：清空队列（选首条可见回应） */
export function drainPendingMandates(run: PlayRunState): PlayRunState {
  let next = run
  let guard = 0
  while ((next.mandate?.pendingDeliveryIds.length ?? 0) > 0 && guard < 20) {
    guard += 1
    const id = next.mandate!.pendingDeliveryIds[0]!
    const def = getMandateDef(id)
    if (!def) {
      next = {
        ...next,
        mandate: {
          ...ensureMandate(next),
          pendingDeliveryIds: next.mandate!.pendingDeliveryIds.slice(1)
        }
      }
      continue
    }
    const responseId = visibleResponsesForRun(next, def)[0]?.id ?? def.responses[0]?.id
    if (!responseId) break
    next = respondToMandate(next, responseId)
  }
  return next
}
