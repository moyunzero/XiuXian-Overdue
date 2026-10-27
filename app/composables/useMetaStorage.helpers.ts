import type { MetaProgress } from '~/types/play'
import { emptyMetaProgress, normalizeMetaProgress } from '~/logic/play/metaProgress'

export const META_SCHEMA_VERSION = 1 as const
export const META_SAVE_KEY = 'kunxu_sim_meta_v1'

export interface MetaSaveContainer {
  saveSchemaVersion: typeof META_SCHEMA_VERSION
  metaProgressId: 'default'
  progress: MetaProgress
}

export function emptyMetaSave(): MetaSaveContainer {
  return {
    saveSchemaVersion: META_SCHEMA_VERSION,
    metaProgressId: 'default',
    progress: emptyMetaProgress()
  }
}

export function parseMetaSave(raw: string | null): MetaSaveContainer {
  if (!raw) return emptyMetaSave()
  try {
    const parsed = JSON.parse(raw) as Partial<MetaSaveContainer>
    if (parsed.saveSchemaVersion !== META_SCHEMA_VERSION) {
      return emptyMetaSave()
    }
    return {
      saveSchemaVersion: META_SCHEMA_VERSION,
      metaProgressId: 'default',
      progress: normalizeMetaProgress(parsed.progress)
    }
  } catch {
    return emptyMetaSave()
  }
}

export function serializeMetaSave(container: MetaSaveContainer): string {
  return JSON.stringify(container)
}
