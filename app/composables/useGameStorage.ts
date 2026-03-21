import type { GameState } from '~/types/game'
import { useGameState } from './useGameState'

const STORAGE_KEY = 'kunxu_sim_save_v2'
const LEGACY_STORAGE_KEY = 'kunxu_sim_save_v1'

export type SaveSlotId = 'autosave' | 'slot1' | 'slot2' | 'slot3'

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
  slots: Partial<Record<SaveSlotId, { meta: SaveSlotMeta; state: GameState }>>
}

export function useGameStorage() {
  const { game } = useGameState()
  const activeSlot = useState<SaveSlotId>('activeSlot', () => 'autosave')

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

  const saveContainer = (container: SaveContainer) => {
    if (import.meta.server) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(container))
    } catch {
      // ignore
    }
  }

  const loadContainer = (): SaveContainer | null => {
    if (import.meta.server) return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as SaveContainer
    } catch {
      return null
    }
  }

  const saveToSlot = (id: SaveSlotId, label?: string) => {
    const container = loadContainer() ?? { activeSlot: activeSlot.value, slots: {} }
    const slotLabel = label ?? container.slots[id]?.meta.label ?? (id === 'autosave' ? '自动存档' : `存档${id.slice(-1)}`)
    container.activeSlot = id
    activeSlot.value = id
    container.slots[id] = {
      meta: buildMeta(id, slotLabel, game.value),
      state: game.value
    }
    saveContainer(container)
  }

  const loadFromSlot = (id: SaveSlotId) => {
    const container = loadContainer()
    const payload = container?.slots?.[id]
    if (!payload) return false
    const state = payload.state

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
    if (typeof state.econ.collectionFee !== 'number' || state.econ.collectionFee < 0) state.econ.collectionFee = 0
    if (typeof state.econ.coreDebt !== 'number' || state.econ.coreDebt < 0) state.econ.coreDebt = 0
    if (typeof state.econ.initialCoreDebt !== 'number' || state.econ.initialCoreDebt < 0) state.econ.initialCoreDebt = state.econ.coreDebt
    if (state.lastBodyPartDay !== undefined && typeof state.lastBodyPartDay !== 'number') state.lastBodyPartDay = undefined
    if (!Array.isArray(state.pendingNarratives)) state.pendingNarratives = []
    if (!state.familyHistory || typeof state.familyHistory !== 'object') state.familyHistory = {}
    if (typeof state.domestication !== 'number' || state.domestication < 0) state.domestication = 0
    if (typeof state.numbness !== 'number' || state.numbness < 0) state.numbness = 0

    game.value = state
    activeSlot.value = id
    return true
  }

  const listSlots = computed(() => {
    const container = loadContainer()
    const ids: SaveSlotId[] = ['autosave', 'slot1', 'slot2', 'slot3']
    return ids.map((id) => container?.slots?.[id]?.meta ?? null)
  })

  return {
    activeSlot,
    saveToSlot,
    loadFromSlot,
    listSlots,
    buildMeta,
    loadContainer,
    saveContainer,
    STORAGE_KEY,
    LEGACY_STORAGE_KEY
  }
}
