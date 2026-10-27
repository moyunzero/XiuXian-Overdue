import { computed, ref, watch } from 'vue'
import type { BodyPartId, PlayRunState, PrimaryFate } from '~/types/play'
import type { WeekPlan } from '~/types/chapter'
import { DEFAULT_CHAPTER_ID } from '~/types/chapter'
import { usePlayStorage } from '~/composables/usePlayStorage'
import { buildDebtDashboardVM } from '~/logic/play/debtDashboard'
import { refreshRunInbox } from '~/logic/play/inboxFromTemplates'
import {
  initChapter,
  resolveRepeatWeekPlan,
  DEFAULT_WEEK_PLAN,
  markBeatResolvedForWeek,
  isWeekActionAllowed,
  clampWeekPlanToSegment
} from '~/logic/play/chapterWeekFlow'
import { ensureFateRunMode } from '~/logic/play/milestoneWeekFlow'
import { dismissExamBoss, hasExamBossPending } from '~/logic/play/examBoss'
import { confirmBreakthrough } from '~/logic/play/breakthroughFlow'
import { applySectChoice } from '~/logic/play/uniFlow'
import { applyJobChoice, applyTrackChoice, buildJobChoicePending, buildTrackChoicePending, needsJobChoice, needsTrackChoice } from '~/logic/play/workFlow'
import { openSegmentGate } from '~/logic/play/segmentGate'
import { segmentForWeek, getChapterConfig } from '~/logic/play/chapterRegistry'
import { chapterPlayBlocked, resolvePlayScreen } from '~/logic/play/resolvePlayScreen'
import {
  applyBodyMortgageToRun,
  applyBloodDrawGrit,
  dismissBodyMortgage
} from '~/logic/play/bodyMortgage'
import { getFateShell } from '~/logic/play/fateShellRegistry'
import {
  buildMaintenanceBillPreview,
  getMortgagedIntegrityCap,
  headJarInputToWeekPlan,
  listDelegationJobs,
  weekPlanToHeadJarInput
} from '~/logic/play/headJarWeekPlan'
import {
  buildDualLedgerBillPreview,
  listGhostBoundDelegationJobs
} from '~/logic/play/ghostBoundWeekPlan'
import {
  delegationPanelCopy,
  fateUpdateOverlayBodyLine,
  formatPrimaryFateLabel
} from '~/logic/play/playerFacingCopy'
import {
  planFromScheduleMode
} from '~/logic/play/weekPlanTiles'
import { buildMandateInboxPending } from '~/logic/play/mandateDelivery'
import {
  advanceScheduleWeek,
  buildWeekSettlementSummary,
  respondMandateAndMaybeFinalize,
  weekEndFinalizePending,
  type WeekSettlementSummary
} from '~/logic/play/scheduleMandateFlow'
import {
  applyMandatePsyToActions,
  applyMandatePsyToRepayTiers,
  clampWeekPlanToPsy,
  weekPlanPsyNotice
} from '~/logic/play/mandatePsy'

