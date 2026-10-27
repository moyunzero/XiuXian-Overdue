import type {
  MandateDeliveryDef,
  MandateEffect,
  MandatePoolKey,
  MandateResponseDef,
  MandateState
} from '~/types/chapter'
import { NUMBNESS_MUTE_THRESHOLD } from '~/logic/play/mandatePsy'
import type { InstitutionalTagId, PlayRunState, PrimaryFate } from '~/types/play'
import { initGhostLedgerOnTransition } from '~/logic/play/ghostLedger'
import { mergeTagRecords } from '~/logic/play/playRunFateDefaults'
import type { FamilyOutcome } from '~/types/act1'
import {
  getChapterConfig,
  isNodeWeek
} from '~/logic/play/chapterRegistry'
import { getMandateDef, listMandatesForRunPool } from '~/logic/play/mandateRegistry'
import { clauseLiterateActive, isClauseCreditMandate } from '~/logic/play/startBundleRegistry'

export const MAX_MANDATE_QUEUE = 3
export const ROUTINE_ROLL_MAX = 2

const FAMILY_ROLL_CHANCE: Partial<Record<FamilyOutcome, number>> = {
  left: 0.35,
  'saved-costly': 0.28,
  'saved-false-hope': 0.22,
  cutoff: 0.12
}

export interface MandateInboxFuzzFlags {
  costBlur?: boolean
  issuerNoise?: boolean
  /** Phase 5: one response id stays sharp under numbness when clause-literate active */
  clauseLiterateUnblurId?: string
}

export interface MandateInboxPending {
  deliveryId: string
  title: string
  body: string
  queueSize: number
  responses: MandateResponseDef[]
  numbness: number
  issuerLabel?: string
  fuzzFlags?: MandateInboxFuzzFlags
}

export function isChapterLikeRun(run: PlayRunState): boolean {
  return run.runMode === 'chapter' || run.runMode === 'fate_run'
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

function institutionalTagIds(run: PlayRunState): string[] {
  return (run.institutionalTags ?? []).map((t) => t.id)
}

function hasNonLogEffects(def: MandateDeliveryDef): boolean {
  return def.responses.some((r) => r.effects.some((e) => e.kind !== 'log'))
}

/** LOOP-04: stage, fate, institutional tags, minEffectCount; weight used at pick time */
export function eligibleMandates(run: PlayRunState, defs: MandateDeliveryDef[]): MandateDeliveryDef[] {
  if (!run.chapter) return []
  const week = run.chapter.chapterWeekIndex
  const lifeStage = run.lifeStage
  const delinquency = run.econ?.delinquency ?? 0
  const pending = new Set(run.mandate?.pendingDeliveryIds ?? [])
  const instTags = institutionalTagIds(run)

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
    if (def.stageIds?.length) {
      if (!run.stageId || !def.stageIds.includes(run.stageId)) return false
    }
    if (def.primaryFates?.length) {
      if (!run.primaryFate || !def.primaryFates.includes(run.primaryFate)) return false
    }
    if (def.requiresInstitutionalTags?.length) {
      const ok = def.requiresInstitutionalTags.some((t) => instTags.includes(t))
      if (!ok) return false
    }
    if (def.minEffectCount !== undefined) {
      if (!hasNonLogEffects(def)) return false
    }
    return true
  })
}

export function weightedPick<T>(
  items: T[],
  weightOf: (item: T) => number,
  rand: () => number
): T | null {
  if (!items.length) return null
  const weights = items.map(weightOf)
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return items[Math.floor(rand() * items.length)] ?? null
  let roll = rand() * total
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) return items[i] ?? null
  }
  return items[items.length - 1] ?? null
}

