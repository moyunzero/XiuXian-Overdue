import { computed, ref } from 'vue'
import type { PlayRunState, PressureCardDef } from '~/types/play'
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
  applySectChoice,
  formatUniSubscriptionHud,
  foundationKpiRows,
  foundationKpiSummary,
  tickUniSubscriptions
} from '~/logic/play/uniFlow'
import {
  prepareUniRunForPlay,
  resumePressureAfterUniSetpiece,
  shouldBeginNextPressureRoundAfterResolve,
  uniSetpieceBlocksPressure
} from '~/logic/play/setpieceFlow'

export function usePlayUniSession() {
  const playStorage = usePlayStorage()
  const run = ref<PlayRunState | null>(null)

  function initFromRun(base: PlayRunState) {
    let next = prepareUniRunForPlay(base)
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

  const sectChoicePending = computed(() => run.value?.setpiece?.sectChoicePending ?? null)

  const uniFoundationGatePending = computed(() => null)

  const debtVm = computed(() => (run.value ? buildDebtDashboardVM(run.value) : null))

  const recentLogs = computed(() => run.value?.logs.slice(-6).reverse() ?? [])

  const foundationSummary = computed(() =>
    run.value ? foundationKpiSummary(run.value) : null
  )

  const foundationRows = computed(() => (run.value ? foundationKpiRows(run.value) : null))

  const subscriptionHud = computed(() =>
    run.value ? formatUniSubscriptionHud(run.value) : null
  )

  const foundationHint = computed(() => null)

  const pressureRoundLabel = computed(() => {
    if (!run.value?.pressure || uniSetpieceBlocksPressure(run.value)) return null
    return `压力回合 ${run.value.pressure.round}`
  })

  function toggleCard(cardId: string) {
    if (!run.value || roundResolved.value || uniSetpieceBlocksPressure(run.value)) {
      return
    }
    const next = togglePressureCard(run.value, cardId)
    run.value = next
    playStorage.setActiveRun(next)
  }

  function confirmRound() {
    if (!run.value || !canEndRound(run.value)) return
    let next = resolvePressureRound(run.value)
    next = tickUniSubscriptions(next)
    next = refreshRunInbox(next)
    if (shouldBeginNextPressureRoundAfterResolve(next, 'uni')) {
      next = beginNextRoundAfterResolve(next)
    }
    run.value = next
    playStorage.setActiveRun(next)
  }

  function confirmFoundationGate() {
    return
  }

  function confirmSectChoice(sectId: string) {
    if (!run.value?.setpiece?.sectChoicePending) return
    let next = applySectChoice(run.value, sectId)
    next = refreshRunInbox(next)
    run.value = next
    playStorage.setActiveRun(next)
  }

  return {
    run,
    offeredCards,
    selectedIds,
    roundResolved,
    sectChoicePending,
    uniFoundationGatePending,
    debtVm,
    recentLogs,
    foundationSummary,
    foundationRows,
    subscriptionHud,
    foundationHint,
    pressureRoundLabel,
    initFromRun,
    toggleCard,
    confirmRound,
    confirmSectChoice,
    confirmFoundationGate
  }
}
