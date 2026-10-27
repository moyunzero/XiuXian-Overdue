import fs from 'node:fs'
import path from 'node:path'
import type { KunxuSaveV4 } from '~/types/play'

const FIXTURE_DIR = path.join(process.cwd(), 'e2e/fixtures/phase7-uat')

export const PLAY_SAVE_KEY = 'kunxu_sim_save_v5'

export type Phase7UatFixtureScenario = {
  id: string
  label: string
  path: '/play'
  waitSelector: string
  saveV5: KunxuSaveV4
  expectRunMode?: 'fate_run'
  expectStageId?: string
  expectPrimaryFate?: string
  expectOverlayBody?: string
  expectWeekIndex?: number
}

export function getPhase7UatFixture(id: string): Phase7UatFixtureScenario {
  const filePath = path.join(FIXTURE_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Missing fixture ${id}. Run: yarn vitest --run app/logic/play/phase7UatFixtures.spec.ts`
    )
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Phase7UatFixtureScenario
}
