import type { StartConfig, SaveSlotId } from '~/types/game'
import type { PlayRunState, RunMode } from '~/types/play'
import { buildInboxPlaceholders } from './buildInboxPlaceholders'

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
  return {
    schemaVersion: 4,
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
    logs: [],
    profileTags: [],
    inbox: buildInboxPlaceholders(null)
  }
}

export function touchPlayRun(run: PlayRunState): PlayRunState {
  return { ...run, updatedAt: new Date().toISOString() }
}
