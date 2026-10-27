import type { MandateDeliveryDef } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import {
  BUNDLE_MORTGAGE_FILE_COPY,
  getEligibleStartBundles,
  normalizeMetaProgress,
  type MetaProgress
} from '~/logic/play/metaProgress'

export interface StartBundleDef {
  id: string
  playerLabel: string
  clauseLiterateWeeks: number
  /** Requires mortgaged in unlockedFatesSeen (D-95) */
  unlockFate: 'mortgaged'
}

export const START_BUNDLE_REGISTRY: Record<string, StartBundleDef> = {
  [BUNDLE_MORTGAGE_FILE_COPY]: {
    id: BUNDLE_MORTGAGE_FILE_COPY,
    playerLabel: '抵押档案副本',
    clauseLiterateWeeks: 5,
    unlockFate: 'mortgaged'
  }
}

export function clauseLiterateActive(run: PlayRunState): boolean {
  return (run.startBundlePassiveWeeksLeft ?? 0) > 0
}

/** T-05-02: reject unknown bundleId; no initialDebt mutation (D-109) */
export function applyStartBundlePassive(run: PlayRunState, bundleId: string | null | undefined): PlayRunState {
  if (!bundleId || bundleId === 'standard') return run
  const def = START_BUNDLE_REGISTRY[bundleId]
  if (!def) return run
  return {
    ...run,
    selectedStartBundleId: bundleId,
    startBundlePassiveWeeksLeft: def.clauseLiterateWeeks,
    metaProgressId: run.metaProgressId ?? 'default'
  }
}

export function tickStartBundlePassive(run: PlayRunState): PlayRunState {
  const weeks = run.startBundlePassiveWeeksLeft
  if (weeks == null || weeks <= 0) return run
  return { ...run, startBundlePassiveWeeksLeft: weeks - 1 }
}

export function isClauseCreditMandate(def: MandateDeliveryDef): boolean {
  if (def.issuerTag?.trim() === '征信灵籍') return true
  if (def.id.startsWith('ch0-debt')) return true
  if (def.title.includes('条款') || def.body.includes('条款')) return true
  return false
}

export function getEligibleStartBundlesFromRegistry(progress: MetaProgress): string[] {
  const normalized = normalizeMetaProgress(progress)
  const catalog = new Set(normalized.startBundles ?? [])
  const seen = new Set(normalized.unlockedFatesSeen ?? [])
  const eligible: string[] = []

  for (const def of Object.values(START_BUNDLE_REGISTRY)) {
    if (!catalog.has(def.id)) continue
    if (def.unlockFate === 'mortgaged' && seen.has('mortgaged')) {
      eligible.push(def.id)
    }
  }
  return eligible
}

export { getEligibleStartBundles }
