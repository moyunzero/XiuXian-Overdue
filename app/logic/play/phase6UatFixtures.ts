import fs from 'node:fs'
import path from 'node:path'
import type { KunxuSaveV4, PlayRunState } from '~/types/play'
import {
  DEFAULT_PLAY_META,
  PLAY_SAVE_SCHEMA_VERSION
} from '~/composables/usePlayStorage.helpers'
import { markBeatResolvedForWeek } from '~/logic/play/chapterWeekFlow'
import {
  buildGhostBoundWeekPlan,
  injectGhostBoundChain,
  simGhostBoundWeek
} from '~/logic/play/chapterTestHelpers'
import { settledHeadJarWeek8 as headJarWeek8 } from '~/logic/play/phase4UatFixtures'
import {
  respondMandateAndMaybeFinalize,
  buildWeekSettlementSummary
} from '~/logic/play/scheduleMandateFlow'

export type Phase6UatFixtureExport = {
  id: string
  label: string
  path: '/play'
  waitSelector: string
  saveV5: KunxuSaveV4
  expectRunMode?: 'fate_run' | 'chapter'
  expectPrimaryFate?: string
  expectSettlementHeadline?: string
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

/** head_jar + 阴司召令队列（双来文待回应） */
export function ghostSummonPending(): PlayRunState {
  return normalizeRunForUiSeed(injectGhostBoundChain(headJarWeek8()))
}

/** accept-bind 后 fateUpdatePending overlay */
export function ghostBoundTransitionOverlay(): PlayRunState {
  let run = ghostSummonPending()
  run = respondMandateAndMaybeFinalize(run, 'ack-summons')
  run = respondMandateAndMaybeFinalize(run, 'accept-bind')
  return normalizeRunForUiSeed(run)
}

/** overlay 已签收，delegation_two 可操作 */
export function ghostBoundPlayable(): PlayRunState {
  let run = ghostBoundTransitionOverlay()
  if (run.setpiece?.fateUpdatePending) {
    const setpiece = { ...run.setpiece }
    delete setpiece.fateUpdatePending
    run = { ...run, setpiece }
  }
  return markBeatResolvedForWeek(normalizeRunForUiSeed(run))
}

/** 开一周后双账流水与 settlement VM 可验 */
export function ghostBoundAfterWeek(): PlayRunState {
  let run = ghostBoundPlayable()
  run = simGhostBoundWeek(run, buildGhostBoundWeekPlan())
  return normalizeRunForUiSeed(run)
}

export function buildPhase6UatFixtures(): Phase6UatFixtureExport[] {
  const afterWeek = ghostBoundAfterWeek()
  const settlement = buildWeekSettlementSummary(afterWeek)

  return [
    {
      id: 'phase6-ghost-summon-pending',
      label: 'Phase6 · ghost summon mandate inbox',
      path: '/play',
      waitSelector: '.MandateInbox',
      saveV5: saveContainerFromRun(ghostSummonPending()),
      expectRunMode: 'fate_run',
      expectPrimaryFate: 'head_jar'
    },
    {
      id: 'phase6-ghost-bound-overlay',
      label: 'Phase6 · ghost_bound fate-update overlay',
      path: '/play',
      waitSelector: '.FateUpdateOverlay',
      saveV5: saveContainerFromRun(ghostBoundTransitionOverlay()),
      expectRunMode: 'fate_run',
      expectPrimaryFate: 'ghost_bound'
    },
    {
      id: 'phase6-ghost-bound-playable',
      label: 'Phase6 · ghost_bound DelegationPanel',
      path: '/play',
      waitSelector: '.DelegationPanel',
      saveV5: saveContainerFromRun(ghostBoundPlayable()),
      expectRunMode: 'fate_run',
      expectPrimaryFate: 'ghost_bound'
    },
    {
      id: 'phase6-ghost-bound-after-week',
      label: 'Phase6 · ghost_bound after week dual ledger',
      path: '/play',
      waitSelector: '.DelegationPanel',
      saveV5: saveContainerFromRun(afterWeek),
      expectRunMode: 'fate_run',
      expectPrimaryFate: 'ghost_bound',
      expectSettlementHeadline: settlement.headline
    }
  ]
}

export function writePhase6UatFixturesToDisk(outDir: string): string[] {
  fs.mkdirSync(outDir, { recursive: true })
  const fixtures = buildPhase6UatFixtures()
  return fixtures.map((fixture) => {
    const filePath = path.join(outDir, `${fixture.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2), 'utf8')
    return filePath
  })
}
