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
  settledChapterRun,
  settledFateRun
} from '~/logic/play/chapterTestHelpers'
import { CHAPTER_BODY_COLLAPSE_THRESHOLD } from '~/logic/play/chapterCollapse'
import { advanceWeek, ensureFateRunMode } from '~/logic/play/milestoneWeekFlow'
import { STAGE_M2_HS } from '~/logic/play/stageDefs'
import {
  DEFAULT_PLAY_META,
  PLAY_SAVE_SCHEMA_VERSION,
  serializeV4Save
} from '~/composables/usePlayStorage.helpers'

export type Phase2UatFixtureExport = {
  id: string
  label: string
  path: '/play'
  waitSelector: string
  saveV5: KunxuSaveV4
  /** 种子后 localStorage 中 runMode 期望（hydrate 后） */
  expectRunMode?: 'fate_run' | 'chapter'
  expectWeekIndex?: number
  expectStageId?: string
  expectRunStatus?: string
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
    next = blocked ? dismissCurrentSetpiece(after) : after
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

function fateRunAtWeek(week: number): PlayRunState {
  return advanceFateRunToWeek(settledFateRun(), week)
}

function fateRunWeek40ReadyForUi(): PlayRunState {
  let run = normalizeRunForUiSeed(fateRunAtWeek(40))
  run = markBeatResolvedForWeek(run, 40)
  return run
}

function fateRunWeek41WithM2(): PlayRunState {
  let run = advanceFateRunToWeek(settledFateRun(), 40)
  run = dismissCurrentSetpiece(run)
  const to41 = advanceWeek(run, DEFAULT_WEEK_PLAN)
  run = to41.run
  if (run.stageId !== STAGE_M2_HS.id) {
    throw new Error(`expected M2 after W41 advance, got ${run.stageId}`)
  }
  return run
}

export function buildPhase2UatFixtures(): Phase2UatFixtureExport[] {
  const chapterMid = normalizeRunForUiSeed(advanceChapterToWeek(settledChapterRun(), 12))
  const fateW40 = fateRunWeek40ReadyForUi()
  const bodyTrigger = normalizeRunForUiSeed(
    (() => {
      let run = fateRunAtWeek(8)
      run = markBeatResolvedForWeek(run)
      run.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
      return run
    })()
  )
  const fateW41M2 = normalizeRunForUiSeed(fateRunWeek41WithM2())

  return [
    {
      id: 'phase2-chapter-mid-run',
      label: 'Test1 · chapter 第12周 → coerce fate_run',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(chapterMid),
      expectRunMode: 'fate_run'
    },
    {
      id: 'phase2-fate-week40',
      label: 'Test2 · fate_run 第40周 → UI 确认进41',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(fateW40),
      expectWeekIndex: 40,
      expectRunMode: 'fate_run'
    },
    {
      id: 'phase2-fate-body-trigger',
      label: 'Test3 · bodyIntegrity 触线 → fated',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(bodyTrigger),
      expectRunMode: 'fate_run'
    },
    {
      id: 'phase2-fate-week41-m2',
      label: 'Test4 · 第41周 M2 学籍段',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(fateW41M2),
      expectWeekIndex: 41,
      expectStageId: STAGE_M2_HS.id,
      expectRunMode: 'fate_run'
    }
  ]
}

export function writePhase2UatFixturesToDisk(outDir: string): string[] {
  fs.mkdirSync(outDir, { recursive: true })
  const fixtures = buildPhase2UatFixtures()
  return fixtures.map((fixture) => {
    const filePath = path.join(outDir, `${fixture.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2), 'utf8')
    return filePath
  })
}

export function serializeRunForLocalStorage(run: PlayRunState): string {
  return serializeV4Save(saveContainerFromRun(run))
}
