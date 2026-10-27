import fs from 'node:fs'
import path from 'node:path'
import type { KunxuSaveV4, PlayRunState } from '~/types/play'
import {
  DEFAULT_WEEK_PLAN,
  markBeatResolvedForWeek
} from '~/logic/play/chapterWeekFlow'
import {
  advanceChapterToWeek,
  dismissCurrentSetpiece,
  finalizeAfterMandateDrain,
  settledChapterRun,
  settledFateRun
} from '~/logic/play/chapterTestHelpers'
import { advanceWeek, ensureFateRunMode } from '~/logic/play/milestoneWeekFlow'
import {
  DEFAULT_PLAY_META,
  PLAY_SAVE_SCHEMA_VERSION,
  serializeV4Save
} from '~/composables/usePlayStorage.helpers'

export type Phase3UatFixtureExport = {
  id: string
  label: string
  path: '/play'
  waitSelector: string
  saveV5: KunxuSaveV4
  expectRunMode?: 'fate_run' | 'chapter'
  expectWeekIndex?: number
  expectMandatePending?: number
}

function saveContainerFromRun(run: PlayRunState): KunxuSaveV4 {
  return {
    saveSchemaVersion: PLAY_SAVE_SCHEMA_VERSION,
    activeRunId: run.runId,
    runs: { [run.runId]: run },
    meta: { ...DEFAULT_PLAY_META }
  }
}

function advanceFateRunToWeek(run: PlayRunState, targetWeek: number): PlayRunState {
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

function normalizeRunForUiSeed(run: PlayRunState): PlayRunState {
  if (!run.chapter) return run
  let chapter = run.chapter
  if (chapter.pendingGateId === 'gate-w29-track' && chapter.chapterWeekIndex > 29) {
    chapter = { ...chapter, pendingGateId: undefined }
  }
  if (chapter.pendingGateId === 'gate-w40-finale' && run.runMode === 'fate_run') {
    chapter = { ...chapter, pendingGateId: undefined }
  }
  return chapter === run.chapter ? run : { ...run, chapter }
}

function scheduleReadyWeek8(): PlayRunState {
  return normalizeRunForUiSeed(advanceFateRunToWeek(settledFateRun(), 8))
}

function mandateInboxWeek6(): PlayRunState {
  let run = advanceFateRunToWeek(settledFateRun(), 6)
  run = {
    ...run,
    mandate: {
      numbness: 0,
      domestication: 0,
      pendingDeliveryIds: ['ch0-debt-reminder'],
      supplyCutStreak: 0
    }
  }
  return normalizeRunForUiSeed(run)
}

function preAdvanceWeek6Seed17(): PlayRunState {
  let run = settledFateRun()
  run = { ...run, seed: 17, chapter: { ...run.chapter!, chapterWeekIndex: 6 } }
  run = markBeatResolvedForWeek(run, 6)
  return normalizeRunForUiSeed(run)
}

function queueBlockedWeek6(): PlayRunState {
  let run = advanceFateRunToWeek(settledFateRun(), 6)
  run = {
    ...run,
    mandate: {
      numbness: 0,
      domestication: 0,
      pendingDeliveryIds: ['ch0-debt-reminder', 'ch0-focus-audit', 'ch0-kpi-nudge'],
      supplyCutStreak: 0
    }
  }
  return normalizeRunForUiSeed(run)
}

export function buildPhase3UatFixtures(): Phase3UatFixtureExport[] {
  const chapterMid = normalizeRunForUiSeed(advanceChapterToWeek(settledChapterRun(), 8))

  return [
    {
      id: 'phase3-schedule-week8',
      label: 'Test1 · 四格周排程 + 开本周',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(scheduleReadyWeek8()),
      expectRunMode: 'fate_run',
      expectWeekIndex: 8
    },
    {
      id: 'phase3-mandate-inbox',
      label: 'Test3 · 来文叠层 + 主区 dim',
      path: '/play',
      waitSelector: '.MandateInbox',
      saveV5: saveContainerFromRun(mandateInboxWeek6()),
      expectRunMode: 'fate_run',
      expectWeekIndex: 6,
      expectMandatePending: 1
    },
    {
      id: 'phase3-pre-advance-week6',
      label: 'Test4 · 开本周 → 来文链 → 结算条',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(preAdvanceWeek6Seed17()),
      expectRunMode: 'fate_run',
      expectWeekIndex: 6
    },
    {
      id: 'phase3-queue-blocked',
      label: 'Test5 · 来文队列满 → 开本周禁用',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(queueBlockedWeek6()),
      expectRunMode: 'fate_run',
      expectWeekIndex: 6,
      expectMandatePending: 3
    },
    {
      id: 'phase3-chapter-mid',
      label: 'Test6 · chapter 读档 coerce',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(chapterMid),
      expectRunMode: 'fate_run'
    }
  ]
}

export function writePhase3UatFixturesToDisk(outDir: string): string[] {
  fs.mkdirSync(outDir, { recursive: true })
  const fixtures = buildPhase3UatFixtures()
  return fixtures.map((fixture) => {
    const filePath = path.join(outDir, `${fixture.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2), 'utf8')
    return filePath
  })
}

export function serializeRunForLocalStorage(run: PlayRunState): string {
  return serializeV4Save(saveContainerFromRun(run))
}
