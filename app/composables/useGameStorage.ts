import type { GameState } from '~/types/game'
import * as Engine from '~/logic/gameEngine'
import { useGameState } from './useGameState'
import {
  SAVE_SCHEMA_VERSION,
  SAVE_DEBOUNCE_MS,
  planDualWriteSlots,
  serializeSaveContainer,
  isLikelyValidGameState
} from './useGameStorage.helpers'

export type SaveSlotId = 'autosave' | 'slot1' | 'slot2' | 'slot3'

const STORAGE_KEY = 'kunxu_sim_save_v2'

/** D-02：写入失败时短句（冷制度） */
const STORAGE_WRITE_FAILED_MSG = '本地存档写入失败。系统将继续运行，但进度可能无法保存。'

export interface SaveSlotMeta {
  id: SaveSlotId
  label: string
  updatedAt: number
  started: boolean
  day: number
  week: number
  tier: GameState['school']['classTier']
  cash: number
  debt: number
}

export interface SaveContainer {
  activeSlot: SaveSlotId
  saveSchemaVersion: number
  slots: Partial<Record<SaveSlotId, { meta: SaveSlotMeta; state: GameState }>>
}

/** 未落盘的合并容器（防抖期间优先于磁盘） */
let pendingMerge: SaveContainer | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 清空防抖队列与 localStorage（首页「清空存档」等调用，避免 pending 复活旧档）
 */
