import { describe, expect, it } from 'vitest'
import { getChapterConfig } from '~/logic/play/chapterRegistry'
import {
  getStageDef,
  listStageDefs,
  resolveMandatePoolPath
} from '~/logic/play/stageRegistry'

describe('stageRegistry', () => {
  it('lists five stage manifests', () => {
    expect(listStageDefs()).toHaveLength(5)
  })

  it('M1 manifest exposes three mandate pool paths', () => {
    const m1 = getStageDef('stage-m1-contract')
    expect(m1?.mandatePools.routine).toBe('data/mandates/ch0-routine.json')
    expect(m1?.mandatePools.nodeBonus).toBe('data/mandates/ch0-node.json')
    expect(m1?.mandatePools.family).toBe('data/mandates/ch0-family.json')
  })

  it('M1 paths match chapter mandatePools', () => {
    const m1 = getStageDef('stage-m1-contract')!
    const ch = getChapterConfig('ch0-forty-week-contract')
    expect(m1.mandatePools).toEqual(ch.mandatePools)
  })

  it('resolveMandatePoolPath returns routine path for M1', () => {
    expect(
      resolveMandatePoolPath('stage-m1-contract', 'routine', 'ch0-forty-week-contract')
    ).toBe('data/mandates/ch0-routine.json')
  })

  it('M2 skeleton does not inherit chapter pools when chapterId persists', () => {
    expect(
      resolveMandatePoolPath('stage-m2-hs', 'routine', 'ch0-forty-week-contract')
    ).toBeUndefined()
  })

  it('M2–M4 skeleton manifests have empty mandatePools', () => {
    for (const id of ['stage-m2-hs', 'stage-m3-uni', 'stage-m4-work']) {
      const def = getStageDef(id)
      expect(def?.mandatePools).toEqual({})
      expect(def?.chapterId).toBeNull()
    }
  })
})
