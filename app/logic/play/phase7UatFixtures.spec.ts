import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPhase7UatFixtures, writePhase7UatFixturesToDisk } from '~/logic/play/phase7UatFixtures'

const OUT_DIR = path.join(process.cwd(), 'e2e/fixtures/phase7-uat')

describe('phase7UatFixtures', () => {
  it('builds 4–6 fate_run fixtures with M1/M2 stage ids', () => {
    const fixtures = buildPhase7UatFixtures()
    expect(fixtures.length).toBeGreaterThanOrEqual(4)
    expect(fixtures.length).toBeLessThanOrEqual(6)
    for (const f of fixtures) {
      const run = f.saveV5.runs[f.saveV5.activeRunId!]
      expect(run?.runMode).toBe('fate_run')
    }
    const m1 = fixtures.find((f) => f.id === 'phase7-m1-week8-dashboard')
    expect(m1?.expectStageId).toBe('stage-m1-contract')
    const m2 = fixtures.find((f) => f.id === 'phase7-w41-m2-stage')
    expect(m2?.expectStageId).toBe('stage-m2-hs')
  })

  it('writes JSON fixtures to e2e/fixtures/phase7-uat/', () => {
    const paths = writePhase7UatFixturesToDisk(OUT_DIR)
    expect(paths.length).toBeGreaterThanOrEqual(4)
    for (const p of paths) {
      expect(fs.existsSync(p)).toBe(true)
    }
  })
})
