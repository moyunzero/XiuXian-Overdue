import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { getPhase6UatFixture, PLAY_SAVE_KEY } from './helpers/phase6UatFixtures'
import {
  PHASE6_UAT_OUT_DIR,
  PHASE6_UAT_REPORT_PATH,
  Phase6UatRecorder
} from './helpers/phase6UatRecorder'

const recorder = new Phase6UatRecorder(PHASE6_UAT_OUT_DIR)
let harnessOk = false
let suiteStartedAt = ''

const DESKTOP = { width: 1440, height: 900 }

async function waitForPlayHydrated(page: Page) {
  await page.getByText('载入修行档案').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {})
}

type ActiveRunSlice = {
  primaryFate?: string
  runMode?: string
  ghostLedger?: { yangDebtCarried?: number; mingCoin?: number }
  setpiece?: { fateUpdatePending?: { to?: string; from?: string } }
  chapter?: { chapterWeekIndex?: number }
  logs?: string[]
  mandate?: { pendingDeliveryIds?: string[] }
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

async function seedPhase6Fixture(page: Page, fixtureId: string) {
  const scenario = getPhase6UatFixture(fixtureId)
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

async function prepareGhostBoundWeekPlan(page: Page) {
  const austerity = page.getByRole('radio', { name: /紧缩/ })
  const sustain = page.getByRole('radio', { name: /维持/ })
  if (await austerity.isVisible().catch(() => false)) {
    await austerity.click()
  } else if (await sustain.isVisible().catch(() => false)) {
    await sustain.click()
  }
  const job = page.getByRole('option', { name: /阳巡值守/ })
  if (await job.isVisible().catch(() => false)) {
    await job.click()
  }
  await page.waitForTimeout(150)
}

async function drainMandateQueue(page: Page) {
  for (let i = 0; i < 6; i++) {
    if (!(await page.locator('.MandateInbox').isVisible().catch(() => false))) break
    const left = page.locator('.MandateCard__zone--left').first()
    if (await left.isVisible().catch(() => false)) {
      await left.click()
      await page.waitForTimeout(500)
      continue
    }
    break
  }
}

test.describe('Phase 6 ghost dual-ledger · UAT 自动化', () => {
  test.beforeAll(() => {
    suiteStartedAt = new Date().toISOString()
    fs.mkdirSync(PHASE6_UAT_OUT_DIR, { recursive: true })
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
    if (fs.existsSync(PHASE6_UAT_REPORT_PATH)) {
      // eslint-disable-next-line no-console
      console.log(`Phase 6 UAT report: ${PHASE6_UAT_REPORT_PATH}`)
    }
  })

  test('UAT-1 阴司召令来文 inbox', async ({ page }) => {
    const name = '阴司召令来文 inbox'
    const scenario = await seedPhase6Fixture(page, 'phase6-ghost-summon-pending')
    const run = await readActiveRun(page)
    expect(run?.primaryFate).toBe('head_jar')

    await expect(page.locator('.MandateInbox')).toBeVisible()
    await expect(page.getByText('阴司 · 召令登记')).toBeVisible()
    await expect(page.getByRole('button', { name: '确认出席', exact: true })).toBeVisible()

    await recorder.capture(page, {
      testId: 1,
      testName: name,
      title: 'summon mandate inbox',
      action: `种子 ${scenario.id}`,
      pass: true,
      viewport: `${DESKTOP.width}×${DESKTOP.height}`,
      assertions: [
        `primaryFate=${run?.primaryFate}`,
        'MandateInbox visible',
        '确认出席 CTA'
      ],
      fileName: 'test-01-ghost-summon-inbox.png'
    })
  })

  test('UAT-2 来文链 → 灵籍更新 overlay', async ({ page }) => {
    const name = '来文链 → 灵籍更新 overlay'
    await seedPhase6Fixture(page, 'phase6-ghost-summon-pending')

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: 'summon before ack',
      action: '召令待回应',
      pass: true,
      fileName: 'test-02-before-ack-summons.png'
    })

    await page.locator('.MandateCard__zone--left').click()
    await page.waitForTimeout(500)
    await expect(page.getByText('冥司 · 绑定登记')).toBeVisible()

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: 'bind mandate queued',
      action: '确认出席 → 绑定来文',
      pass: true,
      fileName: 'test-02-bind-mandate.png'
    })

    await page.locator('.MandateCard__zone--left').click()
    await page.waitForTimeout(500)

    await expect(page.locator('.FateUpdateOverlay')).toBeVisible()
    await expect(page.getByText('主形态：绑定幽影')).toBeVisible()
    await expect(page.getByText(/双账并行结算/)).toBeVisible()

    const runOverlay = await readActiveRun(page)
    expect(runOverlay?.primaryFate).toBe('ghost_bound')
    expect(runOverlay?.setpiece?.fateUpdatePending?.to).toBe('ghost_bound')

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: 'ghost_bound overlay',
      action: '接受绑定 → FateUpdateOverlay',
      pass: true,
      assertions: ['primaryFate=ghost_bound', '双账正文'],
      fileName: 'test-02-ghost-overlay.png'
    })

    const skipBtn = page.getByRole('button', { name: '跳过' })
    await skipBtn.waitFor({ state: 'visible', timeout: 8_000 })
    await skipBtn.click()
    await page.waitForTimeout(400)

    await expect(page.locator('.FateUpdateOverlay')).toHaveCount(0)
    await expect(page.locator('.DelegationPanel')).toBeVisible()

    const runAfter = await readActiveRun(page)
    expect(runAfter?.setpiece?.fateUpdatePending).toBeUndefined()

    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: 'overlay dismissed',
      action: '跳过 overlay → DelegationPanel',
      pass: true,
      fileName: 'test-02-overlay-dismissed.png'
    })
  })

  test('UAT-3 冥籍绑定委托面板与双账标签', async ({ page }) => {
    const name = '冥籍绑定委托面板与双账标签'
    const scenario = await seedPhase6Fixture(page, 'phase6-ghost-bound-playable')
    const run = await readActiveRun(page)
    expect(run?.primaryFate).toBe('ghost_bound')

    await expect(page.locator('.PlayShell--fate-ghost-bound')).toBeVisible()
    await expect(page.locator('.DelegationPanel')).toBeVisible()
    await expect(page.getByText('冥籍绑定')).toBeVisible()
    await expect(page.getByText('本周阴司工单')).toBeVisible()
    await expect(page.getByText('人账阳债')).toBeVisible()
    await expect(page.getByText('鬼账冥币')).toBeVisible()
    await expect(page.locator('.WeekPlan')).toHaveCount(0)

    await recorder.capture(page, {
      testId: 3,
      testName: name,
      title: 'delegation panel dual labels',
      action: `种子 ${scenario.id}`,
      pass: true,
      assertions: [
        'PlayShell--fate-ghost-bound',
        '冥籍绑定 / 人账阳债 / 鬼账冥币'
      ],
      fileName: 'test-03-ghost-delegation-panel.png'
    })
  })

  test('UAT-4 开本周 → 双账周末结算 / 流水', async ({ page }) => {
    const name = '开本周 → 双账周末结算 / 流水'
    await seedPhase6Fixture(page, 'phase6-ghost-bound-playable')

    await prepareGhostBoundWeekPlan(page)

    await recorder.capture(page, {
      testId: 4,
      testName: name,
      title: 'plan selected',
      action: '紧缩 + 阳巡值守',
      pass: true,
      fileName: 'test-04-week-plan-selected.png'
    })

    const weekBtn = page.getByRole('button', { name: '开本周' })
    await expect(weekBtn).toBeEnabled()
    await weekBtn.click()
    await page.waitForTimeout(700)

    if (await page.locator('.MandateInbox').isVisible().catch(() => false)) {
      await drainMandateQueue(page)
    }

    await page.waitForTimeout(500)
    const settlementVisible = await page.locator('.WeekSettlementStrip').isVisible().catch(() => false)
    const runAfter = await readActiveRun(page)
    const logs = runAfter?.logs ?? []
    const hasLedgerLog =
      logs.some((l) => l.includes('阳债')) && logs.some((l) => l.includes('冥币'))
    const hasLedgerStrip =
      settlementVisible &&
      (await page.getByText(/^人账：/).isVisible().catch(() => false)) &&
      (await page.getByText(/^鬼账：/).isVisible().catch(() => false))

    expect(runAfter?.chapter?.chapterWeekIndex ?? 0).toBeGreaterThan(14)
    expect(hasLedgerLog || hasLedgerStrip).toBe(true)

    await recorder.capture(page, {
      testId: 4,
      testName: name,
      title: 'after week advance',
      action: '开本周 + drain mandates',
      pass: true,
      assertions: [
        `weekIndex=${runAfter?.chapter?.chapterWeekIndex}`,
        settlementVisible ? 'WeekSettlementStrip 人账/鬼账' : 'logs 阳债+冥币',
        `ledgerLog=${hasLedgerLog}`
      ],
      fileName: 'test-04-week-settlement.png'
    })
  })

  test('UAT-5 WeekPressureRail 阳债冥币', async ({ page }) => {
    const name = 'WeekPressureRail 阳债冥币'
    const scenario = await seedPhase6Fixture(page, 'phase6-ghost-bound-after-week')
    const run = await readActiveRun(page)
    expect(run?.primaryFate).toBe('ghost_bound')
    expect(run?.ghostLedger?.yangDebtCarried).toBeGreaterThan(0)

    const rail = page.locator('.WeekPressureRail__dualLedger')
    await expect(rail).toBeVisible()
    await expect(rail.getByText('阳债')).toBeVisible()
    await expect(rail.getByText('冥币')).toBeVisible()

    await recorder.capture(page, {
      testId: 5,
      testName: name,
      title: 'dual ledger rail',
      action: `种子 ${scenario.id}`,
      pass: true,
      assertions: [
        `yangDebt=${run?.ghostLedger?.yangDebtCarried}`,
        `mingCoin=${run?.ghostLedger?.mingCoin}`
      ],
      fileName: 'test-05-dual-ledger-rail.png'
    })
  })

  test('UAT-6 Harness ghost-bound-flow', async ({ page }) => {
    await seedPhase6Fixture(page, 'phase6-ghost-bound-playable')
    await recorder.capture(page, {
      testId: 6,
      testName: 'Harness ghost-bound-flow',
      title: 'harness:verify --quick',
      action: 'beforeAll yarn harness:verify --quick',
      pass: harnessOk,
      assertions: ['HARNESS_OK', 'ghost-bound-flow contract'],
      fileName: 'test-06-harness-ok.png'
    })
  })
})
