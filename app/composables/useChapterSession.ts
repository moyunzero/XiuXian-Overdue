import { computed, ref, watch } from 'vue'
import type { BodyPartId, PlayRunState } from '~/types/play'
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
import { advanceWeek, ensureFateRunMode } from '~/logic/play/milestoneWeekFlow'
import { dismissExamBoss, hasExamBossPending } from '~/logic/play/examBoss'
import { confirmBreakthrough } from '~/logic/play/breakthroughFlow'
import { applySectChoice } from '~/logic/play/uniFlow'
import { applyJobChoice, applyTrackChoice, buildJobChoicePending, buildTrackChoicePending, needsJobChoice, needsTrackChoice } from '~/logic/play/workFlow'
import { openSegmentGate } from '~/logic/play/segmentGate'
import { segmentForWeek, getChapterConfig } from '~/logic/play/chapterRegistry'
import { chapterPlayBlocked, resolvePlayScreen } from '~/logic/play/resolvePlayScreen'
import {
  applyBodyMortgageToRun,
  dismissBodyMortgage
} from '~/logic/play/bodyMortgage'
import {
  buildMandateInboxPending,
  respondToMandate
} from '~/logic/play/mandateDelivery'
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

  function syncWeekPlanFromRun(base: PlayRunState | null) {
    if (!base) {
      weekPlan.value = { ...DEFAULT_WEEK_PLAN }
      return
    }
    const repeated = resolveRepeatWeekPlan(base)
    weekPlan.value = clampWeekPlanToSegment(base, clampWeekPlanToPsy(base, { ...repeated }))
  }

  function initFromRun(base: PlayRunState) {
    let next = base.runMode === 'chapter' && base.chapter ? base : initChapter(base, DEFAULT_CHAPTER_ID)
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

  function persist(next: PlayRunState) {
    run.value = next
    playStorage.setActiveRun(next)
  }

  function confirmWeekPlan(plan?: WeekPlan) {
    if (!run.value || weekBlocked.value) return
    const psyClamped = clampWeekPlanToPsy(run.value, plan ?? weekPlan.value)
    const effective = clampWeekPlanToSegment(run.value, psyClamped)
    const { run: next, blocked } = advanceWeek(run.value, effective)
    weekPlan.value = { ...effective }
    persist(refreshRunInbox(next))
    return blocked
  }

  function repeatLastWeekPlan() {
    if (!run.value?.lastWeekPlan) return
    weekPlan.value = clampWeekPlanToSegment(run.value, { ...resolveRepeatWeekPlan(run.value) })
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

  function respondMandate(responseId: string) {
    if (!run.value) return
    persist(refreshRunInbox(respondToMandate(run.value, responseId)))
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
    initFromRun,
    confirmWeekPlan,
    repeatLastWeekPlan,
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
