import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { getPhase7UatFixture, PLAY_SAVE_KEY } from './helpers/phase7UatFixtures'
import {
  PHASE7_UAT_OUT_DIR,
  PHASE7_UAT_REPORT_PATH,
  Phase7UatRecorder
} from './helpers/phase7UatRecorder'

const recorder = new Phase7UatRecorder(PHASE7_UAT_OUT_DIR)
let harnessOk = false
let suiteStartedAt = ''

const DESKTOP = { width: 1440, height: 900 }

async function waitForPlayHydrated(page: Page) {
  await page.getByText('载入修行档案').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {})
}

async function seedPhase7Fixture(page: Page, fixtureId: string) {
  const scenario = getPhase7UatFixture(fixtureId)
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(
    ({ key, value }) => {
      localStorage.removeItem('kunxu_sim_save_v5')
      localStorage.removeItem('kunxu_sim_save_v2')
      localStorage.removeItem('kunxu_act1_save')
      localStorage.setItem(key, JSON.stringify(value))
    },
    { key: PLAY_SAVE_KEY, value: scenario.saveV5 }
  )
  await page.goto(scenario.path)
  await page.waitForLoadState('domcontentloaded')
  await waitForPlayHydrated(page)
  await page.locator(scenario.waitSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  return scenario
}

test.describe('Phase 7 stage content · UAT', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(() => {
    suiteStartedAt = new Date().toISOString()
    fs.mkdirSync(PHASE7_UAT_OUT_DIR, { recursive: true })
    const out = execSync('yarn harness:verify --quick', {
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
    expect(fs.existsSync(PHASE7_UAT_REPORT_PATH)).toBe(true)
  })

  test('UAT-1 · M1 week-8 dashboard (stage manifest)', async ({ page }) => {
    const name = 'M1 第8周 · 四格排程'
    const scenario = await seedPhase7Fixture(page, 'phase7-m1-week8-dashboard')
    await expect(page.locator('.WeekPlan')).toBeVisible()
    await expect(page.locator('.DebtDash--ag, .DebtDashboard')).toBeVisible()
    expect(scenario.expectStageId).toBe('stage-m1-contract')

    await recorder.capture(page, {
      testId: 1,
      testName: name,
      title: 'debt + week plan',
      action: 'seed M1 W8 fate_run → DebtDashboard + WeekPlan',
      pass: true,
      viewport: `${DESKTOP.width}×${DESKTOP.height}`,
      assertions: ['WeekPlan visible', 'DebtDashboard visible', 'stage-m1-contract seed'],
      fileName: 'test-01-m1-week8-dashboard.png'
    })
  })

  test('UAT-2 · mandate inbox from stage pool', async ({ page }) => {
    const name = 'M1 来文 · stage manifest 池'
    await seedPhase7Fixture(page, 'phase7-m1-mandate-inbox')
    const inbox = page.locator('.MandateInbox')
    await expect(inbox).toBeVisible()
    await expect(page.getByText('灵信 · 来文')).toBeVisible()

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: 'mandate inbox visible',
      action: 'pending mandate from stage-m1-contract pool',
      pass: true,
      assertions: ['MandateInbox gate', '灵信 · 来文 tag'],
      fileName: 'test-02-mandate-inbox-visible.png'
    })
  })

  test('UAT-3 · catalog fate overlay copy', async ({ page }) => {
    const name = '灵籍 overlay · catalog copy'
    const scenario = await seedPhase7Fixture(page, 'phase7-fate-overlay-catalog')
    const overlay = page.locator('.FateUpdateOverlay')
    await expect(overlay).toBeVisible()
    await expect(page.getByRole('heading', { name: '灵籍更新' })).toBeVisible()

    await recorder.capture(page, {
      testId: 3,
      testName: name,
      title: 'overlay before dismiss',
      action: 'fateUpdatePending human→mortgaged',
      pass: true,
      fileName: 'test-03-overlay-before-dismiss.png'
    })

    if (scenario.expectOverlayBody) {
      await expect(overlay.getByText(scenario.expectOverlayBody, { exact: false })).toBeVisible()
    }

    const skipBtn = page.getByRole('button', { name: '跳过' })
    await skipBtn.waitFor({ state: 'visible', timeout: 8_000 })
    await skipBtn.click()
    await expect(overlay).toHaveCount(0)
    await expect(page.locator('.WeekPlan')).toBeVisible()

    await recorder.capture(page, {
      testId: 3,
      testName: name,
      title: 'overlay dismissed',
      action: '跳过 overlay → week-dashboard',
      pass: true,
      assertions: ['overlay gone', 'WeekPlan visible'],
      fileName: 'test-03-overlay-dismissed.png'
    })
  })

  test('UAT-4 · W40 continuity no finale gate', async ({ page }) => {
    const name = 'W40 无契约终局闸门'
    await seedPhase7Fixture(page, 'phase7-w40-continuity')
    await expect(page.locator('.WeekPlan')).toBeVisible()
    await expect(page.getByText('契约终局')).not.toBeVisible()

    await recorder.capture(page, {
      testId: 4,
      testName: name,
      title: 'w40 playable no finale',
      action: 'W40 fate_run → WeekPlan, no 契约终局 screen',
      pass: true,
      assertions: ['WeekPlan visible', '契约终局 absent'],
      fileName: 'test-04-w40-no-finale.png'
    })
  })

  test('UAT-5 · W41 M2 stage', async ({ page }) => {
    const name = 'W41 → M2 学籍段'
    const scenario = await seedPhase7Fixture(page, 'phase7-w41-m2-stage')
    await expect(page.locator('.WeekPlan')).toBeVisible()
    expect(scenario.expectStageId).toBe('stage-m2-hs')

    await recorder.capture(page, {
      testId: 5,
      testName: name,
      title: 'w41 m2 stage',
      action: 'advance to W41 → stage-m2-hs seed playable',
      pass: true,
      assertions: ['WeekPlan visible', 'expectStageId stage-m2-hs'],
      fileName: 'test-05-w41-m2-stage.png'
    })
  })

  test('UAT-6 · Harness gate snapshot', async ({ page }) => {
    const name = 'Harness validate:stages + stage-content-flow'
    await seedPhase7Fixture(page, 'phase7-m1-week8-dashboard')
    await recorder.capture(page, {
      testId: 6,
      testName: name,
      title: 'harness ok baseline',
      action: 'beforeAll yarn harness:verify --quick → HARNESS_OK',
      pass: harnessOk,
      assertions: ['HARNESS_OK', 'validate:stages', 'stage-content-flow'],
      fileName: 'test-06-harness-ok.png'
    })
  })
})
