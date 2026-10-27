import fs from 'node:fs'
import path from 'node:path'
import type { KunxuSaveV4, PlayRunState } from '~/types/play'
import { markBeatResolvedForWeek } from '~/logic/play/chapterWeekFlow'
import { CHAPTER_BODY_COLLAPSE_THRESHOLD } from '~/logic/play/chapterCollapse'
import {
  advanceChapterToWeek,
  dismissCurrentSetpiece,
  finalizeAfterMandateDrain,
  settledChapterRun,
  settledFateRun
} from '~/logic/play/chapterTestHelpers'
import { HEAD_JAR_INTEGRITY } from '~/logic/play/headJarWeekPlan'
import { advanceWeek, ensureFateRunMode } from '~/logic/play/milestoneWeekFlow'
import { DEFAULT_WEEK_PLAN } from '~/logic/play/chapterWeekFlow'
import {
  DEFAULT_PLAY_META,
  PLAY_SAVE_SCHEMA_VERSION,
  serializeV4Save
} from '~/composables/usePlayStorage.helpers'

export type Phase4UatFixtureExport = {
  id: string
  label: string
  path: '/play'
  waitSelector: string
  saveV5: KunxuSaveV4
  expectRunMode?: 'fate_run' | 'chapter'
  expectWeekIndex?: number
  expectPrimaryFate?: string
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

/** head_jar @ week 8 with delegation panel ready */
export function settledHeadJarWeek8(): PlayRunState {
  let run = advanceFateRunToWeek(settledFateRun(), 14)
  run = {
    ...run,
    primaryFate: 'head_jar',
    runStatus: 'fated',
    bodyIntegrity: HEAD_JAR_INTEGRITY - 0.01,
    setpiece: undefined
  }
  run = markBeatResolvedForWeek(run)
  return normalizeRunForUiSeed(run)
}

/** mortgaged mid-run with integrity cap pressure */
export function mortgagedMidRun(): PlayRunState {
  let run = advanceFateRunToWeek(settledFateRun(), 10)
  run = {
    ...run,
    primaryFate: 'mortgaged',
    runStatus: 'fated',
    bodyIntegrity: CHAPTER_BODY_COLLAPSE_THRESHOLD + 0.05,
    setpiece: undefined
  }
  run = markBeatResolvedForWeek(run)
  return normalizeRunForUiSeed(run)
}

/** fate-update overlay (灵籍更新) before week dashboard */
export function fateUpdateOverlayDemo(): PlayRunState {
  const run = mortgagedMidRun()
  return {
    ...run,
    setpiece: {
      fateUpdatePending: {
        from: 'human',
        to: 'mortgaged',
        trigger: 'body_mortgage'
      }
    }
  }
}

/** institutional tag demo runs for status bar stamps */
export function tagDemoRuns(): PlayRunState[] {
  const base = mortgagedMidRun()
  return [
    {
      ...base,
      institutionalTags: [{ id: 'supply_cut', appliedAtWeek: 8, source: 'maintenance_failure' }]
    },
    {
      ...base,
      institutionalTags: [{ id: 'credit_blacklist', appliedAtWeek: 6, source: 'debt_delinquency' }]
    }
  ]
}

export function buildPhase4UatFixtures(): Phase4UatFixtureExport[] {
  const chapterMid = normalizeRunForUiSeed(advanceChapterToWeek(settledChapterRun(), 8))

  return [
    {
      id: 'phase4-head-jar-week8',
      label: 'Phase4 · head_jar DelegationPanel',
      path: '/play',
      waitSelector: '.DelegationPanel',
      saveV5: saveContainerFromRun(settledHeadJarWeek8()),
      expectRunMode: 'fate_run',
      expectPrimaryFate: 'head_jar'
    },
    {
      id: 'phase4-mortgaged-mid',
      label: 'Phase4 · mortgaged four_tile + blood draw',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(mortgagedMidRun()),
      expectRunMode: 'fate_run',
      expectPrimaryFate: 'mortgaged'
    },
    {
      id: 'phase4-chapter-mid',
      label: 'Phase4 · human four_tile baseline',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(chapterMid),
      expectRunMode: 'fate_run',
      expectPrimaryFate: 'human'
    },
    {
      id: 'phase4-fate-update-overlay',
      label: 'Phase4 · fate-update overlay',
      path: '/play',
      waitSelector: '.FateUpdateOverlay',
      saveV5: saveContainerFromRun(fateUpdateOverlayDemo()),
      expectRunMode: 'fate_run',
      expectPrimaryFate: 'mortgaged'
    }
  ]
}

export function writePhase4UatFixturesToDisk(outDir: string): string[] {
  fs.mkdirSync(outDir, { recursive: true })
  const fixtures = buildPhase4UatFixtures()
  return fixtures.map((fixture) => {
    const filePath = path.join(outDir, `${fixture.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2), 'utf8')
    return filePath
  })
}

export function serializeRunForLocalStorage(run: PlayRunState): string {
  return serializeV4Save(saveContainerFromRun(run))
}
