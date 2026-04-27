import { ref } from 'vue'
import type { GameState } from '~/types/game'
import {
  createSessionSummaryFromGameState,
  recordSession,
  initEmotionalMemory,
  EMOTIONAL_MEMORY_STORAGE_KEY
} from '~/logic/emotionalMemoryLayer'

export function useEmotionalMemoryStorage() {
  const sessionStartDay = ref(1)
  const sessionStartTime = ref(Date.now())
  const sessionAntiProfileStreakMax = ref(0)

  const loadEmotionalMemory = (): ReturnType<typeof initEmotionalMemory> => {
    if (import.meta.server) return initEmotionalMemory()
    try {
      const raw = localStorage.getItem(EMOTIONAL_MEMORY_STORAGE_KEY)
      if (!raw) return initEmotionalMemory()
      const parsed = JSON.parse(raw)
      return initEmotionalMemory(parsed)
    } catch {
      return initEmotionalMemory()
    }
  }

  const saveEmotionalMemory = (memory: ReturnType<typeof initEmotionalMemory>): void => {
    if (import.meta.server) return
    try {
      localStorage.setItem(EMOTIONAL_MEMORY_STORAGE_KEY, JSON.stringify(memory))
    } catch {
      // localStorage full or unavailable - graceful degradation
    }
  }

  const recordCurrentSession = (game: GameState) => {
    const currentGame = game
    if (currentGame.started && currentGame.sessionMetrics) {
      const memory = loadEmotionalMemory()
      const session = createSessionSummaryFromGameState(
        currentGame,
        sessionStartDay.value,
        sessionStartTime.value,
        sessionAntiProfileStreakMax.value
      )
      const updatedMemory = recordSession(memory, session)
      saveEmotionalMemory(updatedMemory)
    }
  }

  const resetSessionTracking = () => {
    sessionStartDay.value = 1
    sessionStartTime.value = Date.now()
    sessionAntiProfileStreakMax.value = 0
  }

  const updateSessionStartDay = (day: number) => {
    sessionStartDay.value = day
  }

  const updateSessionAntiProfileStreakMax = (streak: number) => {
    if (streak > sessionAntiProfileStreakMax.value) {
      sessionAntiProfileStreakMax.value = streak
    }
  }

  return {
    sessionStartDay,
    sessionStartTime,
    sessionAntiProfileStreakMax,
    loadEmotionalMemory,
    saveEmotionalMemory,
    recordCurrentSession,
    resetSessionTracking,
    updateSessionStartDay,
    updateSessionAntiProfileStreakMax
  }
}
