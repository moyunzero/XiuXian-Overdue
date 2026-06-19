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
import { openSegmentGate, chapterSetpieceBlocksWeek } from '~/logic/play/segmentGate'
import { applySectChoice } from '~/logic/play/uniFlow'
import { applyJobChoice, applyTrackChoice, buildJobChoicePending, needsJobChoice, needsTrackChoice } from '~/logic/play/workFlow'
import { SECT_CHOICES } from '~/logic/play/sectChoices'
import { defaultFateFieldsForRun } from '~/logic/play/playRunFateDefaults'
import {
  drainPendingMandates,
  mandateQueueBlocksWeekAdvance
} from '~/logic/play/mandateDelivery'

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

/** 自动处理当前阻塞 setpiece / 择轨 / 择岗 / W40 终局闸门 */
export function dismissCurrentSetpiece(
  run: PlayRunState,
  options?: { employmentTrack?: EmploymentTrack }
): PlayRunState {
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