export function resetModuleStorageState() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  pendingMerge = null
  if (import.meta.server) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function useGameStorage() {
  const { game } = useGameState()
  const activeSlot = useState<SaveSlotId>('activeSlot', () => 'autosave')
  const storageError = useState<string | null>('game-storage-error', () => null)
  const storageCorrupt = useState<string | null>('game-storage-corrupt', () => null)

  const clearStorageError = () => {
    storageError.value = null
  }
  const clearStorageCorrupt = () => {
    storageCorrupt.value = null
  }

  const buildMeta = (id: SaveSlotId, label: string, g: GameState): SaveSlotMeta => {
    const debt = Math.max(0, g.econ.coreDebt + g.econ.collectionFee + g.econ.debtPrincipal + g.econ.debtInterestAccrued)
    return {
      id,
      label,
      updatedAt: Date.now(),
      started: g.started,
      day: g.school.day,
      week: g.school.week,
      tier: g.school.classTier,
      cash: Math.floor(g.econ.cash),
      debt: Math.floor(debt)
    }
  }

  const defaultSlotLabel = (id: SaveSlotId) => (id === 'autosave' ? '自动存档' : `存档${id.slice(-1)}`)

  /** 从磁盘读取；JSON 损坏时作废并冷提示（D-04） */
  const loadContainerFromDisk = (): SaveContainer | null => {
    if (import.meta.server) return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as SaveContainer
      if (!parsed || typeof parsed !== 'object' || parsed.slots === null || typeof parsed.slots !== 'object') {
        throw new Error('invalid container shape')
      }
      if (typeof parsed.saveSchemaVersion !== 'number' || parsed.saveSchemaVersion < 1) {
        parsed.saveSchemaVersion = SAVE_SCHEMA_VERSION
      }
      return parsed
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      storageCorrupt.value = '本地存档数据已损坏，无法恢复。记录已按制度作废；请新开一局。'
      return null
    }
  }

  const persistContainerImmediate = (container: SaveContainer) => {
    if (import.meta.server) return
    try {
      const payload = serializeSaveContainer(container as unknown as Record<string, unknown>)
      localStorage.setItem(STORAGE_KEY, payload)
      storageError.value = null
    } catch {
      storageError.value = STORAGE_WRITE_FAILED_MSG
    }
  }

  /** 合并防抖中的未落盘数据 */
  const getWorkingContainer = (): SaveContainer => {
    if (pendingMerge) return pendingMerge
    const disk = loadContainerFromDisk()
    if (disk) return disk
    return {
      activeSlot: activeSlot.value,
      slots: {},
      saveSchemaVersion: SAVE_SCHEMA_VERSION
    }
  }

  /** D-05：尾部防抖落盘 */
  const scheduleFlush = () => {
    if (import.meta.server) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      if (pendingMerge) {
        persistContainerImmediate(pendingMerge)
        pendingMerge = null
      }
    }, SAVE_DEBOUNCE_MS)
  }

  /** 立即将防抖队列写入磁盘（读档前调用，避免丢末次写入） */
  const flushPendingSaves = () => {
    if (import.meta.server) return
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (pendingMerge) {
      persistContainerImmediate(pendingMerge)
      pendingMerge = null
    }
  }

  /** 兼容旧导出：立即写入 */
  const saveContainer = (container: SaveContainer) => {
    if (import.meta.server) return
    pendingMerge = container
    flushPendingSaves()
  }

  /** 对外：与 listSlots 一致，含未落盘合并 */
  const loadContainer = (): SaveContainer => {
    return getWorkingContainer()
  }

  const saveToSlot = (id: SaveSlotId, label?: string) => {
    if (import.meta.server) return
    const base = getWorkingContainer()
    if (typeof base.saveSchemaVersion !== 'number') base.saveSchemaVersion = SAVE_SCHEMA_VERSION

    base.activeSlot = id
    activeSlot.value = id

    const slotsToWrite = planDualWriteSlots(id)
    for (const slotId of slotsToWrite) {
      const slotLabel =
        slotId === 'autosave'
          ? '自动存档'
          : label ?? base.slots[slotId]?.meta.label ?? defaultSlotLabel(slotId)
      base.slots[slotId] = {
        meta: buildMeta(slotId, slotLabel, game.value),
        state: game.value
      }
    }

    pendingMerge = base
    scheduleFlush()
  }

  const loadFromSlot = (id: SaveSlotId) => {
    flushPendingSaves()
    const container = loadContainerFromDisk()
    const payload = container?.slots?.[id]
    if (!payload) return false
    const state = payload.state
    if (!isLikelyValidGameState(state)) return false

    // Migrate legacy saves: ensure bodyPartRepayment exists and is valid
    if (!state.bodyPartRepayment || typeof state.bodyPartRepayment !== 'object') {
      state.bodyPartRepayment = {}
    } else {
      const validIds = new Set(['LeftArm', 'RightArm', 'LeftLeg', 'RightLeg', 'LeftPalm', 'RightPalm'])
      const validated: Record<string, boolean> = {}
      for (const [key, val] of Object.entries(state.bodyPartRepayment)) {
        if (validIds.has(key) && typeof val === 'boolean') {
          validated[key] = val
        }
      }
      state.bodyPartRepayment = validated
    }

    if (typeof state.bodyIntegrity !== 'number' || state.bodyIntegrity < 0 || state.bodyIntegrity > 1.0) state.bodyIntegrity = 1.0
    if (state.bodyReputation !== 'clean' && state.bodyReputation !== 'marked') state.bodyReputation = 'clean'
    if (typeof state.buyDebasement !== 'number' || state.buyDebasement < 0) state.buyDebasement = 0
    if (typeof state.econ.coreDebt !== 'number' || state.econ.coreDebt < 0) state.econ.coreDebt = 0
    if (typeof state.econ.initialCoreDebt !== 'number' || state.econ.initialCoreDebt < 0) {
      state.econ.initialCoreDebt = state.econ.coreDebt
    }
    if (typeof state.econ.collectionFee !== 'number' || state.econ.collectionFee < 0) state.econ.collectionFee = 0
    if (state.lastBodyPartDay !== undefined && typeof state.lastBodyPartDay !== 'number') state.lastBodyPartDay = undefined
    if (!Array.isArray(state.pendingNarratives)) state.pendingNarratives = []
    if (!state.familyHistory || typeof state.familyHistory !== 'object') state.familyHistory = {}
    if (typeof state.domestication !== 'number' || state.domestication < 0) state.domestication = 0
    if (typeof state.numbness !== 'number' || state.numbness < 0) state.numbness = 0
    if (typeof state.summaryUnlocked !== 'boolean') state.summaryUnlocked = false
    if (typeof state.summarySeen !== 'boolean') state.summarySeen = false
    if (state.summaryUnlockedAtDay !== undefined && typeof state.summaryUnlockedAtDay !== 'number') state.summaryUnlockedAtDay = undefined
    if (state.summarySeenAtDay !== undefined && typeof state.summarySeenAtDay !== 'number') state.summarySeenAtDay = undefined
    if (Engine.shouldUnlockSummary(state) && !state.summaryUnlocked) {
      state.summaryUnlocked = true
      if (state.summaryUnlockedAtDay === undefined) state.summaryUnlockedAtDay = state.school.day
    }

    game.value = state
    activeSlot.value = id
    return true
  }

  const listSlots = computed(() => {
    const container = getWorkingContainer()
    const ids: SaveSlotId[] = ['autosave', 'slot1', 'slot2', 'slot3']
    return ids.map((sid) => container?.slots?.[sid]?.meta ?? null)
  })

  return {
    activeSlot,
    saveToSlot,
    loadFromSlot,
    listSlots,
    buildMeta,
    loadContainer,
    saveContainer,
    flushPendingSaves,
    STORAGE_KEY,
    storageError,
    storageCorrupt,
    clearStorageError,
    clearStorageCorrupt,
    SAVE_SCHEMA_VERSION
  }
}
