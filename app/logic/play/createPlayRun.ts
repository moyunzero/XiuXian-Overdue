import type { StartConfig, SaveSlotId } from '~/types/game'
import type { PlayRunState, RunMode } from '~/types/play'
import { buildInboxPlaceholders } from './buildInboxPlaceholders'
import { defaultFateFieldsForRun } from './playRunFateDefaults'

export type CreatePlayRunOptions = {
  runMode?: RunMode
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
  return { ...base, ...fate }
}

export function touchPlayRun(run: PlayRunState): PlayRunState {
  return { ...run, updatedAt: new Date().toISOString() }
}
