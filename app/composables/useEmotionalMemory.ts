import type {
  EmotionalMemory,
  PersonalityProfile,
  HiddenModifiers,
  SessionSummary,
  GameState
} from '~/types/game'
import {
  initEmotionalMemory,
  recordSession,
  buildPersonalityProfile,
  getHiddenModifiers,
  createDefaultEmotionalMemory,
  EMOTIONAL_MEMORY_STORAGE_KEY,
  createSessionSummaryFromGameState
} from '~/logic/emotionalMemoryLayer'

const STORAGE_KEY = EMOTIONAL_MEMORY_STORAGE_KEY

export function useEmotionalMemory() {
  const memory = useState<EmotionalMemory>('emotional-memory', () =>
    createDefaultEmotionalMemory()
  )

  const isLoaded = useState<boolean>('eml-loaded', () => false)

  const loadFromStorage = (): EmotionalMemory | null => {
    if (import.meta.server) return null

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null

      const parsed = JSON.parse(raw)
      return initEmotionalMemory(parsed)
    } catch {
      return null
    }
  }

  const saveToStorage = (mem: EmotionalMemory): void => {
    if (import.meta.server) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mem))
    } catch {
      // localStorage full or unavailable - graceful degradation
    }
  }

  const initialize = (): void => {
    if (isLoaded.value) return

    const stored = loadFromStorage()
    if (stored) {
      memory.value = stored
    } else {
      memory.value = createDefaultEmotionalMemory()
    }

    isLoaded.value = true
  }

  const recordGameSession = (
    gameState: GameState,
    startDay: number,
    startTime: number,
    antiProfileStreakMax: number = 0
  ): void => {
    const session = createSessionSummaryFromGameState(
      gameState,
      startDay,
      startTime,
      antiProfileStreakMax
    )

    memory.value = recordSession(memory.value, session)
    saveToStorage(memory.value)
  }

  const getProfile = computed((): PersonalityProfile => {
    return buildPersonalityProfile(memory.value)
  })

  const getModifiers = computed((): HiddenModifiers => {
    const profile = getProfile.value
    return getHiddenModifiers(profile)
  })

  const hasMemory = computed((): boolean => {
    return memory.value.sessions.length > 0
  })

  const sessionCount = computed((): number => {
    return memory.value.sessions.length
  })

  const exportMemory = (): string => {
    return JSON.stringify(memory.value, null, 2)
  }

  const importMemory = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json)
      const validated = initEmotionalMemory(parsed)

      memory.value = validated
      saveToStorage(memory.value)
      return true
    } catch {
      return false
    }
  }

  const clearMemory = (): void => {
    memory.value = createDefaultEmotionalMemory()
    if (import.meta.server) return

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  return {
    memory: readonly(memory),
    isLoaded: readonly(isLoaded),
    hasMemory,
    sessionCount,
    getProfile,
    getModifiers,
    initialize,
    recordGameSession,
    exportMemory,
    importMemory,
    clearMemory
  }
}
