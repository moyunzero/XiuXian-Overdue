import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { getPhase4UatFixture, PLAY_SAVE_KEY } from './helpers/phase4UatFixtures'
import {
  PHASE4_UAT_OUT_DIR,
  PHASE4_UAT_REPORT_PATH,
  Phase4UatRecorder
} from './helpers/phase4UatRecorder'

const recorder = new Phase4UatRecorder(PHASE4_UAT_OUT_DIR)
let harnessOk = false
let suiteStartedAt = ''

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

async function waitForPlayHydrated(page: Page) {
  await page.getByText('载入修行档案').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {})
}

type ActiveRunSlice = {
  primaryFate?: string
  runMode?: string
  setpiece?: { fateUpdatePending?: { to?: string } }
  chapter?: { chapterWeekIndex?: number }
}

async function readActiveRun(page: Page): Promise<ActiveRunSlice | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
      const data = JSON.parse(raw) as {
        activeRunId?: string
        runs?: Record<string, ActiveRunSlice>
      }
      const id = data.activeRunId
      if (!id || !data.runs) return null
      return data.runs[id] ?? null
    } catch {
      return null
    }
  }, PLAY_SAVE_KEY)
}

async function seedPhase4Fixture(page: Page, fixtureId: string) {
  const scenario = getPhase4UatFixture(fixtureId)
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(
    ({ key, value }) => {
      localStorage.removeItem('kunxu_sim_save_v5')
      localStorage.removeItem('kunxu_sim_save_v2')
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

test.describe('Phase 4 fate slice shells · UAT 自动化', () => {
  test.beforeAll(() => {
    suiteStartedAt = new Date().toISOString()
    fs.mkdirSync(PHASE4_UAT_OUT_DIR, { recursive: true })
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
    if (fs.existsSync(PHASE4_UAT_REPORT_PATH)) {
      // eslint-disable-next-line no-console
      console.log(`Phase 4 UAT report: ${PHASE4_UAT_REPORT_PATH}`)
    }
  })

  test('UAT-1 head_jar 委托面板与维生账单', async ({ page }) => {
    const name = 'head_jar 委托面板与维生账单'
    const scenario = await seedPhase4Fixture(page, 'phase4-head-jar-week8')
    const run = await readActiveRun(page)
    expect(run?.primaryFate).toBe('head_jar')

    await expect(page.locator('.DelegationPanel')).toBeVisible()
    await expect(page.locator('.MaintenanceBillPreview')).toBeVisible()
    await expect(page.getByRole('button', { name: '开本周' })).toBeVisible()
    await expect(page.locator('.PlayShell--fate-head-jar')).toBeVisible()
    await expect(page.locator('.MaintenanceTierTile')).toBeVisible()
    await expect(page.locator('.DelegationJobTile')).toBeVisible()
    await expect(page.locator('.WeekPlan')).toHaveCount(0)

    const shot = await recorder.capture(page, {
      testId: 1,
      testName: name,
      title: 'head_jar 桌面委托面板',
      action: `种子 ${scenario.id} → DelegationPanel + bill`,
      pass: true,
      viewport: `${DESKTOP.width}×${DESKTOP.height}`,
      assertions: [
        `primaryFate=${run?.primaryFate}`,
        'PlayShell--fate-head-jar',
        '无四格 WeekPlan'
      ],
      fileName: 'test-01-head-jar-desktop.png'
    })

    await page.setViewportSize(MOBILE)
    await page.waitForTimeout(200)
    await recorder.capture(page, {
      testId: 1,
      testName: name,
      title: 'head_jar 窄屏委托面板',
      action: '390px 视口截图',
      pass: true,
      viewport: `${MOBILE.width}×${MOBILE.height}`,
      fileName: 'test-01-head-jar-mobile.png'
    })

    if (shot) {
      recorder.addLayoutFinding({
        area: '委托双槽',
        viewport: '1440×900',
        severity: 'suggestion',
        observation: 'head_jar 仅两槽无四格 ghost，需确认宽屏下 bill + 双槽纵向节奏与 Phase 3 四格密度对比是否压迫感足够。',
        recommendation: '对照 04-UI-SPEC：维生账单预览应在开本周前占首屏注意力；窄屏断点检查双槽 min-height。',
        screenshot: 'e2e/artifacts/phase4-uat/test-01-head-jar-desktop.png'
      })
    }
  })

  test('UAT-2 head_jar 维生档与委托工单选择', async ({ page }) => {
    const name = 'head_jar 维生档与委托工单选择'
    await seedPhase4Fixture(page, 'phase4-head-jar-week8')

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: '选择前',
      action: '未选维生档/工单',
      pass: true,
      fileName: 'test-02-delegation-before.png'
    })

    await page.getByRole('radio', { name: /维持/ }).click()
    await page.getByRole('option', { name: /阳巡值守/ }).click()
    await page.waitForTimeout(150)

    await expect(page.locator('.MaintenanceTierTile__btn--on')).toBeVisible()
    await expect(page.locator('.DelegationJobTile__item--on')).toBeVisible()

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: '维持 + 阳巡值守',
      action: '点击维生维持档与阳巡值守工单',
      pass: true,
      assertions: ['MaintenanceTierTile--on', 'DelegationJobTile--on'],
      fileName: 'test-02-delegation-selected.png'
    })
  })

  test('UAT-3 mortgaged 四格排程与抽血换现', async ({ page }) => {
    const name = 'mortgaged 四格排程与抽血换现'
    await seedPhase4Fixture(page, 'phase4-mortgaged-mid')
    const run = await readActiveRun(page)
    expect(run?.primaryFate).toBe('mortgaged')

    await expect(page.locator('.WeekPlan')).toBeVisible()
    await expect(page.locator('.PlayShell--fate-mortgaged')).toBeVisible()
    await expect(page.locator('.ScheduleTile').first()).toBeVisible()
    await expect(page.getByRole('button', { name: '抽血换现' })).toBeVisible()
    await expect(page.locator('.WeekPressureRail--emphasis-debt')).toBeVisible()

    const tileCount = await page.locator('.ScheduleTile').count()
    expect(tileCount).toBeGreaterThanOrEqual(2)

    await recorder.capture(page, {
      testId: 3,
      testName: name,
      title: 'mortgaged 四格 + 抽血',
      action: '种子 mortgaged mid → WeekPlan + blood draw',
      pass: true,
      assertions: [
        `ScheduleTile count=${tileCount}`,
        'PlayShell--fate-mortgaged',
        'WeekPressureRail debt emphasis'
      ],
      fileName: 'test-03-mortgaged-four-tile.png'
    })
  })

  test('UAT-4 human 四格基线与 FateShell', async ({ page }) => {
    const name = 'human 四格基线与 FateShell'
    await seedPhase4Fixture(page, 'phase4-chapter-mid')
    const run = await readActiveRun(page)
    expect(run?.primaryFate).toBe('human')

    await expect(page.locator('.WeekPlan')).toBeVisible()
    await expect(page.locator('.PlayShell--fate-human')).toBeVisible()
    await expect(page.locator('.DelegationPanel')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '和上周一样' })).toBeVisible()

    await recorder.capture(page, {
      testId: 4,
      testName: name,
      title: 'human 四格基线',
      action: 'chapter coerce 第8周',
      pass: true,
      assertions: [`primaryFate=${run?.primaryFate}`, 'PlayShell--fate-human'],
      fileName: 'test-04-human-baseline.png'
    })
  })

  test('UAT-5 灵籍更新 overlay 与跳过', async ({ page }) => {
    const name = '灵籍更新 overlay 与跳过'
    await seedPhase4Fixture(page, 'phase4-fate-update-overlay')

    await expect(page.locator('.FateUpdateOverlay')).toBeVisible()
    await expect(page.getByRole('heading', { name: '灵籍更新' })).toBeVisible()

    await recorder.capture(page, {
      testId: 5,
      testName: name,
      title: 'overlay 初始',
      action: 'fateUpdatePending human→mortgaged',
      pass: true,
      fileName: 'test-05-fate-overlay.png'
    })

    const skipBtn = page.getByRole('button', { name: '跳过' })
    await skipBtn.waitFor({ state: 'visible', timeout: 8_000 })
    await skipBtn.click()
    await page.waitForTimeout(400)

    await expect(page.locator('.FateUpdateOverlay')).toHaveCount(0)
    await expect(page.locator('.WeekPlan')).toBeVisible()

    const runAfter = await readActiveRun(page)
    expect(runAfter?.setpiece?.fateUpdatePending).toBeUndefined()

    await recorder.capture(page, {
      testId: 5,
      testName: name,
      title: '跳过后周排程',
      action: '点击跳过 → week-dashboard',
      pass: true,
      assertions: ['fateUpdatePending cleared', 'WeekPlan visible'],
      fileName: 'test-05-fate-overlay-dismissed.png'
    })
  })

  test('UAT-6 head_jar WeekPressureRail 维生侧重', async ({ page }) => {
    const name = 'head_jar WeekPressureRail 维生侧重'
    await seedPhase4Fixture(page, 'phase4-head-jar-week8')

    const rail = page.locator('.WeekPressureRail--emphasis-vitality')
    await expect(rail).toBeVisible()
    await expect(rail.locator('.WeekPressureRail__meterLabel', { hasText: '完整度' }).first()).toBeVisible()
    await expect(rail.locator('.WeekPressureRail__meterLabel', { hasText: '维生账单' }).first()).toBeVisible()

    await recorder.capture(page, {
      testId: 6,
      testName: name,
      title: '维生侧栏 emphasis',
      action: 'head_jar → WeekPressureRail--emphasis-vitality',
      pass: true,
      assertions: ['完整度 meter', '维生账单 meter'],
      fileName: 'test-06-vitality-rail.png'
    })
  })

  test('UAT-7 Harness 契约门禁', async ({ page }) => {
    await seedPhase4Fixture(page, 'phase4-head-jar-week8')
    await recorder.capture(page, {
      testId: 7,
      testName: 'Harness 契约门禁',
      title: 'harness:verify --quick',
      action: 'beforeAll 已执行 yarn harness:verify --quick',
      pass: harnessOk,
      assertions: ['HARNESS_OK', 'fate-continuity-flow contract'],
      fileName: 'test-07-harness-ok.png'
    })
  })
})
