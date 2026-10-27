import type { MetaProgress, PlayRunState, PrimaryFate } from '~/types/play'

/** MVP 命运档案 strip 可见主形态总数（D-114） */
export const MVP_CODEX_FATE_COUNT = 7

const VALID_PRIMARY_FATES: PrimaryFate[] = [
  'human',
  'indentured',
  'mortgaged',
  'ghost_voluntary',
  'head_jar',
  'ghost_bound',
  'shattered'
]

const VALID_FATE_SET = new Set<string>(VALID_PRIMARY_FATES)

/** 抵押档首次见过时解锁的开局包 catalog id（D-95） */
export const BUNDLE_MORTGAGE_FILE_COPY = 'bundle-mortgage-file-copy'

export function emptyMetaProgress(): MetaProgress {
  return {
    unlockedFatesSeen: ['human'],
    passiveIds: [],
    startBundles: []
  }
}

function dedupeFates(fates: unknown[]): PrimaryFate[] {
  const out: PrimaryFate[] = []
  const seen = new Set<string>()
  for (const raw of fates) {
    if (typeof raw !== 'string' || !VALID_FATE_SET.has(raw) || seen.has(raw)) continue
    seen.add(raw)
    out.push(raw as PrimaryFate)
  }
  return out
}

/** T-05-01: malformed input falls back to safe defaults */
export function normalizeMetaProgress(raw?: Partial<MetaProgress> | null): MetaProgress {
  if (!raw || typeof raw !== 'object') return emptyMetaProgress()

  const seen = dedupeFates(raw.unlockedFatesSeen ?? [])
  const passiveIds = [
    ...new Set((raw.passiveIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0))
  ]
  const startBundles = [
    ...new Set((raw.startBundles ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0))
  ]

  const unlockedFatesSeen = seen.length ? seen : ['human']

  return {
    unlockedFatesSeen,
    passiveIds,
    startBundles
  }
}

function addCatalogBundle(progress: MetaProgress, bundleId: string): MetaProgress {
  const catalog = new Set(progress.startBundles ?? [])
  if (catalog.has(bundleId)) return progress
  return { ...progress, startBundles: [...catalog, bundleId] }
}

export function unlockBundlesForFate(progress: MetaProgress, fate: PrimaryFate): MetaProgress {
  if (fate === 'mortgaged') {
    return addCatalogBundle(progress, BUNDLE_MORTGAGE_FILE_COPY)
  }
  return progress
}

export function recordFateSeen(progress: MetaProgress, fate: PrimaryFate): MetaProgress {
  if (!VALID_FATE_SET.has(fate)) return progress
  const seen = new Set(progress.unlockedFatesSeen ?? [])
  if (seen.has(fate)) return progress
  seen.add(fate)
  let next: MetaProgress = { ...progress, unlockedFatesSeen: [...seen] }
  return unlockBundlesForFate(next, fate)
}

export function collectFatesFromRun(run: PlayRunState): PrimaryFate[] {
  return [run.primaryFate]
}

/** D-105 safety merge: include run.primaryFate even if transition hook missed */
export function mergeFatesFromRun(progress: MetaProgress, run: PlayRunState): MetaProgress {
  let next = normalizeMetaProgress(progress)
  for (const fate of collectFatesFromRun(run)) {
    next = recordFateSeen(next, fate)
  }
  return next
}

export function recordFateIfChanged(
  prevFate: PrimaryFate,
  nextFate: PrimaryFate,
  progress: MetaProgress
): MetaProgress {
  if (prevFate === nextFate) return progress
  return recordFateSeen(progress, nextFate)
}

/** Catalog bundles whose unlock rules are satisfied (horizontal meta only, D-102) */
export function getEligibleStartBundles(progress: MetaProgress): string[] {
  const normalized = normalizeMetaProgress(progress)
  const catalog = normalized.startBundles ?? []
  const seen = new Set(normalized.unlockedFatesSeen ?? [])

  return catalog.filter((id) => {
    if (id === BUNDLE_MORTGAGE_FILE_COPY) return seen.has('mortgaged')
    return false
  })
}
