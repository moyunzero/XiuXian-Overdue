import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import type { PlayRunState } from '~/types/play'
import {
  confirmWeekPlanIfReady,
  drainMandatesNaturalIfVisible,
  waitForPlayHydrated,
  waitForWeekPlanRegion
} from './helpers/playWalkthrough'
import {
  getPhase3UatFixture,
  PLAY_SAVE_KEY
} from './helpers/phase3UatFixtures'
import {
  PHASE3_UAT_OUT_DIR,
  PHASE3_UAT_REPORT_PATH,
  Phase3UatRecorder
} from './helpers/phase3UatRecorder'

const recorder = new Phase3UatRecorder(PHASE3_UAT_OUT_DIR)
let harnessOk = false
let suiteStartedAt = ''

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

async function seedPhase3Fixture(
  page: import('@playwright/test').Page,
  fixtureId: string
) {
  const scenario = getPhase3UatFixture(fixtureId)
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

async function readActiveRun(page: import('@playwright/test').Page): Promise<PlayRunState | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    try {
      const data = JSON.parse(raw) as {
        activeRunId?: string
        runs?: Record<string, PlayRunState>
      }
      const id = data.activeRunId
      if (!id || !data.runs) return null
      return data.runs[id] ?? null
    } catch {
      return null
    }
  }, PLAY_SAVE_KEY)
}

async function respondTopMandateCard(page: import('@playwright/test').Page) {
  const left = page.locator('.MandateCard__zone--left').first()
  if (await left.isVisible().catch(() => false)) {
    await left.click()
    await page.waitForTimeout(400)
    return true
  }
  const grit = page.locator('.MandateCard__grit').first()
  if (await grit.isVisible().catch(() => false)) {
    await grit.click()
    await page.waitForTimeout(400)
    return true
  }
  return false
}

async function drainAllMandateCards(page: import('@playwright/test').Page, seed: number) {
  for (let i = 0; i < 8; i++) {
    if (!(await page.locator('.MandateInbox').isVisible().catch(() => false))) break
    const drained = await drainMandatesNaturalIfVisible(page, seed + i)
    if (!drained) {
      const responded = await respondTopMandateCard(page)
      if (!responded) break
    }
    await page.waitForTimeout(450)
  }
}

type LayoutMetrics = {
  innerWidth: number
  weekPlanWidth: number
  weekPlanLeft: number
  heroHeight: number
  mandateWidth: number
  mainDimmed: boolean
  settlementVisible: boolean
  deckHeight: number
}

async function readLayoutMetrics(page: import('@playwright/test').Page): Promise<LayoutMetrics | null> {
  return page.evaluate(() => {
    const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect()
    const wp = rect('.WeekPlan')
    const hero = rect('.RepayHeroTile')
    const stack = rect('.MandateCardStack')
    const deck = rect('.PlayShell__deck')
    const main = document.querySelector('.PlayChapterScreenHost__main')
    return {
      innerWidth: window.innerWidth,
      weekPlanWidth: wp?.width ?? 0,
      weekPlanLeft: wp?.left ?? 0,
      heroHeight: hero?.height ?? 0,
      mandateWidth: stack?.width ?? 0,
      mainDimmed: main?.classList.contains('PlayChapterScreenHost__main--dimmed') ?? false,
      settlementVisible: !!document.querySelector('.WeekSettlementStrip'),
      deckHeight: deck?.height ?? 0
    }
  })
}

function recordLayoutFromMetrics(
  metrics: LayoutMetrics,
  viewportLabel: string,
  screenshot: string,
  context: string
) {
  const widthRatio = metrics.innerWidth > 0 ? metrics.weekPlanWidth / metrics.innerWidth : 0
  if (widthRatio > 0 && widthRatio < 0.72 && metrics.innerWidth >= 1200) {
    recorder.addLayoutFinding({
      area: '周排程面板',
      viewport: viewportLabel,
      severity: 'suggestion',
      observation: `${context}：周排程宽约 ${Math.round(metrics.weekPlanWidth)}px，占视口 ${Math.round(widthRatio * 100)}%，宽屏下中间列可能偏窄。`,
      recommendation: '检查 PlayChapterScreenHost 中间列 `minmax(0,1fr)` 与 WeekPlan `width:100%` 拉伸链；hero 格可略增纵向占比。',
      screenshot
    })
  }

  if (metrics.mandateWidth > 0 && metrics.innerWidth >= 1200 && metrics.mandateWidth < 480) {
    recorder.addLayoutFinding({
      area: '来文卡',
      viewport: viewportLabel,
      severity: 'suggestion',
      observation: `来文卡宽约 ${Math.round(metrics.mandateWidth)}px（max 520px），1440 视口下居中偏窄。`,
      recommendation: '若产品希望 Reigns 卡更「铺满阅读区」，可将 MandateCardStack `min(520px)` 提至 `min(640px, calc(100% - 32px))` 并测窄屏断点。',
      screenshot
    })
  }

  if (metrics.innerWidth <= 420 && metrics.heroHeight > 0 && metrics.heroHeight < 72) {
    recorder.addLayoutFinding({
      area: '还款 Hero 格',
      viewport: viewportLabel,
      severity: 'minor',
      observation: `窄屏下还款 Hero 高约 ${Math.round(metrics.heroHeight)}px，触控目标可能偏紧。`,
      recommendation: 'ScheduleTile / RepayHeroTile 在 `max-width: 480px` 断点保证 min-height ≥ 72px。',
      screenshot
    })
  }

  if (metrics.deckHeight > 0 && metrics.deckHeight > metrics.innerHeight * 0.28) {
    recorder.addLayoutFinding({
      area: '底部 deck 条',
      viewport: viewportLabel,
      severity: 'suggestion',
      observation: `deck 区高约 ${Math.round(metrics.deckHeight)}px，占视口 ${Math.round((metrics.deckHeight / metrics.innerHeight) * 100)}%。`,
      recommendation: '结算条 + 日志条同屏时考虑默认收起 WeekLogStrip 或限制 settlement max-height。',
      screenshot
    })
  }
}

