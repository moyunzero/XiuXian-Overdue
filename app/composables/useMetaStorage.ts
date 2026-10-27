import type { MetaProgress, PrimaryFate } from '~/types/play'
import {
  META_SAVE_KEY,
  emptyMetaSave,
  parseMetaSave,
  serializeMetaSave,
  type MetaSaveContainer
} from './useMetaStorage.helpers'
import { parseV4Save, PLAY_SAVE_KEY } from './usePlayStorage.helpers'
import {
  getEligibleStartBundles,
  recordFateSeen as recordFateSeenLogic
} from '~/logic/play/metaProgress'
import { normalizePlayMeta } from '~/logic/play/playMeta'

/** MVP: no PlayMeta → passiveIds bridge map (D-103 read-only legacy) */
const LEGACY_PASSIVE_BRIDGE: Record<string, string[]> = {}

export function readMetaContainer(): MetaSaveContainer {
  if (!import.meta.client) return emptyMetaSave()
  try {
    return parseMetaSave(localStorage.getItem(META_SAVE_KEY))
  } catch {
    return emptyMetaSave()
  }
}

export function writeMetaProgress(progress: MetaProgress): MetaProgress {
  const container: MetaSaveContainer = {
    saveSchemaVersion: 1,
    metaProgressId: 'default',
    progress
  }
  if (!import.meta.client) return container.progress
  localStorage.setItem(META_SAVE_KEY, serializeMetaSave(container))
  return container.progress
}

export function useMetaStorage() {
  function readContainer(): MetaSaveContainer {
    return readMetaContainer()
  }

  function readMeta(): MetaProgress {
    return readMetaContainer().progress
  }

  function writeMeta(progress: MetaProgress): MetaProgress {
    return writeMetaProgress(progress)
  }

  function recordFateSeen(fate: PrimaryFate): MetaProgress {
    const next = recordFateSeenLogic(readMeta(), fate)
    writeMeta(next)
    return next
  }

  function getEligibleBundles(): string[] {
    return getEligibleStartBundles(readMeta())
  }

  /** Union legacy PlayMeta unlock ids into passiveIds when explicit map exists (D-103) */
  function readMetaWithLegacyBridge(): MetaProgress {
    let progress = readMeta()
    if (!import.meta.client || Object.keys(LEGACY_PASSIVE_BRIDGE).length === 0) {
      return progress
    }
    const playRaw = localStorage.getItem(PLAY_SAVE_KEY)
    const playMeta = normalizePlayMeta(parseV4Save(playRaw).meta)
    const passive = new Set(progress.passiveIds ?? [])
    for (const unlockId of playMeta.priorMetaUnlocks) {
      for (const passiveId of LEGACY_PASSIVE_BRIDGE[unlockId] ?? []) {
        passive.add(passiveId)
      }
    }
    if (passive.size === (progress.passiveIds?.length ?? 0)) return progress
    progress = { ...progress, passiveIds: [...passive] }
    writeMeta(progress)
    return progress
  }

  return {
    readContainer,
    readMeta,
    writeMeta,
    recordFateSeen,
    getEligibleBundles,
    readMetaWithLegacyBridge
  }
}
