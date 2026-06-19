import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPhase2UatFixtures, writePhase2UatFixturesToDisk } from '~/logic/play/phase2UatFixtures'
import { STAGE_M2_HS } from '~/logic/play/stageDefs'

describe('phase2UatFixtures', () => {
  it('exports playwright seed JSON for Phase 2 UAT scenarios', () => {
    const fixtures = buildPhase2UatFixtures()
    expect(fixtures).toHaveLength(4)

    const w39 = fixtures.find((f) => f.id === 'phase2-fate-week40')!
    const w39Run = Object.values(w39.saveV5.runs)[0]
    expect(w39Run.chapter?.chapterWeekIndex).toBe(40)
    expect(w39Run.runMode).toBe('fate_run')

    const m2 = fixtures.find((f) => f.id === 'phase2-fate-week41-m2')!
    const m2Run = Object.values(m2.saveV5.runs)[0]
    expect(m2Run.chapter?.chapterWeekIndex).toBe(41)
    expect(m2Run.stageId).toBe(STAGE_M2_HS.id)
    expect(m2Run.logs.some((l) => l.includes('学籍段切换'))).toBe(true)

    const outDir = path.join(process.cwd(), 'e2e/fixtures/phase2-uat')
    const files = writePhase2UatFixturesToDisk(outDir)
    expect(files.length).toBe(fixtures.length)
  })
})
