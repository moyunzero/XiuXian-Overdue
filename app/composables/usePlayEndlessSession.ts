import { computed, ref } from 'vue'
import type { BodyPartId, PlayRunState, PressureCardDef } from '~/types/play'
import { usePlayStorage } from '~/composables/usePlayStorage'
import {
  getPressureCardById,
  togglePressureCard,
  canEndRound,
  resolvePressureRound,
  beginNextRoundAfterResolve
} from '~/logic/play/pressureDeck'
import { buildDebtDashboardVM } from '~/logic/play/debtDashboard'
import { refreshRunInbox } from '~/logic/play/inboxFromTemplates'
import {
  applyBodyMortgageToRun,
  dismissBodyMortgage
} from '~/logic/play/bodyMortgage'
import { confirmBreakthrough } from '~/logic/play/breakthroughFlow'
import { formatEndlessHud } from '~/logic/play/endlessFlow'
import {
  afterWorkRoundGate,
  prepareEndlessRunForPlay,
  resumePressureAfterWorkSetpiece,
  shouldBeginNextPressureRoundAfterResolve,
  endlessSetpieceBlocksPlay
} from '~/logic/play/setpieceFlow'
import {
  applyJobChoice,
  buildJobChoicePending,
  needsJobChoice
} from '~/logic/play/workFlow'
import { appendPlayAiMomentIfDue } from '~/logic/play/playAiMoments'
import { resolvePlayScreen } from '~/logic/play/resolvePlayScreen'

export function usePlayEndlessSession() {
  const playStorage = usePlayStorage()
  const run = ref<PlayRunState | null>(null)

  function initFromRun(base: PlayRunState) {
    let next = prepareEndlessRunForPlay(base)
    next = refreshRunInbox(next)
    run.value = next
    playStorage.setActiveRun(next)
  }

  const offeredCards = computed((): PressureCardDef[] => {
    const p = run.value?.pressure
    if (!p) return []
    return p.offeredCardIds.map((id) => getPressureCardById(id)).filter(Boolean) as PressureCardDef[]
  })

  const selectedIds = computed(() => run.value?.pressure?.playedCardIds ?? [])
  const roundResolved = computed(() => run.value?.pressure?.resolved ?? false)
  const breakthroughPending = computed(() => run.value?.setpiece?.breakthroughPending ?? null)
  const jobChoicePending = computed(() =>
    run.value && needsJobChoice(run.value) ? buildJobChoicePending(run.value) : null
  )
  const bodyMortgagePending = computed(() => run.value?.setpiece?.bodyMortgagePending ?? null)
  const debtVm = computed(() => (run.value ? buildDebtDashboardVM(run.value) : null))
  const endlessHud = computed(() => (run.value ? formatEndlessHud(run.value) : null))
  const recentLogs = computed(() => run.value?.logs.slice(-6).reverse() ?? [])
  const pressureBlocked = computed(() =>
    run.value ? endlessSetpieceBlocksPlay(run.value) : false
  )
  const isCollapsed = computed(() => run.value?.runStatus === 'collapsed')
  const playScreen = computed(() => resolvePlayScreen(run.value))

  function aiMomentsEnabled(): boolean {
    return playStorage.getPlayMeta().aiEventsEnabled
  }

  function toggleCard(cardId: string) {
    if (!run.value || roundResolved.value || pressureBlocked.value) return
    const next = togglePressureCard(run.value, cardId)
    run.value = next
    playStorage.setActiveRun(next)
  }

  function confirmRound() {
    if (!run.value || !canEndRound(run.value)) return
    let next = resolvePressureRound(run.value)
    next = refreshRunInbox(next)
    next = afterWorkRoundGate(next)
    if (next.setpiece?.breakthroughPending) {
      next = appendPlayAiMomentIfDue(next, 'breakthrough', { enabled: aiMomentsEnabled() })
    }
    if (!next.setpiece?.bodyMortgagePending && !next.setpiece?.breakthroughPending) {
      if (shouldBeginNextPressureRoundAfterResolve(next, 'work')) {
        next = beginNextRoundAfterResolve(next)
      }
    }
    run.value = next
    playStorage.setActiveRun(next)
  }

  function confirmBreakthroughGate() {
    if (!run.value?.setpiece?.breakthroughPending) return
    let next = confirmBreakthrough(run.value)
    next = refreshRunInbox(next)
    next = resumePressureAfterWorkSetpiece(next)
    if (!next.pressure || next.pressure.resolved) {
      next = prepareEndlessRunForPlay(next)
    }
    run.value = next
    playStorage.setActiveRun(next)
  }

  function acceptBodyMortgage(partId: BodyPartId) {
    if (!run.value?.setpiece?.bodyMortgagePending) return
    let next = applyBodyMortgageToRun(run.value, partId)
    next = refreshRunInbox(next)
    next = resumePressureAfterWorkSetpiece(next)
    if (!next.pressure || next.pressure.resolved) {
      next = prepareEndlessRunForPlay(next)
    }
    run.value = next
    playStorage.setActiveRun(next)
  }

  function refuseBodyMortgage() {
    if (!run.value?.setpiece?.bodyMortgagePending) return
    let next = dismissBodyMortgage(run.value)
    next = refreshRunInbox(next)
    next = resumePressureAfterWorkSetpiece(next)
    if (!next.pressure || next.pressure.resolved) {
      next = prepareEndlessRunForPlay(next)
    }
    run.value = next
    playStorage.setActiveRun(next)
  }

  function chooseJob(jobId: string) {
    if (!run.value) return
    let next = applyJobChoice(run.value, jobId)
    next = refreshRunInbox(next)
    next = resumePressureAfterWorkSetpiece(next)
    if (!next.pressure || next.pressure.resolved) {
      next = prepareEndlessRunForPlay(next)
    }
    run.value = next
    playStorage.setActiveRun(next)
  }

  return {
    run,
    breakthroughPending,
    jobChoicePending,
    bodyMortgagePending,
    debtVm,
    endlessHud,
    recentLogs,
    offeredCards,
    selectedIds,
    roundResolved,
    pressureBlocked,
    isCollapsed,
    playScreen,
    initFromRun,
    chooseJob,
    toggleCard,
    confirmRound,
    confirmBreakthroughGate,
    acceptBodyMortgage,
    refuseBodyMortgage
  }
}
