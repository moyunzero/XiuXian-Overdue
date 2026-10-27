import fs from 'node:fs'
import path from 'node:path'
import type { KunxuSaveV4 } from '~/types/play'
import type { MetaSaveContainer } from '~/composables/useMetaStorage.helpers'

const FIXTURE_DIR = path.join(process.cwd(), 'e2e/fixtures/phase5-uat')

export const PLAY_SAVE_KEY = 'kunxu_sim_save_v5'
export const META_SAVE_KEY = 'kunxu_sim_meta_v1'

export type Phase5UatFixtureScenario = {
  id: string
  label: string
  path: '/' | '/play'
  waitSelector: string
  metaV1?: MetaSaveContainer
  saveV5?: KunxuSaveV4
  clearPlaySave?: boolean
  clearMeta?: boolean
  expectMetaMortgagedSeen?: boolean
  expectBundleCatalog?: boolean
}

export function getPhase5UatFixture(id: string): Phase5UatFixtureScenario {
  const filePath = path.join(FIXTURE_DIR, `${id}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing fixture ${id}. Run: yarn vitest --run app/logic/play/phase5UatFixtures.spec.ts`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Phase5UatFixtureScenario
}
