import { describe, expect, it } from 'vitest'
import { settledChapterRun } from '~/logic/play/chapterTestHelpers'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import type { StartConfig } from '~/types/game'
import {
  BUNDLE_MORTGAGE_FILE_COPY,
  emptyMetaProgress,
  recordFateSeen
} from '~/logic/play/metaProgress'
import {
  applyStartBundlePassive,
  clauseLiterateActive,
  getEligibleStartBundlesFromRegistry,
  START_BUNDLE_REGISTRY,
  tickStartBundlePassive
} from './startBundleRegistry'

const start: StartConfig = {
  playerName: '测试',
  background: '中产',
  initialDebt: 20_000,
  talent: '无灵根',
  startingCity: '嵩阳市'
}

describe('startBundleRegistry', () => {
  it('START_BUNDLE_REGISTRY contains bundle-mortgage-file-copy with 5 weeks', () => {
    const def = START_BUNDLE_REGISTRY[BUNDLE_MORTGAGE_FILE_COPY]
    expect(def).toBeDefined()
    expect(def!.playerLabel).toBe('抵押档案副本')
    expect(def!.clauseLiterateWeeks).toBe(5)
  })

  it('getEligibleStartBundlesFromRegistry empty before mortgaged seen', () => {
    expect(getEligibleStartBundlesFromRegistry(emptyMetaProgress())).toEqual([])
    const withMortgaged = recordFateSeen(emptyMetaProgress(), 'mortgaged')
    expect(getEligibleStartBundlesFromRegistry(withMortgaged)).toContain(BUNDLE_MORTGAGE_FILE_COPY)
  })

  it('applyStartBundlePassive sets 5 weeks and leaves initialDebt unchanged', () => {
    const baseline = createPlayRunFromStartConfig(start, 'slot1', { runMode: 'chapter' })
    const baselineDebt = baseline.start.initialDebt
    const bundled = applyStartBundlePassive(baseline, BUNDLE_MORTGAGE_FILE_COPY)
    expect(bundled.startBundlePassiveWeeksLeft).toBe(5)
    expect(bundled.selectedStartBundleId).toBe(BUNDLE_MORTGAGE_FILE_COPY)
    expect(bundled.start.initialDebt).toBe(baselineDebt)
    expect(bundled.metaProgressId).toBe('default')
  })

  it('applyStartBundlePassive(null|standard) is no-op', () => {
    const run = createPlayRunFromStartConfig(start, 'slot1')
    expect(applyStartBundlePassive(run, null)).toEqual(run)
    expect(applyStartBundlePassive(run, 'standard')).toEqual(run)
  })

  it('clauseLiterateActive true when weeks left > 0', () => {
    const run = applyStartBundlePassive(createPlayRunFromStartConfig(start, 'slot1'), BUNDLE_MORTGAGE_FILE_COPY)
    expect(clauseLiterateActive(run)).toBe(true)
    expect(clauseLiterateActive({ ...run, startBundlePassiveWeeksLeft: 0 })).toBe(false)
  })

  it('tickStartBundlePassive decrements until inactive at 0', () => {
    let run = applyStartBundlePassive(createPlayRunFromStartConfig(start, 'slot1'), BUNDLE_MORTGAGE_FILE_COPY)
    for (let i = 0; i < 5; i++) {
      expect(clauseLiterateActive(run)).toBe(true)
      run = tickStartBundlePassive(run)
    }
    expect(run.startBundlePassiveWeeksLeft).toBe(0)
    expect(clauseLiterateActive(run)).toBe(false)
  })

  it('applyStartBundlePassive does not skip Act1 lifeStage path', () => {
    const chapter = settledChapterRun(start)
    expect(chapter.lifeStage).toBe('hs')
    const bundled = applyStartBundlePassive(chapter, BUNDLE_MORTGAGE_FILE_COPY)
    expect(bundled.lifeStage).toBe('hs')
    expect(bundled.chapter?.chapterWeekIndex).toBe(chapter.chapter?.chapterWeekIndex)
  })

  it('createPlayRunFromStartConfig accepts startBundleId and sets metaProgressId', () => {
    const run = createPlayRunFromStartConfig(start, 'slot1', {
      runMode: 'chapter',
      startBundleId: BUNDLE_MORTGAGE_FILE_COPY
    })
    expect(run.startBundlePassiveWeeksLeft).toBe(5)
    expect(run.metaProgressId).toBe('default')
    expect(run.lifeStage).toBe('pre')
  })
})
