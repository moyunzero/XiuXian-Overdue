import type { StartConfig } from '~/types/game'
import type { PlayRunState } from '~/types/play'
import type { EmploymentTrack, WeekPlan } from '~/types/chapter'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import { applyFamilyOutcomeEffects } from '~/logic/act1/familyLedger'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import { settleAct1IntoPlayRun } from '~/logic/act1/act1PlayTransition'
import {
  initChapter,
  tickChapterWeek,
  DEFAULT_WEEK_PLAN,
  markBeatResolvedForWeek
} from '~/logic/play/chapterWeekFlow'
import { dismissExamBoss } from '~/logic/play/examBoss'
import { dismissBodyMortgage } from '~/logic/play/bodyMortgage'
import { openSegmentGate, chapterSetpieceBlocksWeek } from '~/logic/play/segmentGate'
import { applySectChoice } from '~/logic/play/uniFlow'
import { applyJobChoice, applyTrackChoice, buildJobChoicePending, needsJobChoice, needsTrackChoice } from '~/logic/play/workFlow'
import { SECT_CHOICES } from '~/logic/play/sectChoices'
import { defaultFateFieldsForRun } from '~/logic/play/playRunFateDefaults'
import {
  drainPendingMandates,
  mandateQueueBlocksWeekAdvance
} from '~/logic/play/mandateDelivery'
import { finalizeWeek, weekEndFinalizePending } from '~/logic/play/scheduleMandateFlow'
import { advanceWeek, ensureFateRunMode } from '~/logic/play/milestoneWeekFlow'
import { advanceScheduleWeek } from '~/logic/play/scheduleMandateFlow'
import { planFromScheduleMode } from '~/logic/play/weekPlanTiles'
import type { DelegationJobId, MaintenanceTier } from '~/types/chapter'

const DEFAULT_START: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 20_000,
  startingCity: '嵩阳市'
}

/** Act1 结算后进入 Ch0 第 1 周 */
export function settledChapterRun(
  start: StartConfig = DEFAULT_START,
  familyOutcome: 'left' | 'cutoff' = 'left'
): PlayRunState {
  const settledAct1 = applyFamilyOutcomeEffects(createInitialAct1State(start), familyOutcome)
  const run = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
  const hsRun = settleAct1IntoPlayRun(run, {
    startConfig: start,
    act1: settledAct1,
    metaUnlocks: [],
    permanentModifiers: {},
    settled: true
  })
  return initChapter(hsRun)
}

/** Ch0 第 1 周 + fate_run 模式（fateTransition spec 用） */
export function settledFateRun(
  start: StartConfig = DEFAULT_START,
  familyOutcome: 'left' | 'cutoff' = 'left'
): PlayRunState {
  const chapter = settledChapterRun(start, familyOutcome)
  const fate = defaultFateFieldsForRun(chapter)
  return {
    ...chapter,
    runMode: 'fate_run',
    ...fate
  }
}

function confirmBreakthroughChapter(run: PlayRunState): PlayRunState {
  if (!run.setpiece?.breakthroughPending) return run
  let next: PlayRunState = {
    ...run,
    setpiece: { ...run.setpiece, breakthroughPending: undefined }
  }
  const gateId = next.chapter?.pendingGateId
  if (gateId) {
    next = openSegmentGate(next, gateId, 'pass')
  } else {
    next = { ...next, lifeStage: 'uni' }
  }
  return markBeatResolvedForWeek(next)
}

function dismissUniFoundationGate(run: PlayRunState): PlayRunState {
  if (!run.setpiece?.uniFoundationGatePending) return run
  let next: PlayRunState = {
    ...run,
    setpiece: { ...run.setpiece, uniFoundationGatePending: undefined, uniFoundationGateResolved: true },
    profileTags: run.profileTags.includes('uni-foundation')
      ? run.profileTags
      : [...run.profileTags, 'uni-foundation']
  }
  const gateId = next.chapter?.pendingGateId
  if (gateId) {
    next = openSegmentGate(next, gateId, 'pass')
  }
  return markBeatResolvedForWeek(next)
}

