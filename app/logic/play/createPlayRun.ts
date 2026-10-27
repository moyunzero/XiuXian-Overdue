import type { StartConfig, SaveSlotId } from '~/types/game'
import type { PlayRunState, RunMode } from '~/types/play'
import { buildInboxPlaceholders } from './buildInboxPlaceholders'
import { defaultFateFieldsForRun } from './playRunFateDefaults'
import { applyStartBundlePassive } from './startBundleRegistry'

export type CreatePlayRunOptions = {
  runMode?: RunMode
  /** Phase 5: optional meta start bundle (D-108) */
  startBundleId?: string | null
}

export function createRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function createPlayRunFromStartConfig(
  start: StartConfig,
  slotId: SaveSlotId,
  options?: CreatePlayRunOptions
): PlayRunState {
  const now = new Date().toISOString()
  const base: PlayRunState = {
    schemaVersion: 5,
    runId: createRunId(),
    runMode: options?.runMode ?? 'chapter',
    createdAt: now,
    updatedAt: now,
    lifeStage: 'pre',
    chapterIndex: 0,
    realmTier: 'mortal',
    realmIndex: 0,
    start,
    slotId,
    runStatus: 'active',
    primaryFate: 'human',
    institutionalTags: [],
    stageId: '',
    logs: [],
    profileTags: [],
    inbox: buildInboxPlaceholders(null)
  }
  const fate = defaultFateFieldsForRun(base)
  let run: PlayRunState = { ...base, ...fate, metaProgressId: 'default' }
  run = applyStartBundlePassive(run, options?.startBundleId)
  return run
}

export function touchPlayRun(run: PlayRunState): PlayRunState {
  return { ...run, updatedAt: new Date().toISOString() }
}
