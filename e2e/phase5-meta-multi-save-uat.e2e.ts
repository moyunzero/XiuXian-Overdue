import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import {
  getPhase5UatFixture,
  META_SAVE_KEY,
  PLAY_SAVE_KEY
} from './helpers/phase5UatFixtures'
import {
  PHASE5_UAT_OUT_DIR,
  PHASE5_UAT_REPORT_PATH,
  Phase5UatRecorder
} from './helpers/phase5UatRecorder'

const recorder = new Phase5UatRecorder(PHASE5_UAT_OUT_DIR)
let harnessOk = false
let suiteStartedAt = ''

const DESKTOP = { width: 1440, height: 900 }

async function waitForPlayHydrated(page: Page) {
  await page.getByText('载入修行档案').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {})
}

async function seedPhase5Fixture(page: Page, fixtureId: string) {
  const scenario = getPhase5UatFixture(fixtureId)
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(
    ({ metaKey, metaV1, playKey, saveV5, clearPlay, clearMeta }) => {
      if (clearMeta) {
        localStorage.removeItem(metaKey)
      }
      if (clearPlay) {
        localStorage.removeItem(playKey)
        localStorage.removeItem('kunxu_sim_save_v2')
        localStorage.removeItem('kunxu_act1_save')
      }
      if (metaV1) {
        localStorage.setItem(metaKey, JSON.stringify(metaV1))
      }
      if (saveV5) {
        localStorage.setItem(playKey, JSON.stringify(saveV5))
      }
    },
    {
      metaKey: META_SAVE_KEY,
      metaV1: scenario.metaV1,
      playKey: PLAY_SAVE_KEY,
      saveV5: scenario.saveV5,
      clearPlay: scenario.clearPlaySave ?? false,
      clearMeta: scenario.clearMeta ?? false
    }
  )
  await page.goto(scenario.path)
  await page.waitForLoadState('domcontentloaded')
  if (scenario.path === '/play') {
    await waitForPlayHydrated(page)
  }
  await page.locator(scenario.waitSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  return scenario
}

test.describe('Phase 5 meta multi-save · UAT 自动化', () => {
  test.beforeAll(() => {
    suiteStartedAt = new Date().toISOString()
    fs.mkdirSync(PHASE5_UAT_OUT_DIR, { recursive: true })
    const harnessOut = execSync('yarn harness:verify --quick 2>&1', {
      cwd: process.cwd(),
      encoding: 'utf8'
    })
    harnessOk = harnessOut.includes('HARNESS_OK')
    expect(harnessOut).toContain('HARNESS_OK')
  })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP)
  })

  test.afterAll(() => {
    recorder.writeMarkdown({
      startedAt: suiteStartedAt,
      finishedAt: new Date().toISOString(),
      harnessOk
    })
    if (fs.existsSync(PHASE5_UAT_REPORT_PATH)) {
      // eslint-disable-next-line no-console
      console.log(`Phase 5 UAT report: ${PHASE5_UAT_REPORT_PATH}`)
    }
  })

  test('UAT-1 FateCodexStrip mortgaged unlock + blurb (D-116)', async ({ page }) => {
    const name = 'FateCodexStrip mortgaged unlock'
    await seedPhase5Fixture(page, 'phase5-meta-codex-mortgaged')

    const archiveRegion = page.getByRole('region', { name: '账号档案' })
    await expect(archiveRegion).toBeVisible()
    await expect(page.locator('.FateCodexStrip')).toBeVisible()

    const mortgagedStamp = page.getByRole('button', { name: '抵押运行' })
    await expect(mortgagedStamp).toBeEnabled()
    await expect(mortgagedStamp).not.toHaveClass(/FateCodexStrip__stamp--locked/)

    const headJarStamp = page.getByRole('button', { name: '器藏维生' })
    await expect(headJarStamp).toBeDisabled()

    await expect(page.getByText(/命运档案\s+\d+\/7/)).toBeVisible()

    await recorder.capture(page, {
      testId: 1,
      testName: name,
      title: 'codex mortgaged unlocked',
      action: 'meta mortgaged seen → homepage codex',
      pass: true,
      viewport: `${DESKTOP.width}×${DESKTOP.height}`,
      assertions: ['账号档案 region', 'mortgaged stamp enabled', 'head_jar locked'],
      fileName: 'test-01-codex-mortgaged-unlocked.png'
    })

    await mortgagedStamp.click()
    const blurb = page.locator('.FateCodexStrip__blurb')
    await expect(blurb).toBeVisible()
    await expect(blurb).toContainText('抵押运行档')

    await recorder.capture(page, {
      testId: 1,
      testName: name,
      title: 'codex mortgaged blurb',
      action: '点击抵押运行 stamp → trauma blurb',
      pass: true,
      assertions: ['FateCodexStrip__blurb visible', '抵押运行档 blurb'],
      fileName: 'test-01-codex-mortgaged-blurb.png'
    })
  })

  test('UAT-2 TraumaArchiveChip after overlay dismiss (D-116)', async ({ page }) => {
    const name = 'TraumaArchiveChip after overlay'
    await seedPhase5Fixture(page, 'phase5-trauma-chip-overlay')

    await expect(page.locator('.FateUpdateOverlay')).toBeVisible()
    await expect(page.locator('.TraumaArchiveChip')).toHaveCount(0)

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: 'overlay before dismiss',
      action: 'fateUpdatePending → overlay visible, no chip',
      pass: true,
      fileName: 'test-02-overlay-before-dismiss.png'
    })

    const skipBtn = page.getByRole('button', { name: '跳过' })
    await skipBtn.waitFor({ state: 'visible', timeout: 8_000 })
    await skipBtn.click()

    await expect(page.locator('.FateUpdateOverlay')).toHaveCount(0)
    const chip = page.locator('.TraumaArchiveChip')
    await expect(chip).toBeVisible()
    await expect(chip).toContainText('创伤档案归档')
    await expect(chip).toContainText('抵押运行')

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: 'trauma chip after dismiss',
      action: '跳过 overlay → TraumaArchiveChip',
      pass: true,
      assertions: ['overlay gone', 'TraumaArchiveChip visible', '创伤档案归档 copy'],
      fileName: 'test-02-trauma-chip-visible.png'
    })

    await page.getByRole('button', { name: '跳过' }).click()
    await expect(chip).toHaveCount(0)

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: 'chip dismissed',
      action: '跳过 trauma chip',
      pass: true,
      fileName: 'test-02-trauma-chip-dismissed.png'
    })
  })

  test('UAT-3 StartBundlePicker 抵押档案副本 (META-03)', async ({ page }) => {
    const name = 'StartBundlePicker demo bundle'
    await seedPhase5Fixture(page, 'phase5-start-bundle-picker')

    const bundleRow = page.locator('.StartBundleRow')
    await expect(bundleRow).toBeVisible()
    await expect(page.getByRole('button', { name: /携带条款包/ })).toBeVisible()

    await recorder.capture(page, {
      testId: 3,
      testName: name,
      title: 'bundle row collapsed',
      action: 'meta bundle catalog → 携带条款包 row',
      pass: true,
      fileName: 'test-03-bundle-row.png'
    })

    await page.getByRole('button', { name: /携带条款包/ }).click()
    await expect(page.getByRole('radio', { name: /抵押档案副本/ })).toBeVisible()
    await page.getByRole('radio', { name: /抵押档案副本/ }).click()

    await recorder.capture(page, {
      testId: 3,
      testName: name,
      title: 'bundle expanded selected',
      action: '展开 → 抵押档案副本',
      pass: true,
      assertions: ['StartBundleRow expanded', '抵押档案副本 radio'],
      fileName: 'test-03-bundle-selected.png'
    })
  })

  test('UAT-4 Harness fate-meta-unlock', async ({ page }) => {
    await seedPhase5Fixture(page, 'phase5-meta-codex-mortgaged')
    await recorder.capture(page, {
      testId: 4,
      testName: 'Harness fate-meta-unlock',
      title: 'harness:verify --quick',
      action: 'beforeAll yarn harness:verify --quick',
      pass: harnessOk,
      assertions: ['HARNESS_OK', 'fate-meta-unlock contract'],
      fileName: 'test-04-harness-ok.png'
    })
  })
})
