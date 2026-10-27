import fs from 'node:fs'
import path from 'node:path'

const FIXTURE_DIR = path.join(process.cwd(), 'e2e/fixtures/phase3-uat')
export const PLAY_SAVE_KEY = 'kunxu_sim_save_v5'

export type Phase3UatFixtureScenario = {
  id: string
  label: string
  path: '/play'
  waitSelector: string
  saveV5: Record<string, unknown>
  expectRunMode?: 'fate_run' | 'chapter'
  expectWeekIndex?: number
  expectMandatePending?: number
}

export function loadPhase3UatFixtures(): Phase3UatFixtureScenario[] {
  if (!fs.existsSync(FIXTURE_DIR)) {
    throw new Error(
      `Missing ${FIXTURE_DIR}. Run: yarn vitest --run app/logic/play/phase3UatFixtures.spec.ts`
    )
  }
  const files = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json'))
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(FIXTURE_DIR, f), 'utf8')
    return JSON.parse(raw) as Phase3UatFixtureScenario
  })
}

export function getPhase3UatFixture(id: string): Phase3UatFixtureScenario {
  const filePath = path.join(FIXTURE_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing fixture ${id}. Run phase3UatFixtures.spec.ts first.`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Phase3UatFixtureScenario
}
