import type { Act1Persist } from '~/types/act1'
import {
  SAVE_SCHEMA_VERSION,
  serializeSaveContainer
} from '~/composables/useGameStorage.helpers'
import type { SaveContainer, SaveSlotId } from '~/composables/useGameStorage'

const STORAGE_KEY = 'kunxu_sim_save_v2'

function emptyContainer(): SaveContainer {
  return {
    activeSlot: 'autosave',
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    slots: {},
    act1BySlot: {}
  }
}

function readContainer(): SaveContainer {
  if (import.meta.server) return emptyContainer()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyContainer()
    const parsed = JSON.parse(raw) as SaveContainer
    if (!parsed || typeof parsed !== 'object') return emptyContainer()
    if (!parsed.act1BySlot) parsed.act1BySlot = {}
    if (typeof parsed.saveSchemaVersion !== 'number' || parsed.saveSchemaVersion < SAVE_SCHEMA_VERSION) {
      parsed.saveSchemaVersion = SAVE_SCHEMA_VERSION
    }
    return parsed
  } catch {
    return emptyContainer()
  }
}

function writeContainer(container: SaveContainer) {
  if (import.meta.server) return
  try {
    const payload = serializeSaveContainer(container as unknown as Record<string, unknown>)
    localStorage.setItem(STORAGE_KEY, payload)
  } catch {
    /* ignore */
  }
}

export function useAct1Storage() {
  const loadAct1 = (slot: SaveSlotId): Act1Persist | null => {
    const c = readContainer()
    return c.act1BySlot?.[slot] ?? null
  }

  const saveAct1 = (slot: SaveSlotId, data: Act1Persist) => {
    const c = readContainer()
    if (!c.act1BySlot) c.act1BySlot = {}
    c.act1BySlot[slot] = data
    c.saveSchemaVersion = SAVE_SCHEMA_VERSION
    writeContainer(c)
  }

  const clearAct1 = (slot: SaveSlotId) => {
    const c = readContainer()
    if (!c.act1BySlot?.[slot]) return
    delete c.act1BySlot[slot]
    writeContainer(c)
  }

  return { loadAct1, saveAct1, clearAct1 }
}
