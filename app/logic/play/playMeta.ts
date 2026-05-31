import type { Act1Carryover } from '~/types/act1'
import type { PlayMeta, PlayRunState, RealmTierId } from '~/types/play'
import { listRealmTemplates } from '~/logic/play/realmTemplates'

export const HIDDEN_STANDARD_DEBT_NEVER_ZERO = 'standard-debt-never-zero'

export const DEFAULT_PLAY_META: PlayMeta = {
  priorMetaUnlocks: [],
  hiddenStandardsRevealed: [],
  realmNotesUnlocked: {},
  campaignCompletions: 0,
  endlessMaxRealmIndex: 0,
  aiEventsEnabled: true
}

export function normalizePlayMeta(raw?: Partial<PlayMeta> | null): PlayMeta {
  const prior = raw?.priorMetaUnlocks ?? []
  return {
    priorMetaUnlocks: [...new Set(prior.filter((id) => typeof id === 'string' && id.length > 0))],
    hiddenStandardsRevealed: [
      ...new Set((raw?.hiddenStandardsRevealed ?? []).filter((id) => typeof id === 'string'))
    ],
    realmNotesUnlocked: { ...(raw?.realmNotesUnlocked ?? {}) },
    campaignCompletions: Math.max(0, raw?.campaignCompletions ?? 0),
    endlessMaxRealmIndex: Math.max(0, raw?.endlessMaxRealmIndex ?? 0),
    aiEventsEnabled: raw?.aiEventsEnabled !== false
  }
}

export function mergePriorMetaUnlocks(meta: PlayMeta, ids: string[]): PlayMeta {
  const merged = [...new Set([...meta.priorMetaUnlocks, ...ids.filter(Boolean)])]
  let next: PlayMeta = { ...meta, priorMetaUnlocks: merged }
  if (merged.length >= 2 && !next.hiddenStandardsRevealed.includes(HIDDEN_STANDARD_DEBT_NEVER_ZERO)) {
    next = {
      ...next,
      hiddenStandardsRevealed: [...next.hiddenStandardsRevealed, HIDDEN_STANDARD_DEBT_NEVER_ZERO]
    }
  }
  return next
}

export function realmIndexForTier(tier: RealmTierId): number {
  const realms = listRealmTemplates()
  const found = realms.find((r) => r.id === tier)
  return found?.order ?? 0
}

/** 从 run 快照提取可写入全局 meta 的词条 */
export function metaUnlockIdsFromRun(run: PlayRunState): string[] {
  const ids = new Set<string>()
  for (const id of run.carryoverFromAct1?.metaUnlocks ?? []) {
    ids.add(id)
  }
  for (const tag of run.profileTags) {
    if (
      tag === 'witness-departure' ||
      tag === 'family-guarantor' ||
      tag === 'family-false-hope' ||
      tag === 'price-aware' ||
      tag === 'ad-resistant' ||
      tag === 'special-track-memo'
    ) {
      ids.add(tag)
    }
  }
  if (run.campaign?.chosenEnding) {
    ids.add(`campaign-ended-${run.campaign.chosenEnding}`)
  }
  return [...ids]
}

export function recordRunToPlayMeta(meta: PlayMeta, run: PlayRunState): PlayMeta {
  let next = mergePriorMetaUnlocks(meta, metaUnlockIdsFromRun(run))

  if (run.runStatus === 'archived') {
    next = { ...next, campaignCompletions: next.campaignCompletions + 1 }
  }

  const realmIdx = realmIndexForTier(run.realmTier ?? 'mortal')
  if (realmIdx > next.endlessMaxRealmIndex) {
    next = { ...next, endlessMaxRealmIndex: realmIdx }
  }

  const notes = next.realmNotesUnlocked[run.realmTier ?? 'mortal'] ?? []
  if (run.runMode === 'endless' && run.setpiece?.breakthroughPending) {
    const realmLabel = run.setpiece.breakthroughPending.nextRealmLabel
    const line = `破境备忘：${realmLabel} 关口已记入制度样本库。`
    if (!notes.includes(line)) {
      next = {
        ...next,
        realmNotesUnlocked: {
          ...next.realmNotesUnlocked,
          [run.realmTier ?? 'mortal']: [...notes, line]
        }
      }
    }
  }

  return next
}

const HIDDEN_STANDARD_HINTS: Record<string, string> = {
  [HIDDEN_STANDARD_DEBT_NEVER_ZERO]:
    '灵信·制度内参：负债清零不构成胜利条件；系统只记录你能撑过几个境界台阶。'
}

/** 将全局 meta 并入 Act1 carryover（利率仍走 permanentModifiers） */
export function enrichCarryoverWithPlayMeta(
  base: Act1Carryover,
  meta: PlayMeta
): Act1Carryover {
  const hints = [...(base.unlockedInboxHints ?? [])]
  let delBias = base.startingDelinquencyBias ?? 0

  if (meta.priorMetaUnlocks.includes('family-false-hope')) {
    delBias += 12
    hints.push('灵信：家庭周转贷条目仍挂账，催收线程可能提前进入联系人档位。')
  }
  if (meta.priorMetaUnlocks.includes('witness-departure')) {
    hints.push('灵信：上周目档案含「监护人迁出」见证，风控问卷将附加追问。')
  }
  if (meta.priorMetaUnlocks.includes('family-guarantor')) {
    hints.push('灵信：家庭担保合约已归档，可比产品列表将按担保档位重算。')
  }

  for (const id of meta.hiddenStandardsRevealed) {
    const hint = HIDDEN_STANDARD_HINTS[id]
    if (hint && !hints.includes(hint)) hints.push(hint)
  }

  const mergedUnlocks = [...new Set([...base.metaUnlocks, ...meta.priorMetaUnlocks])]

  return {
    ...base,
    metaUnlocks: mergedUnlocks,
    unlockedInboxHints: hints.length ? hints : base.unlockedInboxHints,
    startingDelinquencyBias: delBias > 0 ? delBias : base.startingDelinquencyBias
  }
}

export function mergePriorMetaForNewRun(containerMeta: PlayMeta, slotUnlocks: string[]): string[] {
  return [...new Set([...containerMeta.priorMetaUnlocks, ...slotUnlocks])]
}
