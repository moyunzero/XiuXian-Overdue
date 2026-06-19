import fs from 'node:fs'
import path from 'node:path'

const FIXTURE_DIR = path.join(process.cwd(), 'e2e/fixtures/phase2-uat')
export const PLAY_SAVE_KEY = 'kunxu_sim_save_v5'

export type Phase2UatFixtureScenario = {
  id: string
  label: string
  path: '/play'
  waitSelector: string
  saveV5: Record<string, unknown>
  expectRunMode?: 'fate_run' | 'chapter'
  expectWeekIndex?: number
  expectStageId?: string
  expectRunStatus?: string
}

export function loadPhase2UatFixtures(): Phase2UatFixtureScenario[] {
  if (!fs.existsSync(FIXTURE_DIR)) {
    throw new Error(
      `Missing ${FIXTURE_DIR}. Run: yarn vitest --run app/logic/play/phase2UatFixtures.spec.ts`
    )
  }
  const files = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json'))
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(FIXTURE_DIR, f), 'utf8')
    return JSON.parse(raw) as Phase2UatFixtureScenario
  })
}

export function getPhase2UatFixture(id: string): Phase2UatFixtureScenario {
  const filePath = path.join(FIXTURE_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing fixture ${id}. Run phase2UatFixtures.spec.ts first.`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Phase2UatFixtureScenario
}
