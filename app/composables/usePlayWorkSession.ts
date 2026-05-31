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
import {
  afterWorkRoundGate,
  prepareWorkRunForPlay,
  resumePressureAfterWorkSetpiece,
  shouldBeginNextPressureRoundAfterResolve,
  workSetpieceBlocksPlay
} from '~/logic/play/setpieceFlow'
import {
  applyJobChoice,
  buildJobChoicePending,
  formatWorkHud,
  needsJobChoice
} from '~/logic/play/workFlow'

export function usePlayWorkSession() {
  const playStorage = usePlayStorage()
  const run = ref<PlayRunState | null>(null)

  function initFromRun(base: PlayRunState) {
    let next = prepareWorkRunForPlay(base)
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

  const workPromotionGatePending = computed(() => null)

  const jobChoicePending = computed(() =>
    run.value && needsJobChoice(run.value) ? buildJobChoicePending(run.value) : null
  )

  const bodyMortgagePending = computed(() => run.value?.setpiece?.bodyMortgagePending ?? null)

  const harvestLedgerPending = computed(() => null)

  const debtVm = computed(() => (run.value ? buildDebtDashboardVM(run.value) : null))

  const workHud = computed(() => (run.value ? formatWorkHud(run.value) : null))

  const recentLogs = computed(() => run.value?.logs.slice(-6).reverse() ?? [])

  const pressureBlocked = computed(() =>
    run.value ? workSetpieceBlocksPlay(run.value) : false
  )

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
    if (shouldBeginNextPressureRoundAfterResolve(next, 'work')) {
      next = beginNextRoundAfterResolve(next)
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
      next = prepareWorkRunForPlay(next)
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
      next = prepareWorkRunForPlay(next)
    }
    run.value = next
    playStorage.setActiveRun(next)
  }

  function confirmWorkGate() {
    return
  }

  function chooseCampaignEnding() {
    return
  }

  function chooseJob(jobId: string) {
    if (!run.value) return
    let next = applyJobChoice(run.value, jobId)
    next = refreshRunInbox(next)
    next = resumePressureAfterWorkSetpiece(next)
    if (!next.pressure || next.pressure.resolved) {
      next = prepareWorkRunForPlay(next)
    }
    run.value = next
    playStorage.setActiveRun(next)
  }

  return {
    run,
    workPromotionGatePending,
    jobChoicePending,
    bodyMortgagePending,
    harvestLedgerPending,
    debtVm,
    workHud,
    recentLogs,
    offeredCards,
    selectedIds,
    roundResolved,
    pressureBlocked,
    initFromRun,
    confirmWorkGate,
    chooseJob,
    toggleCard,
    confirmRound,
    acceptBodyMortgage,
    refuseBodyMortgage,
    chooseCampaignEnding
  }
}
