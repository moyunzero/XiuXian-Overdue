import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPhase4UatFixtures, writePhase4UatFixturesToDisk } from '~/logic/play/phase4UatFixtures'

describe('phase4UatFixtures', () => {
  it('exports playwright seed JSON for Phase 4 fate slice UAT', () => {
    const fixtures = buildPhase4UatFixtures()
    expect(fixtures).toHaveLength(4)

    const headJar = fixtures.find((f) => f.id === 'phase4-head-jar-week8')!
    const headJarRun = Object.values(headJar.saveV5.runs)[0]
    expect(headJarRun.primaryFate).toBe('head_jar')
    expect(headJarRun.runMode).toBe('fate_run')

    const mortgaged = fixtures.find((f) => f.id === 'phase4-mortgaged-mid')!
    const mortgagedRun = Object.values(mortgaged.saveV5.runs)[0]
    expect(mortgagedRun.primaryFate).toBe('mortgaged')

    const overlay = fixtures.find((f) => f.id === 'phase4-fate-update-overlay')!
    const overlayRun = Object.values(overlay.saveV5.runs)[0]
    expect(overlayRun.setpiece?.fateUpdatePending?.to).toBe('mortgaged')

    const outDir = path.join(process.cwd(), 'e2e/fixtures/phase4-uat')
    const files = writePhase4UatFixturesToDisk(outDir)
    expect(files.length).toBe(fixtures.length)
  })
})
