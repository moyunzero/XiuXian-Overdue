import fs from 'node:fs'
import path from 'node:path'
import { getPhase5UatFixture, META_SAVE_KEY, PLAY_SAVE_KEY } from './phase5UatFixtures'
import { getPhase6UatFixture } from './phase6UatFixtures'
import { getPhase7UatFixture } from './phase7UatFixtures'
import type { KunxuSaveV4 } from '~/types/play'
import type { MetaSaveContainer } from '~/composables/useMetaStorage.helpers'

export { PLAY_SAVE_KEY, META_SAVE_KEY }

export type Phase8UatScenarioRef = {
  id: string
  label: string
  checklistRef: string
  sourcePhase: 5 | 6 | 7
  sourceFixtureId: string
  path: '/' | '/play'
  waitSelector: string
  usesMeta?: boolean
}

const SCENARIOS_PATH = path.join(process.cwd(), 'e2e/fixtures/phase8-uat/scenarios.json')

function loadScenarios(): Phase8UatScenarioRef[] {
  if (!fs.existsSync(SCENARIOS_PATH)) {
    throw new Error(
      `Missing ${SCENARIOS_PATH}. Run: yarn vitest --run app/logic/play/phase8UatFixtures.spec.ts`
    )
  }
  return JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf8')) as Phase8UatScenarioRef[]
}

export type Phase8SeedPayload = {
  scenario: Phase8UatScenarioRef
  path: '/' | '/play'
  waitSelector: string
  saveV5?: KunxuSaveV4
  metaV1?: MetaSaveContainer
}

export function getPhase8UatScenario(id: string): Phase8UatScenarioRef {
  const scenario = loadScenarios().find((s) => s.id === id)
  if (!scenario) throw new Error(`Unknown phase8 scenario: ${id}`)
  return scenario
}

export function resolvePhase8Seed(id: string): Phase8SeedPayload {
  const scenario = getPhase8UatScenario(id)
  if (scenario.sourcePhase === 5) {
    const f = getPhase5UatFixture(scenario.sourceFixtureId)
    return {
      scenario,
      path: f.path,
      waitSelector: f.waitSelector,
      saveV5: f.saveV5,
      metaV1: f.metaV1
    }
  }
  if (scenario.sourcePhase === 6) {
    const f = getPhase6UatFixture(scenario.sourceFixtureId)
    return {
      scenario,
      path: f.path,
      waitSelector: f.waitSelector,
      saveV5: f.saveV5
    }
  }
  const f = getPhase7UatFixture(scenario.sourceFixtureId)
  return {
    scenario,
    path: f.path,
    waitSelector: f.waitSelector,
    saveV5: f.saveV5
  }
}
