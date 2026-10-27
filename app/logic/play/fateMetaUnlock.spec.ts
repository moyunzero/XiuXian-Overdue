import { describe, expect, it } from 'vitest'
import { carryoverFromPersist } from '~/logic/act1/act1Carryover'
import { createInitialAct1State } from '~/logic/act1/createInitialAct1State'
import { CHAPTER_BODY_COLLAPSE_THRESHOLD } from '~/logic/play/chapterCollapse'
import { settledFateRun } from '~/logic/play/chapterTestHelpers'
import { buildMandateCardOptions } from '~/logic/play/mandateCostHints'
import {
  buildMandateInboxPending,
  weightedPick
} from '~/logic/play/mandateDelivery'
import { applyFateTransition } from '~/logic/play/fateTransition'
import { getChapterConfig } from '~/logic/play/chapterRegistry'
import { listMandatesForPool } from '~/logic/play/mandateRegistry'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import {
  BUNDLE_MORTGAGE_FILE_COPY,
  emptyMetaProgress,
  getEligibleStartBundles,
  mergeFatesFromRun,
  recordFateSeen
} from '~/logic/play/metaProgress'
import {
  DEFAULT_PLAY_META,
  enrichCarryoverWithPlayMeta,
  mergeMetaFromRunArchive,
  mergePriorMetaUnlocks
} from '~/logic/play/playMeta'
import {
  applyStartBundlePassive,
  clauseLiterateActive,
  isClauseCreditMandate,
  tickStartBundlePassive
} from '~/logic/play/startBundleRegistry'
import type { StartConfig } from '~/types/game'

const start: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 20_000,
  startingCity: '嵩阳市'
}

