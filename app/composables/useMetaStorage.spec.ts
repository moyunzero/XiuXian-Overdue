import { describe, it, expect } from 'vitest'
import {
  META_SAVE_KEY,
  META_SCHEMA_VERSION,
  emptyMetaSave,
  parseMetaSave,
  serializeMetaSave
} from './useMetaStorage.helpers'
import { readMetaContainer, writeMetaProgress } from './useMetaStorage'
import { BUNDLE_MORTGAGE_FILE_COPY } from '~/logic/play/metaProgress'
import { recordFateSeen as recordFateSeenLogic } from '~/logic/play/metaProgress'

describe('useMetaStorage.helpers', () => {
  it('META_SAVE_KEY and schema version constants', () => {
    expect(META_SAVE_KEY).toBe('kunxu_sim_meta_v1')
    expect(META_SCHEMA_VERSION).toBe(1)
  })

  it('parseMetaSave(null) returns emptyMetaSave with human in unlockedFatesSeen', () => {
    const container = parseMetaSave(null)
    expect(container.saveSchemaVersion).toBe(1)
    expect(container.metaProgressId).toBe('default')
    expect(container.progress.unlockedFatesSeen).toEqual(['human'])
  })

  it('parseMetaSave malformed JSON returns emptyMetaSave without throw', () => {
    const container = parseMetaSave('{not valid json')
    expect(container.progress.unlockedFatesSeen).toEqual(['human'])
    expect(container.progress.startBundles).toEqual([])
  })

  it('parseMetaSave version mismatch returns emptyMetaSave', () => {
    const raw = JSON.stringify({
      saveSchemaVersion: 99,
      metaProgressId: 'default',
      progress: { unlockedFatesSeen: ['head_jar'] }
    })
    const container = parseMetaSave(raw)
    expect(container.progress.unlockedFatesSeen).toEqual(['human'])
  })

  it('serializeMetaSave round-trip preserves startBundles after mortgaged', () => {
    let container = emptyMetaSave()
    container = {
      ...container,
      progress: recordFateSeenLogic(container.progress, 'mortgaged')
    }
    expect(container.progress.startBundles).toContain(BUNDLE_MORTGAGE_FILE_COPY)
    const back = parseMetaSave(serializeMetaSave(container))
    expect(back.progress.startBundles).toContain(BUNDLE_MORTGAGE_FILE_COPY)
    expect(back.progress.unlockedFatesSeen).toContain('mortgaged')
  })

  it('recordFateSeen merge via helpers preserves idempotent mortgaged catalog', () => {
    let progress = emptyMetaSave().progress
    progress = recordFateSeenLogic(progress, 'mortgaged')
    const again = recordFateSeenLogic(progress, 'mortgaged')
    expect(again.startBundles).toEqual(progress.startBundles)
    expect(again.unlockedFatesSeen?.length).toBe(progress.unlockedFatesSeen?.length)
  })
})

describe('useMetaStorage SSR guard', () => {
  it('readMetaContainer returns empty defaults when not on client', () => {
    const container = readMetaContainer()
    expect(container.saveSchemaVersion).toBe(1)
    expect(container.progress.unlockedFatesSeen).toEqual(['human'])
  })

  it('writeMetaProgress returns progress without persisting when not on client', () => {
    const progress = recordFateSeenLogic(emptyMetaSave().progress, 'head_jar')
    const written = writeMetaProgress(progress)
    expect(written.unlockedFatesSeen).toContain('head_jar')
    const read = readMetaContainer()
    expect(read.progress.unlockedFatesSeen).toEqual(['human'])
  })
})
