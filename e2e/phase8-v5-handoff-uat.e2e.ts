import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import {
  META_SAVE_KEY,
  PLAY_SAVE_KEY,
  resolvePhase8Seed
} from './helpers/phase8UatFixtures'
import {
  PHASE8_UAT_OUT_DIR,
  PHASE8_UAT_REPORT_PATH,
  Phase8UatRecorder
} from './helpers/phase8UatRecorder'

const recorder = new Phase8UatRecorder(PHASE8_UAT_OUT_DIR)
let harnessOk = false
let suiteStartedAt = ''

const DESKTOP = { width: 1440, height: 900 }

async function waitForPlayHydrated(page: Page) {
  await page.getByText('载入修行档案').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {})
}

async function seedPhase8Scenario(page: Page, scenarioId: string) {
  const seed = resolvePhase8Seed(scenarioId)
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(
    ({ playKey, metaKey, saveV5, metaV1 }) => {
      localStorage.removeItem('kunxu_sim_save_v5')
      localStorage.removeItem('kunxu_sim_save_v2')
      localStorage.removeItem('kunxu_act1_save')
      localStorage.removeItem(metaKey)
      if (metaV1) localStorage.setItem(metaKey, JSON.stringify(metaV1))
      if (saveV5) localStorage.setItem(playKey, JSON.stringify(saveV5))
    },
    {
      playKey: PLAY_SAVE_KEY,
      metaKey: META_SAVE_KEY,
      saveV5: seed.saveV5,
      metaV1: seed.metaV1
    }
  )
  await page.goto(seed.path)
  await page.waitForLoadState('domcontentloaded')
  if (seed.path === '/play') await waitForPlayHydrated(page)
  await page.locator(seed.waitSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  return seed
}

test.describe('Phase 8 v5 handoff · UAT', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(() => {
    suiteStartedAt = new Date().toISOString()
    fs.mkdirSync(PHASE8_UAT_OUT_DIR, { recursive: true })
    const out = execSync('yarn harness:verify --full', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    harnessOk = out.includes('HARNESS_OK')
    expect(harnessOk).toBe(true)
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
    expect(fs.existsSync(PHASE8_UAT_REPORT_PATH)).toBe(true)
  })

  test('UAT-1 · meta codex', async ({ page }) => {
    const seed = await seedPhase8Scenario(page, 'phase8-meta-codex')
    await expect(page.locator('.FateCodexStrip')).toBeVisible()
    await recorder.capture(page, {
      testId: 1,
      testName: seed.scenario.label,
      title: 'meta-codex',
      action: seed.scenario.checklistRef,
      pass: true,
      viewport: `${DESKTOP.width}×${DESKTOP.height}`,
      fileName: 'test-01-meta-codex.png'
    })
  })

  test('UAT-2 · M1 dashboard', async ({ page }) => {
    const seed = await seedPhase8Scenario(page, 'phase8-m1-dashboard')
    await expect(page.locator('.WeekPlan')).toBeVisible()
    await recorder.capture(page, {
      testId: 2,
      testName: seed.scenario.label,
      title: 'm1-dashboard',
      action: seed.scenario.checklistRef,
      pass: true,
      fileName: 'test-02-m1-dashboard.png'
    })
  })

  test('UAT-3 · mandate inbox', async ({ page }) => {
    const seed = await seedPhase8Scenario(page, 'phase8-mandate-inbox')
    await expect(page.locator('.MandateInbox')).toBeVisible()
    await recorder.capture(page, {
      testId: 3,
      testName: seed.scenario.label,
      title: 'mandate-inbox',
      action: seed.scenario.checklistRef,
      pass: true,
      fileName: 'test-03-mandate-inbox.png'
    })
  })

  test('UAT-4 · fate overlay', async ({ page }) => {
    const seed = await seedPhase8Scenario(page, 'phase8-fate-overlay')
    const overlay = page.locator('.FateUpdateOverlay')
    await expect(overlay).toBeVisible()
    await recorder.capture(page, {
      testId: 4,
      testName: seed.scenario.label,
      title: 'overlay-before',
      action: seed.scenario.checklistRef,
      pass: true,
      fileName: 'test-04-overlay-before.png'
    })
    const skipBtn = page.getByRole('button', { name: '跳过' })
    await skipBtn.waitFor({ state: 'visible', timeout: 8_000 })
    await skipBtn.click()
    await expect(overlay).toHaveCount(0)
    await expect(page.locator('.WeekPlan')).toBeVisible()
    await recorder.capture(page, {
      testId: 4,
      testName: seed.scenario.label,
      title: 'overlay-dismissed',
      action: '跳过 → WeekPlan',
      pass: true,
      fileName: 'test-04-overlay-dismissed.png'
    })
  })

  test('UAT-5 · W40 continuity', async ({ page }) => {
    const seed = await seedPhase8Scenario(page, 'phase8-w40-continuity')
    await expect(page.locator('.WeekPlan')).toBeVisible()
    await expect(page.getByText('契约终局')).not.toBeVisible()
    await recorder.capture(page, {
      testId: 5,
      testName: seed.scenario.label,
      title: 'w40-no-finale',
      action: seed.scenario.checklistRef,
      pass: true,
      fileName: 'test-05-w40-continuity.png'
    })
  })

  test('UAT-6 · W41 M2', async ({ page }) => {
    const seed = await seedPhase8Scenario(page, 'phase8-w41-m2')
    await expect(page.locator('.WeekPlan')).toBeVisible()
    await recorder.capture(page, {
      testId: 6,
      testName: seed.scenario.label,
      title: 'w41-m2',
      action: seed.scenario.checklistRef,
      pass: true,
      fileName: 'test-06-w41-m2.png'
    })
  })

  test('UAT-7 · ghost_bound dual ledger', async ({ page }) => {
    const seed = await seedPhase8Scenario(page, 'phase8-ghost-bound')
    await expect(page.locator('.DelegationPanel')).toBeVisible()
    await recorder.capture(page, {
      testId: 7,
      testName: seed.scenario.label,
      title: 'ghost-bound-panel',
      action: seed.scenario.checklistRef,
      pass: true,
      fileName: 'test-07-ghost-bound.png'
    })
  })
})
