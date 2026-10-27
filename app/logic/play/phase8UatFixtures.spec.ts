import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPhase8UatScenarios, ensureUpstreamUatFixturesOnDisk } from '~/logic/play/phase8UatFixtures'

describe('phase8UatFixtures', () => {
  it('registers 7 handoff scenarios mapping checklist sections', () => {
    const scenarios = buildPhase8UatScenarios()
    expect(scenarios).toHaveLength(7)
    expect(scenarios.map((s) => s.sourceFixtureId)).toContain('phase7-m1-week8-dashboard')
    expect(scenarios.map((s) => s.sourceFixtureId)).toContain('phase6-ghost-bound-playable')
  })

  it('writes upstream phase5–7 fixtures + scenarios.json', () => {
    const paths = ensureUpstreamUatFixturesOnDisk()
    expect(paths.length).toBeGreaterThan(10)
    const registry = path.join(process.cwd(), 'e2e/fixtures/phase8-uat/scenarios.json')
    expect(fs.existsSync(registry)).toBe(true)
  })
})
