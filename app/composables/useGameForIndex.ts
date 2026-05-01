import type { GameState } from '~/types/game'
import { useState } from '#app'
import { defaultState } from './useGameState'
import type { SaveSlotId } from '~/composables/useGameStorage'
import { ref } from 'vue'

export type { SaveSlotId }

const STORAGE_KEY = 'kunxu_sim_save_v2'

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

interface SaveContainer {
  activeSlot: SaveSlotId
  saveSchemaVersion: number
  slots: Partial<Record<SaveSlotId, { meta: SaveSlotMeta; state: GameState }>>
}

const storageVersion = ref(0)

let pendingMerge: SaveContainer | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function resetModuleStorageState() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  pendingMerge = null
  storageVersion.value++
  if (import.meta.server) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function isLikelyValidGameState(state: unknown): state is GameState {
  if (!state || typeof state !== 'object') return false
  const s = state as Record<string, unknown>
  return (
    typeof s.started === 'boolean' &&
    typeof s.stats === 'object' &&
    typeof s.econ === 'object' &&
    typeof s.school === 'object'
  )
}

function buildMeta(id: SaveSlotId, label: string, g: GameState): SaveSlotMeta {
  const debt = Math.max(0, g.econ.collectionFee + g.econ.debtPrincipal + g.econ.debtInterestAccrued)
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

function defaultSlotLabel(id: SaveSlotId) {
  return id === 'autosave' ? '自动存档' : `存档${id.slice(-1)}`
}

function loadContainerFromDisk(): SaveContainer | null {
  if (import.meta.server) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SaveContainer
    if (!parsed || typeof parsed !== 'object' || parsed.slots === null || typeof parsed.slots !== 'object') {
      throw new Error('invalid container shape')
    }
    return parsed
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    return null
  }
}

function persistContainerImmediate(container: SaveContainer) {
  if (import.meta.server) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(container))
  } catch {
    /* ignore */
  }
}

function getWorkingContainer(): SaveContainer {
  if (pendingMerge) return pendingMerge
  const disk = loadContainerFromDisk()
  if (disk) return disk
  return {
    activeSlot: 'autosave',
    slots: {},
    saveSchemaVersion: 1
  }
}

function scheduleFlush() {
  if (import.meta.server) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    if (pendingMerge) {
      persistContainerImmediate(pendingMerge)
      pendingMerge = null
    }
  }, 500)
}

function flushPendingSaves() {
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

export function useGameForIndex() {
  const { game } = useGameState()
  const activeSlot = useState<SaveSlotId>('activeSlot', () => 'autosave')

  const saveToSlot = (id: SaveSlotId, label?: string) => {
    if (import.meta.server) return
    const base = getWorkingContainer()
    base.activeSlot = id
    activeSlot.value = id

    const dualWriteSlots: SaveSlotId[] = id === 'autosave' ? ['autosave'] : ['autosave', id]
    for (const slotId of dualWriteSlots) {
      const slotLabel = slotId === 'autosave' ? '自动存档' : label ?? base.slots[slotId]?.meta.label ?? defaultSlotLabel(slotId)
      base.slots[slotId] = {
        meta: buildMeta(slotId, slotLabel, game.value),
        state: game.value
      }
    }

    pendingMerge = base
    scheduleFlush()
  }

  const deleteSlot = (id: SaveSlotId) => {
    if (import.meta.server) return
    flushPendingSaves()
    const container = getWorkingContainer()
    if (container?.slots?.[id]) {
      delete container.slots[id]
      pendingMerge = container
      scheduleFlush()
    }
    storageVersion.value++
  }

  const loadFromSlot = (id: SaveSlotId): boolean => {
    flushPendingSaves()
    const container = loadContainerFromDisk()
    const payload = container?.slots?.[id]
    if (!payload) return false
    const state = payload.state
    if (!isLikelyValidGameState(state)) return false

    if (!state.bodyPartRepayment || typeof state.bodyPartRepayment !== 'object') {
      state.bodyPartRepayment = {}
    }
    if (typeof state.bodyIntegrity !== 'number' || state.bodyIntegrity < 0 || state.bodyIntegrity > 1.0) state.bodyIntegrity = 1.0
    if (state.bodyReputation !== 'clean' && state.bodyReputation !== 'marked') state.bodyReputation = 'clean'
    if (typeof state.buyDebasement !== 'number' || state.buyDebasement < 0) state.buyDebasement = 0
    if (typeof state.econ.collectionFee !== 'number' || state.econ.collectionFee < 0) state.econ.collectionFee = 0
    if (!Array.isArray(state.pendingNarratives)) state.pendingNarratives = []
    if (!state.familyHistory || typeof state.familyHistory !== 'object') state.familyHistory = {}
    if (typeof state.domestication !== 'number' || state.domestication < 0) state.domestication = 0
    if (typeof state.numbness !== 'number' || state.numbness < 0) state.numbness = 0
    if (typeof state.summaryUnlocked !== 'boolean') state.summaryUnlocked = false
    if (typeof state.summarySeen !== 'boolean') state.summarySeen = false

    game.value = state
    activeSlot.value = id
    return true
  }

  const listSlots = computed(() => {
    storageVersion
    const container = getWorkingContainer()
    const ids: SaveSlotId[] = ['autosave', 'slot1', 'slot2', 'slot3']
    return ids.map((sid) => container?.slots?.[sid]?.meta ?? null)
  })

  const reset = () => {
    game.value = defaultState()
    resetModuleStorageState()
    activeSlot.value = 'autosave'
  }

  const startNew = (cfg: {
    playerName: string
    background: string
    talent: string
    initialDebt: number
    startingCity: string
  }) => {
    const g = defaultState()
    g.started = true
    g.startConfig = cfg
    g.seed = Math.floor(Math.random() * 1_000_000_000)

    const bgCash = cfg.background === '贫民' ? 800 : cfg.background === '中产' ? 3200 : 12000
    const bgRate = cfg.background === '贫民' ? 0.008 : cfg.background === '中产' ? 0.006 : 0.007

    const tFa = cfg.talent === '无灵根' ? 6.2 : cfg.talent === '伪灵根' ? 7.4 : 9.2
    const tFocus = cfg.talent === '无灵根' ? 52 : cfg.talent === '伪灵根' ? 58 : 64

    g.econ.cash = bgCash
    g.econ.collectionFee = 0
    g.econ.dailyRate = bgRate
    cfg.initialDebt = Math.max(5000, cfg.initialDebt)
    const split = { principal: cfg.initialDebt }
    g.econ.debtPrincipal = split.principal
    g.stats.faLi = tFa
    g.stats.focus = tFocus
    g.stats.daoXin = 1
    g.stats.rouTi = 0.6
    g.school.classTier = '普通班'

    game.value = g
  }

  return {
    game,
    activeSlot,
    listSlots,
    loadFromSlot,
    saveToSlot,
    deleteSlot,
    reset,
    startNew
  }
}
