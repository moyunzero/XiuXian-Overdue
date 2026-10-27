import { describe, expect, it } from 'vitest'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import type { StartConfig } from '~/types/game'
import {
  BUNDLE_MORTGAGE_FILE_COPY,
  emptyMetaProgress,
  getEligibleStartBundles,
  mergeFatesFromRun,
  normalizeMetaProgress,
  recordFateSeen,
  unlockBundlesForFate
} from './metaProgress'
import { formatMetaProgressLine, formatFateStampCount, getFateCodexBlurb } from './metaProgressCopy'

const start: StartConfig = {
  playerName: '测试',
  background: '中产',
  initialDebt: 20_000,
  talent: '无灵根',
  startingCity: '嵩阳市'
}

describe('metaProgress', () => {
  it('emptyMetaProgress / normalizeMetaProgress defaults include human', () => {
    const empty = emptyMetaProgress()
    expect(empty.unlockedFatesSeen).toEqual(['human'])
    expect(empty.passiveIds).toEqual([])
    expect(empty.startBundles).toEqual([])

    const normalized = normalizeMetaProgress({})
    expect(normalized.unlockedFatesSeen).toEqual(['human'])
    expect(normalized.passiveIds).toEqual([])
    expect(normalized.startBundles).toEqual([])
  })

  it('normalizeMetaProgress dedupes fates and rejects invalid input', () => {
    const normalized = normalizeMetaProgress({
      unlockedFatesSeen: ['human', 'mortgaged', 'mortgaged', 'not-a-fate'],
      passiveIds: ['a', 'a'],
      startBundles: ['bundle-mortgage-file-copy', 'bundle-mortgage-file-copy']
    })
    expect(normalized.unlockedFatesSeen).toEqual(['human', 'mortgaged'])
    expect(normalized.passiveIds).toEqual(['a'])
    expect(normalized.startBundles).toEqual(['bundle-mortgage-file-copy'])
  })

  it('normalizeMetaProgress falls back on null/invalid container', () => {
    expect(normalizeMetaProgress(null)).toEqual(emptyMetaProgress())
    expect(normalizeMetaProgress(undefined)).toEqual(emptyMetaProgress())
  })

  it('recordFateSeen is idempotent for mortgaged', () => {
    let progress = emptyMetaProgress()
    const first = recordFateSeen(progress, 'mortgaged')
    const second = recordFateSeen(first, 'mortgaged')
    expect(first.unlockedFatesSeen).toContain('mortgaged')
    expect(second.unlockedFatesSeen?.length).toBe(first.unlockedFatesSeen?.length)
  })

  it('unlockBundlesForFate adds bundle-mortgage-file-copy on mortgaged first seen', () => {
    const progress = recordFateSeen(emptyMetaProgress(), 'mortgaged')
    expect(progress.startBundles).toContain(BUNDLE_MORTGAGE_FILE_COPY)
    expect(unlockBundlesForFate(emptyMetaProgress(), 'human').startBundles).toEqual([])
  })

  it('mergeFatesFromRun includes primaryFate from head_jar run', () => {
    let run = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'fate_run' })
    run = { ...run, primaryFate: 'head_jar', runStatus: 'fated' }
    const merged = mergeFatesFromRun(emptyMetaProgress(), run)
    expect(merged.unlockedFatesSeen).toContain('head_jar')
  })

  it('getEligibleStartBundles empty before mortgaged seen', () => {
    expect(getEligibleStartBundles(emptyMetaProgress())).toEqual([])
    const withMortgaged = recordFateSeen(emptyMetaProgress(), 'mortgaged')
    expect(getEligibleStartBundles(withMortgaged)).toContain(BUNDLE_MORTGAGE_FILE_COPY)
  })

  it('formatMetaProgressLine shows 命运档案 N/7 with latest label', () => {
    const progress = recordFateSeen(emptyMetaProgress(), 'mortgaged')
    const line = formatMetaProgressLine(progress)
    expect(line).toMatch(/命运档案 2\/7/)
    expect(line).toContain('抵押运行')
    expect(line).not.toContain('mortgaged')
  })

  it('getFateCodexBlurb returns institutional one-liner without raw fate id', () => {
    const blurb = getFateCodexBlurb('mortgaged')
    expect(blurb.length).toBeGreaterThan(4)
    expect(blurb).not.toContain('mortgaged')
    expect(formatFateStampCount(emptyMetaProgress())).toBe('1/7')
  })
})
