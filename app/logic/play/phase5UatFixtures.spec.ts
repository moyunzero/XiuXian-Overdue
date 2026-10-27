import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUNDLE_MORTGAGE_FILE_COPY } from '~/logic/play/metaProgress'
import {
  buildPhase5UatFixtures,
  metaMortgagedUnlocked,
  writePhase5UatFixturesToDisk
} from '~/logic/play/phase5UatFixtures'

describe('phase5UatFixtures', () => {
  it('exports playwright seed JSON for Phase 5 meta UAT', () => {
    const fixtures = buildPhase5UatFixtures()
    expect(fixtures).toHaveLength(3)

    const meta = metaMortgagedUnlocked()
    expect(meta.progress.unlockedFatesSeen).toContain('mortgaged')
    expect(meta.progress.startBundles).toContain(BUNDLE_MORTGAGE_FILE_COPY)

    const codex = fixtures.find((f) => f.id === 'phase5-meta-codex-mortgaged')!
    expect(codex.path).toBe('/')
    expect(codex.expectMetaMortgagedSeen).toBe(true)

    const overlay = fixtures.find((f) => f.id === 'phase5-trauma-chip-overlay')!
    const overlayRun = Object.values(overlay.saveV5!.runs)[0]
    expect(overlayRun.setpiece?.fateUpdatePending?.to).toBe('mortgaged')

    const outDir = path.join(process.cwd(), 'e2e/fixtures/phase5-uat')
    const files = writePhase5UatFixturesToDisk(outDir)
    expect(files.length).toBe(fixtures.length)
  })
})
