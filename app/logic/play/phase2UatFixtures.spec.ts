import { describe, expect, it } from 'vitest'
import { buildPhase2UatFixtures } from '~/logic/play/phase2UatFixtures'

describe('phase2UatFixtures', () => {
  it('exports week41 M2 fixture with stage-m2-hs', () => {
    const fixtures = buildPhase2UatFixtures()
    const m2 = fixtures.find((f) => f.id === 'phase2-fate-week41-m2')
    expect(m2).toBeTruthy()
    const m2Run = m2!.saveV5.runs[m2!.saveV5.activeRunId!]
    expect(m2Run?.stageId).toBe('stage-m2-hs')
  })
})
