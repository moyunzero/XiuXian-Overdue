import fs from 'node:fs'
import path from 'node:path'
import type { KunxuSaveV4, PlayRunState } from '~/types/play'
import {
  advanceFateToWeek,
  dismissCurrentSetpiece,
  finalizeAfterMandateDrain,
  settledFateRun
} from '~/logic/play/chapterTestHelpers'
import { markBeatResolvedForWeek } from '~/logic/play/chapterWeekFlow'
import { fateUpdateOverlayDemo } from '~/logic/play/phase4UatFixtures'
import { resolveOverlayCopy } from '~/logic/play/fateCatalog'
import { advanceWeek } from '~/logic/play/milestoneWeekFlow'
import { DEFAULT_WEEK_PLAN } from '~/logic/play/chapterWeekFlow'
import {
  DEFAULT_PLAY_META,
  PLAY_SAVE_SCHEMA_VERSION
} from '~/composables/usePlayStorage.helpers'

export type Phase7UatFixtureExport = {
  id: string
  label: string
  path: '/play'
  waitSelector: string
  saveV5: KunxuSaveV4
  expectRunMode?: 'fate_run'
  expectStageId?: string
  expectPrimaryFate?: string
  expectOverlayBody?: string
  expectWeekIndex?: number
}

function saveContainerFromRun(run: PlayRunState): KunxuSaveV4 {
  return {
    saveSchemaVersion: PLAY_SAVE_SCHEMA_VERSION,
    activeRunId: run.runId,
    runs: { [run.runId]: run },
    meta: { ...DEFAULT_PLAY_META }
  }
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

function m1Week8(): PlayRunState {
  let run = advanceFateToWeek(settledFateRun(), 8)
  run.stageId = 'stage-m1-contract'
  run = markBeatResolvedForWeek(run, 8)
  return normalizeRunForUiSeed(run)
}

function m1MandateInbox(): PlayRunState {
  let run = m1Week8()
  const pending = run.mandate?.pendingDeliveryIds ?? []
  if (!pending.length) {
    run = {
      ...run,
      mandate: {
        ...run.mandate,
        pendingDeliveryIds: ['ch0-debt-reminder'],
        respondedDeliveryIds: run.mandate?.respondedDeliveryIds ?? []
      }
    }
  }
  return run
}

function w40Continuity(): PlayRunState {
  let run = advanceFateToWeek(settledFateRun(), 40)
  run = markBeatResolvedForWeek(run, 40)
  return normalizeRunForUiSeed(run)
}

function w41M2(): PlayRunState {
  let run = advanceFateToWeek(settledFateRun(), 40)
  run = dismissCurrentSetpiece(run)
  const to41 = advanceWeek(run, DEFAULT_WEEK_PLAN)
  run = finalizeAfterMandateDrain(to41.run)
  if (run.stageId !== 'stage-m2-hs') {
    run = { ...run, stageId: 'stage-m2-hs' }
  }
  return normalizeRunForUiSeed(run)
}

export function buildPhase7UatFixtures(): Phase7UatFixtureExport[] {
  const overlayRun = fateUpdateOverlayDemo()
  const overlayBody =
    resolveOverlayCopy('body_mortgage', 'mortgaged') ??
    '抵押登记完成——制度将你编入抵押运行档。'

  return [
    {
      id: 'phase7-m1-week8-dashboard',
      label: 'Test1 · M1 第8周四格排程',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(m1Week8()),
      expectRunMode: 'fate_run',
      expectStageId: 'stage-m1-contract',
      expectWeekIndex: 8
    },
    {
      id: 'phase7-m1-mandate-inbox',
      label: 'Test2 · M1 来文池（stage manifest）',
      path: '/play',
      waitSelector: '.MandateInbox',
      saveV5: saveContainerFromRun(m1MandateInbox()),
      expectRunMode: 'fate_run',
      expectStageId: 'stage-m1-contract'
    },
    {
      id: 'phase7-fate-overlay-catalog',
      label: 'Test3 · 灵籍 overlay（catalog copy）',
      path: '/play',
      waitSelector: '.FateUpdateOverlay',
      saveV5: saveContainerFromRun(overlayRun),
      expectRunMode: 'fate_run',
      expectPrimaryFate: 'mortgaged',
      expectOverlayBody: overlayBody
    },
    {
      id: 'phase7-w40-continuity',
      label: 'Test4 · W40 无终局闸门',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(w40Continuity()),
      expectRunMode: 'fate_run',
      expectStageId: 'stage-m1-contract',
      expectWeekIndex: 40
    },
    {
      id: 'phase7-w41-m2-stage',
      label: 'Test5 · W41 → M2 学籍段',
      path: '/play',
      waitSelector: '.WeekPlan',
      saveV5: saveContainerFromRun(w41M2()),
      expectRunMode: 'fate_run',
      expectStageId: 'stage-m2-hs',
      expectWeekIndex: 41
    }
  ]
}

export function writePhase7UatFixturesToDisk(outDir: string): string[] {
  fs.mkdirSync(outDir, { recursive: true })
  return buildPhase7UatFixtures().map((fixture) => {
    const filePath = path.join(outDir, `${fixture.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2), 'utf8')
    return filePath
  })
}