function confirmSectChoiceFirst(run: PlayRunState): PlayRunState {
  if (!run.setpiece?.sectChoicePending) return run
  const sectId = SECT_CHOICES[0]?.id ?? 'sect-alchemy'
  let next = applySectChoice(run, sectId)
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
  return markBeatResolvedForWeek(next)
}

function chooseFirstTrack(run: PlayRunState, track: EmploymentTrack = 'company'): PlayRunState {
  if (!needsTrackChoice(run)) return run
  return applyTrackChoice(run, track)
}

function chooseFirstJob(run: PlayRunState): PlayRunState {
  if (!needsJobChoice(run)) return run
  const firstId = buildJobChoicePending(run).options[0]?.id
  if (!firstId) return run
  let next = applyJobChoice(run, firstId)
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
  return markBeatResolvedForWeek(next)
}

function dismissExam(run: PlayRunState): PlayRunState {
  if (!run.setpiece?.examBossPending) return run
  let next = dismissExamBoss(run)
  next = markBeatResolvedForWeek(next)
  if (next.chapter?.pendingGateId) {
    next = openSegmentGate(next, next.chapter.pendingGateId, 'pass')
  }
  return next
}

export function finalizeAfterMandateDrain(run: PlayRunState): PlayRunState {
  let next = drainPendingMandates(run)
  if (
    (next.mandate?.pendingDeliveryIds.length ?? 0) === 0 &&
    weekEndFinalizePending(next)
  ) {
    next = finalizeWeek(next)
  }
  return next
}

/** fate_run 自然周推进至 targetWeek（milestoneWeekFlow + setpiece/mandate 排水） */
export function advanceFateToWeek(run: PlayRunState, targetWeek: number): PlayRunState {
  let next = ensureFateRunMode(run)
  let steps = 0
  while ((next.chapter?.chapterWeekIndex ?? 0) < targetWeek && steps < 800) {
    steps += 1
    if (next.runStatus === 'collapsed' || next.runStatus === 'archived') break
    next = dismissCurrentSetpiece(next)
    const { run: after, blocked } = advanceWeek(next, DEFAULT_WEEK_PLAN)
    if (blocked) {
      next = dismissCurrentSetpiece(after)
    } else {
      next = after
      if ((next.mandate?.pendingDeliveryIds.length ?? 0) > 0) {
        next = finalizeAfterMandateDrain(next)
      }
    }
  }
  return next
}

/** 自动处理当前阻塞 setpiece / 择轨 / 择岗 / W40 终局闸门 */
export function dismissCurrentSetpiece(
  run: PlayRunState,
  options?: { employmentTrack?: EmploymentTrack }
): PlayRunState {
  if (run.setpiece?.fateUpdatePending) {
    const setpiece = { ...run.setpiece }
    delete setpiece.fateUpdatePending
    return { ...run, setpiece }
  }
  if (run.setpiece?.bodyMortgagePending) return dismissBodyMortgage(run)
  if (run.setpiece?.examBossPending) return dismissExam(run)
  if (run.setpiece?.breakthroughPending) return confirmBreakthroughChapter(run)
  if (run.setpiece?.sectChoicePending) return confirmSectChoiceFirst(run)
  if (run.setpiece?.uniFoundationGatePending) return dismissUniFoundationGate(run)
  if (needsTrackChoice(run)) return chooseFirstTrack(run, options?.employmentTrack ?? 'company')
  if (needsJobChoice(run)) return chooseFirstJob(run)
  if (run.chapter?.pendingGateId === 'gate-w40-finale') {
    if (run.runMode !== 'chapter') return run
    return openSegmentGate(run, 'gate-w40-finale', 'pass')
  }
  if ((run.mandate?.pendingDeliveryIds.length ?? 0) > 0) {
    return drainPendingMandates(run)
  }
  return run
}

