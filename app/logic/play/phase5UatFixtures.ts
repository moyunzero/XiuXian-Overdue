import fs from 'node:fs'
import path from 'node:path'
import type { KunxuSaveV4 } from '~/types/play'
import { emptyMetaSave, type MetaSaveContainer } from '~/composables/useMetaStorage.helpers'
import { recordFateSeen } from '~/logic/play/metaProgress'
import { buildPhase4UatFixtures } from '~/logic/play/phase4UatFixtures'

export const META_SAVE_KEY = 'kunxu_sim_meta_v1'

export type Phase5UatFixtureExport = {
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

export function metaMortgagedUnlocked(): MetaSaveContainer {
  const base = emptyMetaSave()
  const progress = recordFateSeen(base.progress, 'mortgaged')
  return {
    saveSchemaVersion: base.saveSchemaVersion,
    metaProgressId: 'default',
    progress
  }
}

export function buildPhase5UatFixtures(): Phase5UatFixtureExport[] {
  const overlay = buildPhase4UatFixtures().find((f) => f.id === 'phase4-fate-update-overlay')!

  return [
    {
      id: 'phase5-meta-codex-mortgaged',
      label: 'Phase5 · homepage codex mortgaged unlock',
      path: '/',
      waitSelector: '.FateCodexStrip',
      metaV1: metaMortgagedUnlocked(),
      clearPlaySave: true,
      clearMeta: false,
      expectMetaMortgagedSeen: true,
      expectBundleCatalog: true
    },
    {
      id: 'phase5-trauma-chip-overlay',
      label: 'Phase5 · trauma chip after overlay dismiss',
      path: '/play',
      waitSelector: '.FateUpdateOverlay',
      saveV5: overlay.saveV5,
      clearPlaySave: false,
      clearMeta: true
    },
    {
      id: 'phase5-start-bundle-picker',
      label: 'Phase5 · start bundle picker on new human',
      path: '/',
      waitSelector: '.StartBundleRow',
      metaV1: metaMortgagedUnlocked(),
      clearPlaySave: true,
      expectBundleCatalog: true
    }
  ]
}

export function writePhase5UatFixturesToDisk(outDir: string): string[] {
  fs.mkdirSync(outDir, { recursive: true })
  const fixtures = buildPhase5UatFixtures()
  return fixtures.map((fixture) => {
    const filePath = path.join(outDir, `${fixture.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2), 'utf8')
    return filePath
  })
}