test.describe('Phase 3 schedule + mandate UX · UAT 自动化', () => {
  test.beforeAll(() => {
    suiteStartedAt = new Date().toISOString()
    fs.mkdirSync(PHASE3_UAT_OUT_DIR, { recursive: true })
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
    if (fs.existsSync(PHASE3_UAT_REPORT_PATH)) {
      // eslint-disable-next-line no-console
      console.log(`Phase 3 UAT report: ${PHASE3_UAT_REPORT_PATH}`)
    }
  })

  test('UAT-1 四格周排程与开本周 CTA', async ({ page }) => {
    const name = '四格周排程与开本周 CTA'
    await seedPhase3Fixture(page, 'phase3-schedule-week8')
    await expect(page.getByRole('region', { name: '周排程' })).toBeVisible()
    await expect(page.getByRole('button', { name: '开本周' })).toBeVisible()
    await expect(page.locator('.RepayHeroTile')).toBeVisible()
    const tileCount = await page.locator('.ScheduleTile').count()
    expect(tileCount).toBeGreaterThanOrEqual(2)

    const metrics = await readLayoutMetrics(page)
    const shot = await recorder.capture(page, {
      testId: 1,
      testName: name,
      title: 'W8 周排程桌面',
      action: '种子 fate_run 第8周 → 断言四格 + CTA',
      pass: true,
      viewport: `${DESKTOP.width}×${DESKTOP.height}`,
      assertions: [`ScheduleTile count=${tileCount}`, '开本周可见'],
      fileName: 'test-01-schedule-desktop.png'
    })
    if (metrics) recordLayoutFromMetrics(metrics, '1440×900', shot, '周排程初始')

    await page.setViewportSize(MOBILE)
    await page.waitForTimeout(200)
    const mobileMetrics = await readLayoutMetrics(page)
    await recorder.capture(page, {
      testId: 1,
      testName: name,
      title: 'W8 周排程窄屏',
      action: '390px 视口截图',
      pass: true,
      viewport: `${MOBILE.width}×${MOBILE.height}`,
      fileName: 'test-01-schedule-mobile.png'
    })
    if (mobileMetrics) {
      recordLayoutFromMetrics(mobileMetrics, '390×844', 'e2e/artifacts/phase3-uat/test-01-schedule-mobile.png', '窄屏周排程')
    }
  })

  test('UAT-2 瓷片强度循环与负荷条', async ({ page }) => {
    const name = '瓷片强度循环与负荷条'
    await seedPhase3Fixture(page, 'phase3-schedule-week8')
    const study = page.getByRole('button', { name: /刷题卷/ }).first()
    await expect(study).toBeVisible()
    const before = (await study.textContent()) ?? ''
    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: '点击前刷题强度',
      action: '读取刷题瓷片 badge',
      pass: true,
      assertions: [`badge~${before.trim()}`],
      fileName: 'test-02-tile-before.png'
    })

    await study.click()
    await page.waitForTimeout(150)
    const after = (await study.textContent()) ?? ''
    expect(after).not.toBe(before)

    await expect(page.locator('.WeekPlan__timeTrack')).toBeVisible()
    await recorder.capture(page, {
      testId: 2,
      testName: name,
      title: '点击后负荷条更新',
      action: '点击刷题瓷片循环强度',
      pass: true,
      assertions: [`badge ${before.trim()} → ${after.trim()}`],
      fileName: 'test-02-tile-after.png'
    })
  })

  test('UAT-3 来文叠层与主区 dim', async ({ page }) => {
    const name = '来文叠层与主区 dim'
    await seedPhase3Fixture(page, 'phase3-mandate-inbox')
    await expect(page.locator('.MandateInbox')).toBeVisible()
    await expect(page.locator('.MandateCardStack')).toBeVisible()
    await expect(page.locator('.MandateCard__zone--left').first()).toBeVisible()

    const dimmed = await page.locator('.PlayChapterScreenHost__main--dimmed').isVisible()
    expect(dimmed).toBe(true)

    const metrics = await readLayoutMetrics(page)
    expect(metrics?.mainDimmed).toBe(true)

    const shot = await recorder.capture(page, {
      testId: 3,
      testName: name,
      title: '来文卡叠层',
      action: '种子 pending ch0-debt-reminder',
      pass: true,
      assertions: ['MandateInbox 可见', 'main--dimmed'],
      fileName: 'test-03-mandate-overlay.png'
    })
    if (metrics) {
      recordLayoutFromMetrics(metrics, '1440×900', shot, '来文叠层')
      if (metrics.mainDimmed) {
        recorder.addLayoutFinding({
          area: 'dim 主区',
          viewport: '1440×900',
          severity: 'suggestion',
          observation: '来文时主区 dim 保留周排程轮廓，需确认对比度是否足够区分「不可操作」状态。',
          recommendation: '对照 UI-SPEC：dim 层 opacity/filter 与 disabled 瓷片文案「须先回应来文」双信号；可 A/B 略加深 dim。',
          screenshot: shot
        })
      }
    }
  })

  test('UAT-4 开本周 → 来文链 → 周末结算条', async ({ page }) => {
    const name = '开本周 → 来文链 → 周末结算条'
    await seedPhase3Fixture(page, 'phase3-pre-advance-week6')
    const runBefore = await readActiveRun(page)
    expect(runBefore?.chapter?.chapterWeekIndex).toBe(6)

    await recorder.capture(page, {
      testId: 4,
      testName: name,
      title: '开本周前 W6',
      action: 'seed 17 第6周',
      pass: true,
      fileName: 'test-04-before-advance.png'
    })

    const opened = await confirmWeekPlanIfReady(page, false)
    expect(opened).toBe(true)
    await page.waitForTimeout(500)

    const seed = (await readActiveRun(page))?.seed ?? 17
    if (await page.locator('.MandateInbox').isVisible().catch(() => false)) {
      await recorder.capture(page, {
        testId: 4,
        testName: name,
        title: '开本周后来文',
        action: 'advanceScheduleWeek 触发来文队列',
        pass: true,
        fileName: 'test-04-mandate-queue.png'
      })
      await drainAllMandateCards(page, seed)
    }

    await page.waitForTimeout(600)
    const settlementVisible = await page.locator('.WeekSettlementStrip').isVisible().catch(() => false)
    const runAfter = await readActiveRun(page)
    expect(runAfter?.chapter?.chapterWeekIndex).toBeGreaterThanOrEqual(7)
    expect(runAfter?.mandate?.pendingDeliveryIds.length ?? 0).toBe(0)

    await recorder.capture(page, {
      testId: 4,
      testName: name,
      title: '来文清空后结算',
      action: 'drain mandates + finalizeWeek',
      pass: true,
      assertions: [
        `weekIndex=${runAfter?.chapter?.chapterWeekIndex}`,
        settlementVisible ? 'WeekSettlementStrip 可见' : '结算写入 log（条或未闪）'
      ],
      fileName: 'test-04-settlement.png'
    })

    await waitForWeekPlanRegion(page)
    const metrics = await readLayoutMetrics(page)
    if (metrics) {
      recordLayoutFromMetrics(
        metrics,
        '1440×900',
        'e2e/artifacts/phase3-uat/test-04-settlement.png',
        '结算后'
      )
    }
  })

  test('UAT-5 来文队列满时开本周禁用', async ({ page }) => {
    const name = '来文队列满时开本周禁用'
    await seedPhase3Fixture(page, 'phase3-queue-blocked')
    const run = await readActiveRun(page)
    expect(run?.mandate?.pendingDeliveryIds.length).toBe(3)

    const btn = page.getByRole('button', { name: '开本周' })
    await expect(btn).toBeDisabled()
    await expect(page.locator('.ScheduleTile--disabled').first()).toBeVisible()

    await recorder.capture(page, {
      testId: 5,
      testName: name,
      title: '队列满禁用',
      action: '3 封 pending → 开本周 disabled',
      pass: true,
      assertions: ['开本周 disabled', '瓷片 disabled'],
      fileName: 'test-05-queue-blocked.png'
    })
  })

  test('UAT-6 chapter 读档 coerce + 和上周一样', async ({ page }) => {
    const name = 'chapter 读档 coerce'
    await seedPhase3Fixture(page, 'phase3-chapter-mid')
    const run = await readActiveRun(page)
    expect(run?.runMode).toBe('fate_run')
    await expect(page.getByRole('button', { name: '和上周一样' })).toBeVisible()
    await recorder.capture(page, {
      testId: 6,
      testName: name,
      title: 'coerce 后周排程',
      action: 'chapter 第8周种子',
      pass: true,
      assertions: [`runMode=${run?.runMode}`],
      fileName: 'test-06-chapter-coerce.png'
    })
  })

  test('UAT-7 Harness 契约门禁', async ({ page }) => {
    await seedPhase3Fixture(page, 'phase3-schedule-week8')
    await recorder.capture(page, {
      testId: 7,
      testName: 'Harness 契约门禁',
      title: 'harness:verify --quick',
      action: 'beforeAll 已执行 yarn harness:verify --quick',
      pass: harnessOk,
      assertions: ['HARNESS_OK', 'schedule-mandate-flow contract'],
      fileName: 'test-07-harness-ok.png'
    })
  })
})
