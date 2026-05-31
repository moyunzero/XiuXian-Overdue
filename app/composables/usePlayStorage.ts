import type { KunxuSaveV4, PlayMeta, PlayRunState } from '~/types/play'
import type { SaveSlotId } from '~/types/game'
import type { Act1Persist } from '~/types/act1'
import {
  PLAY_SAVE_KEY as PLAY_SAVE_KEY_V5,
  LEGACY_SAVE_KEY as LEGACY_SAVE_KEY_V2,
  LEGACY_SAVE_KEY,
  parseV4Save,
  serializeV4Save,
  emptyV4Save,
  migrateRunFromAct1Persist,
  findRunBySlot
} from './usePlayStorage.helpers'
import { touchPlayRun } from '~/logic/play/createPlayRun'
import { normalizePlayMeta, recordRunToPlayMeta } from '~/logic/play/playMeta'

function readLegacyAct1BySlot(): Record<string, Act1Persist> | null {
  if (!import.meta.client) return null
  try {
    const raw = localStorage.getItem(LEGACY_SAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { act1BySlot?: Record<string, Act1Persist> }
    return parsed.act1BySlot ?? null
  } catch {
    return null
  }
}

export function usePlayStorage() {
  function readContainer(): KunxuSaveV4 {
    if (!import.meta.client) return emptyV4Save()
    const current = localStorage.getItem(PLAY_SAVE_KEY_V5)
    if (current) return parseV4Save(current)
    const prev = localStorage.getItem('kunxu_sim_save_v4')
    if (prev) {
      const migrated = parseV4Save(prev)
      localStorage.setItem(PLAY_SAVE_KEY_V5, serializeV4Save(migrated))
      return migrated
    }
    const legacy = localStorage.getItem(LEGACY_SAVE_KEY_V2)
    if (legacy) return parseV4Save(legacy)
    return parseV4Save(null)
  }

  function writeContainer(container: KunxuSaveV4): void {
    if (!import.meta.client) return
    localStorage.setItem(PLAY_SAVE_KEY, serializeV4Save(container))
  }

  function getActiveRun(): PlayRunState | null {
    const c = readContainer()
    if (!c.activeRunId) return null
    return c.runs[c.activeRunId] ?? null
  }

  function setActiveRun(run: PlayRunState): void {
    const c = readContainer()
    const next = touchPlayRun(run)
    c.runs[next.runId] = next
    c.activeRunId = next.runId
    if (
      next.runStatus === 'archived' ||
      next.runStatus === 'collapsed' ||
      next.runStatus === 'ended'
    ) {
      c.meta = recordRunToPlayMeta(c.meta, next)
    }
    writeContainer(c)
  }

  function updateActiveRun(patch: Partial<PlayRunState>): PlayRunState | null {
    const c = readContainer()
    if (!c.activeRunId) return null
    const cur = c.runs[c.activeRunId]
    if (!cur) return null
    const next = touchPlayRun({ ...cur, ...patch, runId: cur.runId, schemaVersion: 4 })
    c.runs[next.runId] = next
    writeContainer(c)
    return next
  }

  function ensureRunForSlot(slotId: SaveSlotId): PlayRunState | null {
    const c = readContainer()
    const existing = findRunBySlot(c, slotId)
    if (existing) {
      c.activeRunId = existing.runId
      writeContainer(c)
      return existing
    }

    const legacy = readLegacyAct1BySlot()
    const persist = legacy?.[slotId]
    if (!persist?.act1) return null

    const run = migrateRunFromAct1Persist(slotId, persist)
    c.runs[run.runId] = run
    c.activeRunId = run.runId
    writeContainer(c)
    return run
  }

  function clearActiveRun(): void {
    const c = readContainer()
    c.activeRunId = null
    writeContainer(c)
  }

  function getPlayMeta(): PlayMeta {
    return normalizePlayMeta(readContainer().meta)
  }

  function updatePlayMeta(patch: Partial<PlayMeta>): PlayMeta {
    const c = readContainer()
    c.meta = normalizePlayMeta({ ...c.meta, ...patch })
    writeContainer(c)
    return c.meta
  }

  /** 将 run 快照合并进全局 meta（结案 / 归档时调用） */
  function recordRunMeta(run: PlayRunState): PlayMeta {
    const c = readContainer()
    c.meta = recordRunToPlayMeta(c.meta, run)
    writeContainer(c)
    return c.meta
  }

  return {
    readContainer,
    writeContainer,
    getActiveRun,
    setActiveRun,
    updateActiveRun,
    ensureRunForSlot,
    clearActiveRun,
    getPlayMeta,
    updatePlayMeta,
    recordRunMeta
  }
}