/** 推进到目标周（含月考/关口 dismiss）；目标周为 tick 后的 chapterWeekIndex */
export function advanceChapterToWeek(
  run: PlayRunState,
  targetWeek: number,
  plan: WeekPlan = DEFAULT_WEEK_PLAN,
  maxSteps = 500,
  employmentTrack: EmploymentTrack = 'company'
): PlayRunState {
  let next = run
  let steps = 0

    while ((next.chapter?.chapterWeekIndex ?? 0) < targetWeek && steps < maxSteps) {
    steps += 1

    if (next.runStatus === 'collapsed') break

    if (chapterSetpieceBlocksWeek(next) || needsTrackChoice(next) || needsJobChoice(next)) {
      next = dismissCurrentSetpiece(next, { employmentTrack })
      continue
    }

    if (
      mandateQueueBlocksWeekAdvance(next) ||
      (next.mandate?.pendingDeliveryIds.length ?? 0) > 0
    ) {
      next = drainPendingMandates(next)
      continue
    }

    if (next.chapter?.pendingGateId === 'gate-w40-finale') {
      if (next.runMode !== 'chapter') break
    }

    const { run: afterTick, blocked } = tickChapterWeek(next, plan)
    next = afterTick
    if (blocked) {
      next = dismissCurrentSetpiece(next, { employmentTrack })
    }
  }

  return drainPendingMandates(next)
}

function dismissFateUpdateIfPending(run: PlayRunState): PlayRunState {
  if (!run.setpiece?.fateUpdatePending) return run
  return {
    ...run,
    setpiece: { ...run.setpiece, fateUpdatePending: undefined }
  }
}

export function buildHeadJarWeekPlan(
  tier: MaintenanceTier = 'austerity',
  job: DelegationJobId = 'yang_patrol'
): WeekPlan {
  return planFromScheduleMode({ primaryFate: 'head_jar' }, { maintenanceTier: tier, delegationJob: job })
}

/** Phase 6：ghost_bound 链来文 id（与 ch0-routine.json 对齐） */
export const GHOST_SUMMON_ID = 'ch0-ghost-bound-summon'
export const GHOST_BIND_ID = 'ch0-ghost-bound-bind'

export function forceHeadJar(run: PlayRunState): PlayRunState {
  return { ...run, primaryFate: 'head_jar', runStatus: 'fated' }
}

export function injectGhostBoundChain(run: PlayRunState): PlayRunState {
  const delinquency = Math.max(2, run.econ?.delinquency ?? 0)
  const mandate = run.mandate ?? {
    numbness: 0,
    domestication: 0,
    pendingDeliveryIds: [],
    supplyCutStreak: 0
  }
  return {
    ...forceHeadJar(run),
    econ: run.econ ? { ...run.econ, delinquency } : run.econ,
    mandate: {
      ...mandate,
      pendingDeliveryIds: [GHOST_SUMMON_ID, GHOST_BIND_ID]
    }
  }
}

export function buildGhostBoundWeekPlan(
  tier: MaintenanceTier = 'austerity',
  job: DelegationJobId = 'yang_patrol'
): WeekPlan {
  return planFromScheduleMode({ primaryFate: 'ghost_bound' }, { maintenanceTier: tier, delegationJob: job })
}

export function simGhostBoundWeek(run: PlayRunState, plan: WeekPlan): PlayRunState {
  return simFateWeek(run, plan)
}

/** dismiss setpiece → advanceScheduleWeek → drain mandates → finalize when pending */
export function simFateWeek(run: PlayRunState, plan: WeekPlan): PlayRunState {
  let next = run
  const weekBefore = next.chapter?.chapterWeekIndex ?? 0

  for (let guard = 0; guard < 24; guard++) {
    next = dismissFateUpdateIfPending(dismissCurrentSetpiece(next))
    const { run: after, blocked } = advanceScheduleWeek(next, plan)
    next = blocked ? after : finalizeAfterMandateDrain(after)
    if ((next.chapter?.chapterWeekIndex ?? 0) > weekBefore) {
      return next
    }
  }

  return next
}