describe('fateMetaUnlock', () => {
  it('T1: recordFateSeen idempotent for mortgaged', () => {
    let meta = emptyMetaProgress()
    meta = recordFateSeen(meta, 'mortgaged')
    const len = meta.unlockedFatesSeen?.length ?? 0
    meta = recordFateSeen(meta, 'mortgaged')
    expect(meta.unlockedFatesSeen?.length).toBe(len)
  })

  it('T2: settledFateRun → mortgaged transition → mergeFatesFromRun', () => {
    let run = settledFateRun()
    run = { ...run, bodyIntegrity: CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01 }
    run = applyFateTransition(run)
    expect(run.primaryFate).toBe('mortgaged')
    const meta = mergeFatesFromRun(emptyMetaProgress(), run)
    expect(meta.unlockedFatesSeen).toContain('mortgaged')
    expect(meta.startBundles).toContain(BUNDLE_MORTGAGE_FILE_COPY)
  })

  it('T3: mortgaged seen unlocks bundle-mortgage-file-copy catalog', () => {
    const meta = recordFateSeen(emptyMetaProgress(), 'mortgaged')
    expect(meta.startBundles).toContain(BUNDLE_MORTGAGE_FILE_COPY)
  })

  it('T4: getEligibleStartBundles returns demo bundle when mortgaged seen', () => {
    expect(getEligibleStartBundles(emptyMetaProgress())).toEqual([])
    const meta = recordFateSeen(emptyMetaProgress(), 'mortgaged')
    expect(getEligibleStartBundles(meta)).toEqual([BUNDLE_MORTGAGE_FILE_COPY])
  })

  it('T5: new run + bundle-mortgage-file-copy sets 5 passive weeks', () => {
    const meta = recordFateSeen(emptyMetaProgress(), 'mortgaged')
    expect(getEligibleStartBundles(meta)).toContain(BUNDLE_MORTGAGE_FILE_COPY)
    const run = createPlayRunFromStartConfig(start, 'slot1', {
      runMode: 'fate_run',
      startBundleId: BUNDLE_MORTGAGE_FILE_COPY
    })
    expect(run.startBundlePassiveWeeksLeft).toBe(5)
    expect(run.selectedStartBundleId).toBe(BUNDLE_MORTGAGE_FILE_COPY)
  })

  it('T6: week-1 mandate numbness ≥40 + clause-literate yields one sharp hint', () => {
    let run = settledFateRun()
    run = applyStartBundlePassive(run, BUNDLE_MORTGAGE_FILE_COPY)
    run = {
      ...run,
      mandate: {
        numbness: 45,
        domestication: 0,
        pendingDeliveryIds: ['ch0-debt-reminder'],
        supplyCutStreak: 0
      }
    }
    expect(clauseLiterateActive(run)).toBe(true)
    const pending = buildMandateInboxPending(run)
    expect(pending?.fuzzFlags?.clauseLiterateUnblurId).toBe('ack-min')
    const options = buildMandateCardOptions(pending!.responses, pending!.fuzzFlags)
    expect(options.left?.costHintFuzzed).toBe(false)
    expect(options.right?.costHintFuzzed).toBe(true)
  })

  it('T7: passive expiry after 5 ticks — hints fuzz again under numbness', () => {
    let run = settledFateRun()
    run = applyStartBundlePassive(run, BUNDLE_MORTGAGE_FILE_COPY)
    for (let i = 0; i < 5; i++) {
      run = tickStartBundlePassive(run)
    }
    expect(clauseLiterateActive(run)).toBe(false)
    run = {
      ...run,
      mandate: {
        numbness: 45,
        domestication: 0,
        pendingDeliveryIds: ['ch0-debt-reminder'],
        supplyCutStreak: 0
      }
    }
    const pending = buildMandateInboxPending(run)
    expect(pending?.fuzzFlags?.clauseLiterateUnblurId).toBeUndefined()
    const options = buildMandateCardOptions(pending!.responses, pending!.fuzzFlags)
    expect(options.left?.costHintFuzzed).toBe(true)
    expect(options.right?.costHintFuzzed).toBe(true)
  })

  it('T8: clause-literate +1 weight increases pick rate for 征信 mandate (seeded)', () => {
    const credit = listMandatesForPool(getChapterConfig('ch0-forty-week-contract'), 'routine').find(
      (d) => d.id === 'ch0-debt-reminder'
    )
    const other = listMandatesForPool(getChapterConfig('ch0-forty-week-contract'), 'routine').find(
      (d) => d.id === 'ch0-focus-audit'
    )
    expect(credit).toBeTruthy()
    expect(other).toBeTruthy()
    expect(isClauseCreditMandate(credit!)).toBe(true)

    const pair = [other!, credit!]
    let creditWinsBase = 0
    let creditWinsBoost = 0
    for (let i = 0; i < 100; i++) {
      const rand = () => ((i * 7919 + 1) % 997) / 997
      if (weightedPick(pair, (d) => d.weight ?? 1, rand)?.id === credit!.id) creditWinsBase++
      if (
        weightedPick(pair, (d) => (d.weight ?? 1) + (isClauseCreditMandate(d) ? 1 : 0), rand)?.id ===
        credit!.id
      ) {
        creditWinsBoost++
      }
    }
    expect(creditWinsBoost).toBeGreaterThan(creditWinsBase)
  })

  it('T9: mergeMetaFromRunArchive safety merge gains head_jar if hook missed', () => {
    let run = settledFateRun()
    run = { ...run, primaryFate: 'head_jar', runStatus: 'fated' }
    const meta = mergeMetaFromRunArchive(emptyMetaProgress(), run)
    expect(meta.unlockedFatesSeen).toContain('head_jar')
  })

  it('T10: enrichCarryoverWithPlayMeta still merges priorMetaUnlocks', () => {
    const persist = {
      startConfig: start,
      act1: createInitialAct1State(start),
      metaUnlocks: [],
      permanentModifiers: {},
      settled: true
    }
    const base = carryoverFromPersist(persist)
    const meta = mergePriorMetaUnlocks(DEFAULT_PLAY_META, ['family-false-hope'])
    const out = enrichCarryoverWithPlayMeta(base, meta)
    expect(out.metaUnlocks).toContain('family-false-hope')
    expect(out.startingDelinquencyBias).toBeGreaterThan(0)
  })

  it('flow: mortgaged meta → eligible bundle → new run week-1 hint (bundle-mortgage-file-copy)', () => {
    let run = settledFateRun()
    run = { ...run, bodyIntegrity: CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01 }
    run = applyFateTransition(run)

    const meta = recordFateSeen(emptyMetaProgress(), run.primaryFate)
    expect(getEligibleStartBundles(meta)).toContain(BUNDLE_MORTGAGE_FILE_COPY)

    const newRun = createPlayRunFromStartConfig(start, 'slot2', {
      runMode: 'fate_run',
      startBundleId: BUNDLE_MORTGAGE_FILE_COPY
    })
    expect(newRun.startBundlePassiveWeeksLeft).toBe(5)

    const withNumbness = {
      ...newRun,
      mandate: {
        numbness: 42,
        domestication: 0,
        pendingDeliveryIds: ['ch0-debt-reminder'],
        supplyCutStreak: 0
      }
    }
    const pending = buildMandateInboxPending(withNumbness)
    const options = buildMandateCardOptions(pending!.responses, pending!.fuzzFlags)
    const allOptions = [options.left, options.right, ...options.grit].filter(Boolean)
    expect(allOptions.some((o) => o && !o.costHintFuzzed)).toBe(true)
  })
})
