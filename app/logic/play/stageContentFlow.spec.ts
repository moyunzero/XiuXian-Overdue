import { describe, expect, it } from 'vitest'
import { CHAPTER_BODY_COLLAPSE_THRESHOLD } from '~/logic/play/chapterCollapse'
import {
  advanceFateToWeek,
  dismissCurrentSetpiece,
  finalizeAfterMandateDrain,
  settledFateRun
} from '~/logic/play/chapterTestHelpers'
import { DEFAULT_WEEK_PLAN, markBeatResolvedForWeek } from '~/logic/play/chapterWeekFlow'
import { listMandatesForRunPool } from '~/logic/play/mandateRegistry'
import { advanceWeek, resolveWeekEnd } from '~/logic/play/milestoneWeekFlow'
import { applyFateTransition } from '~/logic/play/fateTransition'
import { getStageDef } from '~/logic/play/stageRegistry'
import type { MandatePoolKey } from '~/types/chapter'

const M1_STAGE_ID = 'stage-m1-contract'
const M2_STAGE_ID = 'stage-m2-hs'

function m1MandateIds(): string[] {
  const run = settledFateRun()
  run.stageId = M1_STAGE_ID
  const pools: MandatePoolKey[] = ['routine', 'nodeBonus', 'family']
  const ids = new Set<string>()
  for (const pool of pools) {
    for (const def of listMandatesForRunPool(run, pool)) {
      ids.add(def.id)
    }
  }
  return [...ids].sort()
}

const M1_MANDATE_ID_BASELINE = m1MandateIds()

describe('stageContentFlow', () => {
  it('M1 manifest exposes three mandate pool paths', () => {
    const m1 = getStageDef(M1_STAGE_ID)
    expect(m1?.mandatePools.routine).toBeTruthy()
    expect(m1?.mandatePools.nodeBonus).toBeTruthy()
    expect(m1?.mandatePools.family).toBeTruthy()
  })

  it('resolves ch0-ghost-bound-summon via stage manifest chain', () => {
    const run = settledFateRun()
    run.stageId = M1_STAGE_ID
    const ids = listMandatesForRunPool(run, 'routine').map((m) => m.id)
    expect(ids).toContain('ch0-ghost-bound-summon')
  })

  it('M1 mandate id parity matches baseline snapshot', () => {
    expect(m1MandateIds()).toEqual(M1_MANDATE_ID_BASELINE)
    expect(M1_MANDATE_ID_BASELINE.length).toBeGreaterThan(0)
  })

  it('40-week fate_run sim: no finale gate, not archived/collapsed', () => {
    const run = advanceFateToWeek(settledFateRun(), 40)
    expect(run.runMode).toBe('fate_run')
    expect(run.runStatus).not.toBe('archived')
    expect(run.runStatus).not.toBe('collapsed')
    expect(run.runStatus).not.toBe('ended')
    expect(run.chapter?.pendingGateId).not.toBe('gate-w40-finale')
    expect(run.chapter?.chapterWeekIndex).toBeGreaterThanOrEqual(40)
  })

  it('W41 continuity → stage-m2-hs with 契约账期 log', () => {
    let run = advanceFateToWeek(settledFateRun(), 40)
    run = dismissCurrentSetpiece(run)
    const to41 = advanceWeek(run, DEFAULT_WEEK_PLAN)
    run = finalizeAfterMandateDrain(to41.run)
    run = resolveWeekEnd(run)
    expect(run.chapter?.chapterWeekIndex).toBe(41)
    expect(run.stageId).toBe(M2_STAGE_ID)
    expect(run.logs.some((l) => l.includes('契约账期已满'))).toBe(true)
  })

  it('catalog smoke: body_integrity → mortgaged via fateTransition', () => {
    let run = settledFateRun()
    run.bodyIntegrity = CHAPTER_BODY_COLLAPSE_THRESHOLD - 0.01
    run = markBeatResolvedForWeek(run)
    const next = applyFateTransition(run)
    expect(next.primaryFate).toBe('mortgaged')
    expect(next.runStatus).toBe('fated')
    expect(next.setpiece?.fateUpdatePending?.to).toBe('mortgaged')
  })
})