export function useChapterSession() {
  const playStorage = usePlayStorage()
  const run = ref<PlayRunState | null>(null)
  const weekPlan = ref<WeekPlan>({ ...DEFAULT_WEEK_PLAN })
  const settlementFlash = ref<WeekSettlementSummary | null>(null)
  const statusFlash = ref<string | null>(null)
  const traumaStampFlash = ref<{ fate: PrimaryFate; visible: boolean } | null>(null)
  let statusFlashTimer: ReturnType<typeof setTimeout> | undefined

  function syncWeekPlanFromRun(base: PlayRunState | null) {
    if (!base) {
      weekPlan.value = { ...DEFAULT_WEEK_PLAN }
      return
    }
    const repeated = resolveRepeatWeekPlan(base)
    let plan = clampWeekPlanToSegment(base, clampWeekPlanToPsy(base, { ...repeated }))
    const shell = getFateShell(base)
    if (shell.scheduleMode === 'delegation_two' && !plan.maintenanceTier) {
      plan = headJarInputToWeekPlan({ maintenanceTier: 'austerity', delegationJob: 'yang_patrol' })
    }
    weekPlan.value = plan
  }

  function initFromRun(base: PlayRunState) {
    const chapterLike =
      (base.runMode === 'chapter' || base.runMode === 'fate_run') && base.chapter
    let next = chapterLike ? base : initChapter(base, DEFAULT_CHAPTER_ID)
    next = ensureFateRunMode(next)
    next = refreshRunInbox(next)
    run.value = next
    syncWeekPlanFromRun(next)
    playStorage.setActiveRun(next)
  }

  const playScreen = computed(() => resolvePlayScreen(run.value))
  const debtVm = computed(() => (run.value ? buildDebtDashboardVM(run.value) : null))
  const recentLogs = computed(() => run.value?.logs.slice(-8).reverse() ?? [])
  const weekBlocked = computed(() => {
    if (!run.value) return false
    if (chapterPlayBlocked(run.value)) return true
    return (run.value.mandate?.pendingDeliveryIds.length ?? 0) > 0
  })

  const examBossPending = computed(() => {
    const r = run.value
    if (!r) return null
    const pending = r.setpiece?.examBossPending
    return pending && hasExamBossPending(r) ? pending : null
  })
  const breakthroughPending = computed(() => run.value?.setpiece?.breakthroughPending ?? null)
  const sectChoicePending = computed(() => run.value?.setpiece?.sectChoicePending ?? null)
  const uniFoundationGatePending = computed(() => run.value?.setpiece?.uniFoundationGatePending ?? null)
  const bodyMortgagePending = computed(() => run.value?.setpiece?.bodyMortgagePending ?? null)
  const jobChoicePending = computed(() =>
    run.value && needsJobChoice(run.value) ? buildJobChoicePending(run.value) : null
  )
  const trackChoicePending = computed(() =>
    run.value && needsTrackChoice(run.value) ? buildTrackChoicePending(run.value) : null
  )
  const mandateInboxPending = computed(() =>
    run.value ? buildMandateInboxPending(run.value) : null
  )

  const chapterHud = computed(() => {
    const r = run.value
    if (!r?.chapter) return null
    const config = getChapterConfig(r.chapter.chapterId)
    const segment = segmentForWeek(config, r.chapter.chapterWeekIndex)
    return {
      title: config.title,
      weekLabel: `第 ${r.chapter.chapterWeekIndex} / ${r.chapter.weekBudget} 周`,
      contractRankLabel: `契约 · 第 ${r.chapter.chapterWeekIndex}/${r.chapter.weekBudget} 周 · ${segment?.label ?? ''}`,
      segmentLabel: segment?.label ?? '',
      weeksRemaining: r.chapter.weeksRemaining
    }
  })

  function segmentWeekActions(r: PlayRunState) {
    return {
      repay: isWeekActionAllowed(r, 'repay'),
      study: isWeekActionAllowed(r, 'study'),
      tuna: isWeekActionAllowed(r, 'tuna'),
      parttime: isWeekActionAllowed(r, 'parttime'),
      work: isWeekActionAllowed(r, 'work') && !!r.work?.jobId,
      rest: isWeekActionAllowed(r, 'rest')
    }
  }

  const weekSegmentActions = computed(() => {
    const r = run.value
    if (!r) {
      return {
        repay: false,
        study: false,
        tuna: false,
        parttime: false,
        work: false,
        rest: false
      }
    }
    return segmentWeekActions(r)
  })

  const weekActionFlags = computed(() => {
    const r = run.value
    if (!r) return weekSegmentActions.value
    return applyMandatePsyToActions(r, segmentWeekActions(r))
  })

  const weekRepayTiers = computed(() => {
    const r = run.value
    if (!r) {
      return { min: true, partial: true, extra: true, skip: true }
    }
    return applyMandatePsyToRepayTiers(r)
  })

  const weekPsyNotice = computed(() => {
    const r = run.value
    if (!r) return null
    return weekPlanPsyNotice(r)
  })

  const hasLastWeekPlan = computed(() => Boolean(run.value?.lastWeekPlan))

  const weekRepeatHint = computed(() => {
    const r = run.value
    if (!r?.lastWeekPlan) return null
    return '已按上周计划预填；可直接确认或微调后再提交。'
  })

  const scheduleMode = computed(() => {
    const r = run.value
    if (!r) return 'four_tile' as const
    return getFateShell(r).scheduleMode
  })

  const layoutToken = computed(() => {
    const r = run.value
    if (!r) return 'fate-human'
    return getFateShell(r).layoutToken
  })

  const statusBarFields = computed(() => {
    const r = run.value
    if (!r) return ['debt', 'cash', 'delinquency']
    return getFateShell(r).statusBarFields
  })

  const fateUpdatePending = computed(() => run.value?.setpiece?.fateUpdatePending ?? null)

  const fateUpdateOverlay = computed(() => {
    const pending = fateUpdatePending.value
    if (!pending) return null
    const toLabel = formatPrimaryFateLabel(pending.to)
    const fromLabel = formatPrimaryFateLabel(pending.from)
    return {
      fromFate: pending.from,
      toFate: pending.to,
      titleLine: `${fromLabel} → ${toLabel}`,
      bodyLine: fateUpdateOverlayBodyLine(pending.trigger, pending.to)
    }
  })

  const primaryFate = computed(() => run.value?.primaryFate ?? 'human')

  const showDualLedgerLabels = computed(() => primaryFate.value === 'ghost_bound')

  const delegationPanelStrings = computed(() =>
    delegationPanelCopy(primaryFate.value === 'ghost_bound' ? 'ghost_bound' : 'head_jar')
  )

  const dualLedgerBillPreview = computed(() => {
    const r = run.value
    if (!r || r.primaryFate !== 'ghost_bound' || scheduleMode.value !== 'delegation_two') {
      return null
    }
    const tier = weekPlan.value.maintenanceTier ?? 'austerity'
    return buildDualLedgerBillPreview(r, tier)
  })

  const maintenanceBillPreview = computed(() => {
    const r = run.value
    if (!r || scheduleMode.value !== 'delegation_two') return null
    const tier = weekPlan.value.maintenanceTier ?? 'austerity'
    if (r.primaryFate === 'ghost_bound') {
      buildDualLedgerBillPreview(r, tier)
    }
    return buildMaintenanceBillPreview(r, tier)
  })

  const delegationOptions = computed(() => {
    if (run.value?.primaryFate === 'ghost_bound') {
      return listGhostBoundDelegationJobs()
    }
    return listDelegationJobs()
  })

  const weekPressureEmphasis = computed((): 'debt' | 'vitality' =>
    scheduleMode.value === 'delegation_two' ? 'vitality' : 'debt'
  )

  const mortgagedIntegrityCap = computed(() => {
    const r = run.value
    if (!r || r.primaryFate !== 'mortgaged') return undefined
    return getMortgagedIntegrityCap()
  })

  const showBloodDraw = computed(() => run.value?.primaryFate === 'mortgaged')

  function persist(next: PlayRunState) {
    const prev = run.value
    run.value = next
    playStorage.setActiveRun(next)
    if (prev) {
      playStorage.recordFateIfChanged(prev, next)
    }
  }

  function dismissTraumaStamp() {
    traumaStampFlash.value = null
  }

  function confirmWeekPlan(plan?: WeekPlan) {
    if (!run.value || weekBlocked.value) return
    const shell = getFateShell(run.value)
    let effective: WeekPlan
    if (shell.scheduleMode === 'delegation_two') {
      const input = weekPlanToHeadJarInput(plan ?? weekPlan.value)
      if (!input) return
      effective = planFromScheduleMode(run.value, input)
    } else {
      const psyClamped = clampWeekPlanToPsy(run.value, plan ?? weekPlan.value)
      effective = clampWeekPlanToSegment(run.value, psyClamped)
    }
    const { run: next, blocked } = advanceScheduleWeek(run.value, effective)
    weekPlan.value = { ...effective }
    persist(refreshRunInbox(next))
    return blocked
  }

  function repeatLastWeekPlan() {
    if (!run.value?.lastWeekPlan) return
    const shell = getFateShell(run.value)
    if (shell.scheduleMode === 'delegation_two') {
      const input = weekPlanToHeadJarInput(run.value.lastWeekPlan)
      if (input) {
        weekPlan.value = planFromScheduleMode(run.value, input)
      } else {
        weekPlan.value = clampWeekPlanToSegment(run.value, { ...resolveRepeatWeekPlan(run.value) })
      }
    } else {
      weekPlan.value = clampWeekPlanToSegment(run.value, { ...resolveRepeatWeekPlan(run.value) })
    }
    confirmWeekPlan(weekPlan.value)
  }

  watch(
    () => run.value?.chapter?.chapterWeekIndex,
    () => {
      if (run.value) syncWeekPlanFromRun(run.value)
    }
  )

  function resumeAfterSetpiece(next: PlayRunState): PlayRunState {
    return markBeatResolvedForWeek(next)
  }

  function dismissExamBossScreen() {
    if (!run.value || !hasExamBossPending(run.value)) return
    let next = dismissExamBoss(run.value)
    next = resumeAfterSetpiece(next)
    if (next.chapter?.pendingGateId) {
      next = openSegmentGate(next, next.chapter.pendingGateId, 'pass')
    }
    persist(refreshRunInbox(next))
  }

  function confirmBreakthroughGate() {
    if (!run.value?.setpiece?.breakthroughPending) return
    let next: PlayRunState = {
      ...run.value,
      setpiece: { ...run.value.setpiece, breakthroughPending: undefined }
    }
    const gateId = next.chapter?.pendingGateId
    if (gateId) {
      next = openSegmentGate(next, gateId, 'pass')
    } else if (next.runMode === 'chapter') {
      next = { ...next, lifeStage: 'uni' }
    } else {
      next = confirmBreakthrough(run.value)
    }
    next = resumeAfterSetpiece(next)
    persist(refreshRunInbox(next))
  }

  function confirmSectChoice(sectId: string) {
    if (!run.value?.setpiece?.sectChoicePending) return
    let next = applySectChoice(run.value, sectId)
    next = {
      ...next,
      profileTags: next.profileTags.includes('sect-chosen')
        ? next.profileTags
        : [...next.profileTags, 'sect-chosen']
    }
    const gateId = next.chapter?.pendingGateId
    if (gateId) {
      next = openSegmentGate(next, gateId, 'pass', { metRequires: true })
    }
    next = resumeAfterSetpiece(next)
    persist(refreshRunInbox(next))
  }

  function dismissUniFoundationGate() {
    if (!run.value?.setpiece?.uniFoundationGatePending) return
    let next: PlayRunState = {
      ...run.value,
      setpiece: { ...run.value.setpiece, uniFoundationGatePending: undefined, uniFoundationGateResolved: true },
      profileTags: run.value.profileTags.includes('uni-foundation')
        ? run.value.profileTags
        : [...run.value.profileTags, 'uni-foundation']
    }
    const gateId = next.chapter?.pendingGateId
    if (gateId) {
      next = openSegmentGate(next, gateId, 'pass')
    }
    next = resumeAfterSetpiece(next)
    persist(refreshRunInbox(next))
  }

  function chooseTrack(trackId: string) {
    if (!run.value || !needsTrackChoice(run.value)) return
    const track = trackId as import('~/types/chapter').EmploymentTrack
    persist(refreshRunInbox(applyTrackChoice(run.value, track)))
  }

  function chooseJob(jobId: string) {
    if (!run.value) return
    let next = applyJobChoice(run.value, jobId)
    next = {
      ...next,
      profileTags: next.profileTags.includes('employment-track')
        ? next.profileTags
        : [...next.profileTags, 'employment-track']
    }
    const gateId = next.chapter?.pendingGateId
    if (gateId) {
      next = openSegmentGate(next, gateId, 'pass', { metRequires: true })
    }
    next = resumeAfterSetpiece(next)
    persist(refreshRunInbox(next))
  }

  function acceptBodyMortgage(partId: BodyPartId) {
    if (!run.value?.setpiece?.bodyMortgagePending) return
    persist(refreshRunInbox(applyBodyMortgageToRun(run.value, partId)))
  }

  function refuseBodyMortgage() {
    if (!run.value?.setpiece?.bodyMortgagePending) return
    persist(refreshRunInbox(dismissBodyMortgage(run.value)))
  }

  function dismissSettlement() {
    settlementFlash.value = null
  }

  function setStatusFlash(message: string | null) {
    if (statusFlashTimer) clearTimeout(statusFlashTimer)
    statusFlash.value = message
    if (message) {
      statusFlashTimer = setTimeout(() => {
        statusFlash.value = null
      }, 2000)
    }
  }

  function respondMandate(responseId: string) {
    if (!run.value) return
    const before = run.value
    const next = respondMandateAndMaybeFinalize(run.value, responseId)
    const cashDelta = (next.econ?.cash ?? 0) - (before.econ?.cash ?? 0)
    const delDelta = (next.econ?.delinquency ?? 0) - (before.econ?.delinquency ?? 0)
    if (cashDelta !== 0) {
      setStatusFlash(`现金 ${cashDelta > 0 ? '+' : ''}${cashDelta.toLocaleString()} 灵石`)
    } else if (delDelta !== 0) {
      setStatusFlash(`逾期档位 ${delDelta > 0 ? '+' : ''}${delDelta}`)
    } else {
      setStatusFlash('来文已登记')
    }
    if (
      (next.mandate?.pendingDeliveryIds.length ?? 0) === 0 &&
      weekEndFinalizePending(next)
    ) {
      settlementFlash.value = buildWeekSettlementSummary(next)
    }
    persist(refreshRunInbox(next))
  }

  function dismissFateUpdate() {
    if (!run.value?.setpiece?.fateUpdatePending) return
    const pending = run.value.setpiece.fateUpdatePending
    const setpiece = { ...run.value.setpiece }
    delete setpiece.fateUpdatePending
    persist({ ...run.value, setpiece })
    traumaStampFlash.value = { fate: pending.to, visible: true }
  }

  function activateBloodDrawGrit() {
    if (!run.value || run.value.primaryFate !== 'mortgaged') return
    persist(refreshRunInbox(applyBloodDrawGrit(run.value)))
    setStatusFlash('抽血换现已登记')
  }

  function confirmContractFinale(passed: boolean) {
    if (!run.value?.chapter?.pendingGateId) return
    const next = openSegmentGate(
      run.value,
      run.value.chapter.pendingGateId,
      passed ? 'pass' : 'fail'
    )
    persist(refreshRunInbox(next))
  }

  return {
    run,
    playScreen,
    debtVm,
    chapterHud,
    recentLogs,
    weekBlocked,
    examBossPending,
    breakthroughPending,
    sectChoicePending,
    uniFoundationGatePending,
    bodyMortgagePending,
    jobChoicePending,
    trackChoicePending,
    mandateInboxPending,
    defaultWeekPlan: DEFAULT_WEEK_PLAN,
    weekPlan,
    weekSegmentActions,
    weekActionFlags,
    weekRepayTiers,
    weekPsyNotice,
    hasLastWeekPlan,
    weekRepeatHint,
    settlementFlash,
    statusFlash,
    traumaStampFlash,
    scheduleMode,
    layoutToken,
    statusBarFields,
    fateUpdatePending,
    fateUpdateOverlay,
    primaryFate,
    showDualLedgerLabels,
    delegationPanelStrings,
    dualLedgerBillPreview,
    maintenanceBillPreview,
    delegationOptions,
    weekPressureEmphasis,
    mortgagedIntegrityCap,
    showBloodDraw,
    dismissSettlement,
    initFromRun,
    confirmWeekPlan,
    repeatLastWeekPlan,
    dismissFateUpdate,
    dismissTraumaStamp,
    activateBloodDrawGrit,
    dismissExamBossScreen,
    confirmBreakthroughGate,
    confirmSectChoice,
    dismissUniFoundationGate,
    chooseTrack,
    chooseJob,
    acceptBodyMortgage,
    refuseBodyMortgage,
    respondMandate,
    confirmContractFinale
  }
}
