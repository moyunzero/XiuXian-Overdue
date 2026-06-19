import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import type { PlayRunState } from '~/types/play'
import {
  confirmWeekPlanIfReady,
  dismissChapterGateIfVisible,
  drainMandatesNaturalIfVisible,
  waitForPlayHydrated
} from './helpers/playWalkthrough'
import {
  getPhase2UatFixture,
  PLAY_SAVE_KEY
} from './helpers/phase2UatFixtures'
import {
  PHASE2_UAT_OUT_DIR,
  PHASE2_UAT_REPORT_PATH,
  Phase2UatRecorder
} from './helpers/phase2UatRecorder'

const recorder = new Phase2UatRecorder(PHASE2_UAT_OUT_DIR)
let harnessOk = false
let suiteStartedAt = ''

async function seedPhase2Fixture(
  page: import('@playwright/test').Page,
  fixtureId: string
) {
  const scenario = getPhase2UatFixture(fixtureId)
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

async function advanceOneWeekViaUi(page: import('@playwright/test').Page) {
  const seed = (await readActiveRun(page))?.seed ?? 1
  for (let round = 0; round < 6; round++) {
    let acted = false
    acted = (await dismissChapterGateIfVisible(page)) || acted
    for (let m = 0; m < 4; m++) {
      if (!(await page.locator('.MandateInbox').isVisible().catch(() => false))) break
      acted = (await drainMandatesNaturalIfVisible(page, seed + m)) || acted
    }
    const confirmed = await confirmWeekPlanIfReady(page, false)
    if (confirmed) return true
    if (!acted) break
  }
  return false
}

test.describe('Phase 2 milestoneWeekFlow · UAT 自动化', () => {
  test.beforeAll(() => {
    suiteStartedAt = new Date().toISOString()
    fs.mkdirSync(PHASE2_UAT_OUT_DIR, { recursive: true })
    const harnessOut = execSync('yarn harness:verify --quick 2>&1', {
      cwd: process.cwd(),
      encoding: 'utf8'
    })
    harnessOk = harnessOut.includes('HARNESS_OK')
    expect(harnessOut).toContain('HARNESS_OK')
  })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  test.afterAll(() => {
    recorder.writeMarkdown({
      startedAt: suiteStartedAt,
      finishedAt: new Date().toISOString(),
      harnessOk
    })
    if (fs.existsSync(PHASE2_UAT_REPORT_PATH)) {
      // eslint-disable-next-line no-console
      console.log(`Phase 2 UAT report: ${PHASE2_UAT_REPORT_PATH}`)
    }
  })

  test('UAT-1 继续修行读档 coerce 为 fate_run', async ({ page }) => {
    const t1Name = '继续修行读档 coerce 为 fate_run'
    await seedPhase2Fixture(page, 'phase2-chapter-mid-run')
    await recorder.capture(page, {
      testId: 1,
      testName: t1Name,
      title: 'chapter 档载入 /play',
      action: '种子 chapter 第 12 周 → 打开 /play',
      pass: true,
      fileName: 'test-01-chapter-load.png'
    })
    const run = await readActiveRun(page)
    expect(run?.runMode).toBe('fate_run')
    expect(run?.runStatus).not.toBe('archived')
    await expect(page.getByRole('region', { name: '周仪表盘' })).toBeVisible()
    await recorder.capture(page, {
      testId: 1,
      testName: t1Name,
      title: 'coerce 后周仪表盘',
      action: '断言 runMode=fate_run + 主界面可操作',
      pass: true,
      assertions: [`runMode=${run?.runMode}`, `runStatus=${run?.runStatus}`],
      fileName: 'test-01-fate-run-dashboard.png'
    })
  })

  test('UAT-2 W40 确认计划后无 ContractFinale', async ({ page }) => {
    const t2Name = 'W40 确认计划后无 ContractFinale 全屏'
    await seedPhase2Fixture(page, 'phase2-fate-week40')
    let run = await readActiveRun(page)
    expect(run?.chapter?.chapterWeekIndex).toBe(40)
    await recorder.capture(page, {
      testId: 2,
      testName: t2Name,
      title: '第 40 周种子',
      action: 'logic 推进至 W40（fate_run）',
      pass: true,
      fileName: 'test-02-week40-before.png'
    })

    expect(await advanceOneWeekViaUi(page)).toBe(true)
    await page.waitForTimeout(400)

    const finaleVisible = await page.locator('.ContractFinale').isVisible().catch(() => false)
    run = await readActiveRun(page)
    expect(finaleVisible).toBe(false)
    expect(run?.chapter?.chapterWeekIndex).toBeGreaterThanOrEqual(41)
    expect(run?.runStatus).not.toBe('archived')
    expect(run?.logs.some((l) => l.includes('契约账期已满'))).toBe(true)

    await recorder.capture(page, {
      testId: 2,
      testName: t2Name,
      title: 'W40 确认后进第 41 周',
      action: 'UI 确认本周计划（W40→W41）',
      pass: true,
      assertions: [
        'ContractFinale 不可见',
        `chapterWeekIndex=${run?.chapter?.chapterWeekIndex}`,
        'continuity log 已写入'
      ],
      fileName: 'test-02-week41-no-finale.png'
    })
  })

  test('UAT-3 fated 状态仍在 week-dashboard', async ({ page }) => {
    const t3Name = 'fated 状态仍在 week-dashboard'
    await seedPhase2Fixture(page, 'phase2-fate-body-trigger')
    await recorder.capture(page, {
      testId: 3,
      testName: t3Name,
      title: '低 bodyIntegrity 种子',
      action: 'fate_run + bodyIntegrity 触线前',
      pass: true,
      fileName: 'test-03-before-advance.png'
    })
    expect(await advanceOneWeekViaUi(page)).toBe(true)
    const run = await readActiveRun(page)
    const archiveVisible = await page.locator('.RunArchiveView__post-mortem').isVisible().catch(() => false)
    expect(run?.runStatus).toBe('fated')
    expect(archiveVisible).toBe(false)
    await expect(page.getByRole('region', { name: '周仪表盘' })).toBeVisible()
    await recorder.capture(page, {
      testId: 3,
      testName: t3Name,
      title: 'fated 后仍周仪表盘',
      action: '确认周计划触发 fateTransition',
      pass: true,
      assertions: [`runStatus=${run?.runStatus}`],
      fileName: 'test-03-fated-dashboard.png'
    })
  })

  test('UAT-4 第 41 周学籍段切换 M2', async ({ page }) => {
    const t4Name = '第 41 周学籍段切换 M2'
    await seedPhase2Fixture(page, 'phase2-fate-week41-m2')
    const run = await readActiveRun(page)
    expect(run?.stageId).toBe('stage-m2-hs')
    expect(run?.logs.some((l) => l.includes('学籍段切换'))).toBe(true)
    await expect(page.getByRole('region', { name: '周仪表盘' })).toBeVisible()
    await recorder.capture(page, {
      testId: 4,
      testName: t4Name,
      title: 'W41 + M2 种子 UI',
      action: 'logic 已 resolveWeekEnd 至 M2',
      pass: true,
      assertions: [`stageId=${run?.stageId}`],
      fileName: 'test-04-m2-dashboard.png'
    })
  })

  test('UAT-5 Harness 契约门禁', async ({ page }) => {
    await seedPhase2Fixture(page, 'phase2-chapter-mid-run')
    await recorder.capture(page, {
      testId: 5,
      testName: 'Harness 契约门禁',
      title: 'harness:verify --quick',
      action: 'beforeAll 已执行 yarn harness:verify --quick',
      pass: harnessOk,
      assertions: ['HARNESS_OK'],
      fileName: 'test-05-harness-ok.png'
    })
  })
})
