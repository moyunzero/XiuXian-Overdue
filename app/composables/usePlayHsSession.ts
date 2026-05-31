import { computed, ref } from 'vue'
import type { PlayRunState, PressureCardDef } from '~/types/play'
import { usePlayStorage } from '~/composables/usePlayStorage'
import {
  getPressureCardById,
  togglePressureCard,
  canEndRound,
  resolvePressureRound,
  beginNextRoundAfterResolve,
  rngForRun
} from '~/logic/play/pressureDeck'
import {
  hsSetpieceBlocksPressure,
  prepareHsRunForPlay,
  resumePressureAfterHsSetpiece,
  shouldBeginNextPressureRoundAfterResolve
} from '~/logic/play/setpieceFlow'
import { buildDebtDashboardVM } from '~/logic/play/debtDashboard'
import { ensureHsRunReady, createHsFieldsFromStart } from '~/logic/play/createHsPlayState'
import { useAct1Storage } from '~/composables/useAct1Storage'
import { dismissExamBoss } from '~/logic/play/examBoss'
import { refreshRunInbox } from '~/logic/play/inboxFromTemplates'
import { applyBodyMortgageToRun,
  buildBodyMortgagePending,
  dismissBodyMortgage
} from '~/logic/play/bodyMortgage'
import {
  scheduleBreakthroughIfDue
} from '~/logic/play/breakthroughFlow'
import type { BodyPartId } from '~/types/play'
import type { Act1Carryover } from '~/types/act1'
import {
  appendPlayAiMomentIfDue,
  shouldFireDelinquencySpike
} from '~/logic/play/playAiMoments'

export function usePlayHsSession() {
  const playStorage = usePlayStorage()
  const act1Storage = useAct1Storage()
  const run = ref<PlayRunState | null>(null)

  function act1FallbackFor(run: PlayRunState) {
    return act1Storage.loadAct1(run.slotId)?.act1 ?? null
  }

  function ensureHsRun(base: PlayRunState, carryover?: Act1Carryover): PlayRunState {
    return ensureHsRunReady(base, carryover, act1FallbackFor(base))
  }

  function maybeAttachBodyMortgage(next: PlayRunState): PlayRunState {
    if (
      next.setpiece?.examBossPending ||
      next.setpiece?.bodyMortgagePending ||
      next.setpiece?.breakthroughPending
    ) {
      return next
    }
    const pending = buildBodyMortgagePending(next, rngForRun(next))
    if (!pending) return next
    return {
      ...next,
      setpiece: { ...next.setpiece, bodyMortgagePending: pending }
    }
  }

  function afterRoundGate(next: PlayRunState): PlayRunState {
    if (
      next.setpiece?.examBossPending ||
      next.setpiece?.bodyMortgagePending ||
      next.setpiece?.breakthroughPending
    ) {
      return next
    }
    const withMortgage = maybeAttachBodyMortgage(next)
    return scheduleBreakthroughIfDue(withMortgage)
  }

  function initFromRun(base: PlayRunState, carryover?: Act1Carryover) {
    const next = prepareHsRunForPlay(ensureHsRun(base, carryover))
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

  const examBossPending = computed(() => run.value?.setpiece?.examBossPending ?? null)

  const bodyMortgagePending = computed(() => run.value?.setpiece?.bodyMortgagePending ?? null)

  const debtVm = computed(() => (run.value ? buildDebtDashboardVM(run.value) : null))

  const recentLogs = computed(() => run.value?.logs.slice(-6).reverse() ?? [])

  function aiMomentsEnabled(): boolean {
    return playStorage.getPlayMeta().aiEventsEnabled
  }

  function toggleCard(cardId: string) {
    if (!run.value || roundResolved.value || hsSetpieceBlocksPressure(run.value)) {
      return
    }
    const next = togglePressureCard(run.value, cardId)
    run.value = next
    playStorage.setActiveRun(next)
  }

  function confirmRound() {
    if (!run.value || !canEndRound(run.value)) return
    const prevDelinquency = run.value.econ?.delinquency ?? 0
    let next = resolvePressureRound(run.value)
    if (shouldFireDelinquencySpike(prevDelinquency, next.econ?.delinquency ?? 0)) {
      next = appendPlayAiMomentIfDue(next, 'delinquency-spike', {
        enabled: aiMomentsEnabled()
      })
    }
    next = afterRoundGate(next)
    if (shouldBeginNextPressureRoundAfterResolve(next, 'hs')) {
      next = beginNextRoundAfterResolve(next)
    }
    run.value = next
    playStorage.setActiveRun(next)
  }

  function confirmExamBoss() {
    if (!run.value?.setpiece?.examBossPending) return
    const examScore = run.value.setpiece.examBossPending.score
    let next = dismissExamBoss(run.value)
    next = appendPlayAiMomentIfDue(next, 'post-exam', {
      enabled: aiMomentsEnabled(),
      examScore
    })
    next = refreshRunInbox(next)
    next = scheduleBreakthroughIfDue(next)
    next = resumePressureAfterHsSetpiece(next)
    run.value = next
    playStorage.setActiveRun(next)
  }

  function acceptBodyMortgage(partId: BodyPartId) {
    if (!run.value?.setpiece?.bodyMortgagePending) return
    let next = applyBodyMortgageToRun(run.value, partId)
    next = refreshRunInbox(next)
    next = resumePressureAfterHsSetpiece(next)
    run.value = next
    playStorage.setActiveRun(next)
  }

  function refuseBodyMortgage() {
    if (!run.value?.setpiece?.bodyMortgagePending) return
    let next = dismissBodyMortgage(run.value)
    next = scheduleBreakthroughIfDue(next)
    next = resumePressureAfterHsSetpiece(next)
    run.value = next
    playStorage.setActiveRun(next)
  }

  function startFreshHs(base: PlayRunState, carryover?: Act1Carryover) {
    const act1 = act1FallbackFor(base)
    const hsFields = createHsFieldsFromStart(base.start, carryover, act1 ?? undefined)
    const fresh: PlayRunState = refreshRunInbox({
      ...base,
      ...hsFields,
      lifeStage: 'hs',
      chapterIndex: 0,
      pressure: undefined,
      setpiece: undefined,
      act1: act1 ?? undefined
    })
    initFromRun(fresh, carryover)
  }

  return {
    run,
    offeredCards,
    selectedIds,
    roundResolved,
    examBossPending,
    bodyMortgagePending,
    debtVm,
    recentLogs,
    initFromRun,
    startFreshHs,
    toggleCard,
    confirmRound,
    confirmExamBoss,
    acceptBodyMortgage,
    refuseBodyMortgage
  }
}