function routineRollCount(run: PlayRunState, rand: () => number): number {
  const r = rand()
  let count = r < 0.25 ? 0 : r < 0.7 ? 1 : 2
  const delinquency = run.econ?.delinquency ?? 0
  const flood = institutionalTagIds(run).includes('mandate_flood')
  if (delinquency >= 2 || flood) {
    count += 1
  }
  return Math.min(count, MAX_MANDATE_QUEUE)
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
    case 'institutionalTag': {
      const tagId = effect.tagId as InstitutionalTagId | undefined
      if (!tagId) break
      const week = run.chapter?.chapterWeekIndex
      next = {
        ...next,
        institutionalTags: mergeTagRecords(next.institutionalTags, [
          {
            id: tagId,
            appliedAtWeek: week,
            expiryWeek: effect.expiryWeek,
            source: 'mandate'
          }
        ])
      }
      break
    }
    case 'log':
      if (effect.message) logs.unshift(effect.message)
      break
    case 'queueMandate':
      if (effect.mandateId) {
        next = appendPending(next, effect.mandateId)
      }
      break
    case 'primaryFateTransition': {
      const toFate = effect.toFate as PrimaryFate | undefined
      if (!toFate || toFate === run.primaryFate) break
      if (toFate === 'ghost_bound') {
        next = {
          ...next,
          primaryFate: 'ghost_bound',
          setpiece: {
            ...next.setpiece,
            fateUpdatePending: {
              from: run.primaryFate,
              to: 'ghost_bound',
              trigger: 'ghost_bind'
            }
          }
        }
        next = initGhostLedgerOnTransition(next)
        logs.unshift('阴司绑定登记完成——阳债转入冥籍双账。')
      }
      break
    }
    default:
      break
  }

  return { ...next, logs: logs.slice(0, 80) }
}

function applyEffects(run: PlayRunState, effects: MandateEffect[]): PlayRunState {
  return effects.reduce((acc, eff) => applyEffect(acc, eff), run)
}

function issuerLabelForDef(def: MandateDeliveryDef): string {
  if (def.issuerTag?.trim()) return def.issuerTag.trim()
  const sep = def.title.indexOf('·')
  if (sep > 0) return def.title.slice(0, sep).trim()
  return def.title.trim()
}

function fuzzFlagsForRun(run: PlayRunState): MandateInboxFuzzFlags {
  const numbness = run.mandate?.numbness ?? 0
  const mandateFlood = institutionalTagIds(run).includes('mandate_flood')
  return {
    costBlur: numbness >= NUMBNESS_MUTE_THRESHOLD,
    issuerNoise: mandateFlood || numbness >= NUMBNESS_MUTE_THRESHOLD
  }
}

/** Prefer stable left compliant id (ack-min) for spec-stable unblur (RESEARCH A2) */
export function clauseLiterateUnblurIdForResponses(responses: MandateResponseDef[]): string | undefined {
  const compliant = responses.filter((r) => !r.grit)
  const left = compliant[0]
  if (left?.id) return left.id
  return responses[0]?.id
}

export function fuzzFlagsForRunWithResponses(
  run: PlayRunState,
  responses: MandateResponseDef[]
): MandateInboxFuzzFlags {
  const base = fuzzFlagsForRun(run)
  if (!clauseLiterateActive(run)) return base
  const unblurId = clauseLiterateUnblurIdForResponses(responses)
  if (!unblurId) return base
  return { ...base, clauseLiterateUnblurId: unblurId }
}

/** 新周开始时掷来文并追加队列（config 驱动，禁止 week 魔数） */
export function rollMandatesForWeek(run: PlayRunState): PlayRunState {
  if (!isChapterLikeRun(run) || !run.chapter) return run

  const mandate = ensureMandate(run)
  if (mandate.pendingDeliveryIds.length >= MAX_MANDATE_QUEUE) return run

  const config = getChapterConfig(run.chapter.chapterId)
  const week = run.chapter.chapterWeekIndex
  const rand = seededRand((run.seed ?? 1) * 1009 + week * 97)

  let next = run
  const picked = new Set<string>()

  const tryPick = (pool: MandatePoolKey) => {
    const eligible = eligibleMandates(next, listMandatesForRunPool(next, pool)).filter(
      (d) => !picked.has(d.id)
    )
    const choice = weightedPick(
      eligible,
      (d) => {
        let w = d.weight ?? 1
        if (clauseLiterateActive(next) && isClauseCreditMandate(d)) w += 1
        return w
      },
      rand
    )
    if (!choice) return
    picked.add(choice.id)
    next = appendPending(next, choice.id)
  }

  const routineCount = Math.min(
    routineRollCount(next, rand),
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
  const responses = visibleResponsesForRun(run, def)
  return {
    deliveryId: id,
    title: def.title,
    body: def.body,
    queueSize: run.mandate!.pendingDeliveryIds.length,
    responses,
    numbness: run.mandate!.numbness,
    issuerLabel: issuerLabelForDef(def),
    fuzzFlags: fuzzFlagsForRunWithResponses(run, responses)
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
