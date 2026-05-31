import { computed, type ComputedRef, type Ref } from 'vue'
import type { PlayRunState } from '~/types/play'
import { resolvePlayScreen, type PlayScreenId } from '~/logic/play/resolvePlayScreen'

export type PlayOrchestratorInput = {
  playRun: Ref<PlayRunState | null>
  act1Ready: ComputedRef<boolean>
  chapterDebtReady: ComputedRef<boolean>
  endlessDebtReady: ComputedRef<boolean>
}

/** I2：单一 `playScreen` 出口，禁止在 page 重复 priority 条件 */
export function usePlayOrchestrator(input: PlayOrchestratorInput) {
  const playScreen = computed((): PlayScreenId => {
    const run = input.playRun.value
    if (!run) return 'loading'
    if (run.lifeStage === 'pre' && !input.act1Ready.value) return 'loading'

    const screen = resolvePlayScreen(run)
    if (screen === 'loading') return 'loading'

    if (run.runMode === 'chapter' && run.lifeStage !== 'pre' && !input.chapterDebtReady.value) {
      return 'loading'
    }
    if (run.runMode === 'endless' && !input.endlessDebtReady.value) return 'loading'

    return screen
  })

  const isPreAct1 = computed(() => playScreen.value === 'pre-act1')
  const isChapterRun = computed(
    () =>
      input.playRun.value?.runMode === 'chapter' &&
      input.playRun.value.lifeStage !== 'pre' &&
      playScreen.value !== 'loading'
  )
  const isEndlessRun = computed(
    () => input.playRun.value?.runMode === 'endless' && playScreen.value !== 'loading'
  )

  return { playScreen, isPreAct1, isChapterRun, isEndlessRun }
}
