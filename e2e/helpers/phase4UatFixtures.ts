import fs from 'node:fs'
import path from 'node:path'

const FIXTURE_DIR = path.join(process.cwd(), 'e2e/fixtures/phase4-uat')
export const PLAY_SAVE_KEY = 'kunxu_sim_save_v5'

export type Phase4UatFixtureScenario = {
  id: string
  label: string
  path: '/play'
  waitSelector: string
  saveV5: Record<string, unknown>
  expectRunMode?: 'fate_run' | 'chapter'
  expectWeekIndex?: number
  expectPrimaryFate?: string
}

export function loadPhase4UatFixtures(): Phase4UatFixtureScenario[] {
  if (!fs.existsSync(FIXTURE_DIR)) {
    throw new Error(
      `Missing ${FIXTURE_DIR}. Run: yarn vitest --run app/logic/play/phase4UatFixtures.spec.ts`
    )
  }
  const files = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json'))
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(FIXTURE_DIR, f), 'utf8')
    return JSON.parse(raw) as Phase4UatFixtureScenario
  })
}

export function getPhase4UatFixture(id: string): Phase4UatFixtureScenario {
  const filePath = path.join(FIXTURE_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing fixture ${id}. Run phase4UatFixtures.spec.ts first.`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Phase4UatFixtureScenario
}
