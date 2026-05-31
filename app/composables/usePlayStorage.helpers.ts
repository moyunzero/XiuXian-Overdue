import type { KunxuSaveV4, PlayRunState } from '~/types/play'
import type { SaveSlotId } from '~/types/game'
import type { Act1Persist } from '~/types/act1'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { DEFAULT_PLAY_META, normalizePlayMeta } from '~/logic/play/playMeta'
import { initChapter } from '~/logic/play/chapterWeekFlow'

export const PLAY_SAVE_SCHEMA_VERSION = 6 as const
export const PLAY_SAVE_KEY = 'kunxu_sim_save_v5'
export const LEGACY_SAVE_KEY = 'kunxu_sim_save_v2'

export function emptyV4Save(): KunxuSaveV4 {
  return {
    saveSchemaVersion: PLAY_SAVE_SCHEMA_VERSION,
    activeRunId: null,
    runs: {},
    meta: { ...DEFAULT_PLAY_META }
  }
}

export function parseV4Save(raw: string | null): KunxuSaveV4 {
  if (!raw) return emptyV4Save()
  try {
    const parsed = JSON.parse(raw) as KunxuSaveV4
    const incomingVersion = parsed.saveSchemaVersion ?? 4
    if (incomingVersion !== PLAY_SAVE_SCHEMA_VERSION && incomingVersion !== 4 && incomingVersion !== 5) {
      return emptyV4Save()
    }
    const migratedRuns = Object.fromEntries(
      Object.entries(parsed.runs ?? {}).map(([id, run]) => {
        const r = run as PlayRunState & Record<string, unknown>
        return [id, migrateStoredRun(r)]
      })
    )
    return {
      saveSchemaVersion: PLAY_SAVE_SCHEMA_VERSION,
      activeRunId: parsed.activeRunId ?? null,
      runs: migratedRuns,
      meta: normalizePlayMeta(parsed.meta)
    }
  } catch {
    return emptyV4Save()
  }
}

function stripLegacyCampaignSetpiece(setpiece: PlayRunState['setpiece']): PlayRunState['setpiece'] {
  if (!setpiece) return setpiece
  return {
    ...setpiece,
    harvestLedgerPending: undefined,
    hsPromotionGatePending: undefined,
    hsPromotionGateResolved: undefined,
    uniFoundationGatePending: undefined,
    uniFoundationGateResolved: undefined,
    workPromotionGatePending: undefined,
    workPromotionGateResolved: undefined
  }
}

function migrateStoredRun(r: PlayRunState & Record<string, unknown>): PlayRunState {
  let next: PlayRunState = {
    ...r,
    schemaVersion: 4,
    campaign: undefined,
    setpiece: stripLegacyCampaignSetpiece(r.setpiece)
  }

  const legacyMode = r.runMode as string
  if (legacyMode === 'campaign' || legacyMode === 'endless') {
    next = { ...next, runMode: 'endless' }
  }

  if (next.runMode === 'endless' && next.lifeStage !== 'pre' && next.econ && next.school) {
    next = initChapter({ ...next, runMode: 'chapter' })
  } else if (next.runMode !== 'endless' && next.runMode !== 'chapter') {
    next = { ...next, runMode: 'chapter' }
  }

  if (next.runMode === 'chapter' && !next.chapter && next.lifeStage !== 'pre') {
    next = initChapter(next)
  }

  return next
}

export function serializeV4Save(container: KunxuSaveV4): string {
  return JSON.stringify(container)
}

/** 从 v2 槽位 act1 迁移一条 run（仅当无存档 run 时） */
export function migrateRunFromAct1Persist(
  slotId: SaveSlotId,
  persist: Act1Persist
): PlayRunState {
  const run = createPlayRunFromStartConfig(persist.startConfig, slotId, { runMode: 'chapter' })
  return {
    ...run,
    lifeStage: 'pre',
    chapterIndex: 0,
    logs: ['存档已从旧版迁移，部分记录已重置。']
  }
}

export function findRunBySlot(container: KunxuSaveV4, slotId: SaveSlotId): PlayRunState | null {
  return Object.values(container.runs).find((r) => r.slotId === slotId && r.runStatus === 'active') ?? null
}
