import fs from 'node:fs'
import path from 'node:path'

const FIXTURE_DIR = path.join(process.cwd(), 'e2e/fixtures/ui-audit')
const PLAY_KEY = 'kunxu_sim_save_v5'
const ACT1_KEY = 'kunxu_sim_save_v2'

export type UiFixtureScenario = {
  id: string
  label: string
  path: '/' | '/play'
  waitSelector: string
  saveV5: Record<string, unknown> | null
  saveV2: string | null
}

export function loadUiFixtureScenarios(): UiFixtureScenario[] {
  const files = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json'))
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(FIXTURE_DIR, f), 'utf8')
    return JSON.parse(raw) as UiFixtureScenario
  })
}

export function seedPayloadForScenario(scenario: UiFixtureScenario) {
  return {
    playKey: PLAY_KEY,
    playValue: scenario.saveV5 ? JSON.stringify(scenario.saveV5) : null,
    act1Key: ACT1_KEY,
    act1Value: scenario.saveV2
  }
}
