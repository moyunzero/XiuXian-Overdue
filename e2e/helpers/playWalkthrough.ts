import fs from 'node:fs'
import path from 'node:path'
import { expect, type Page } from '@playwright/test'
import type { WeekPlan } from '~/types/chapter'
import {
  loadUiFixtureScenarios,
  seedPayloadForScenario,
  type UiFixtureScenario
} from './playUiFixtures'

export const WALKTHROUGH_OUT_DIR = path.join(process.cwd(), 'e2e/artifacts/walkthrough')
export const WALKTHROUGH_REPORT_PATH = path.join(process.cwd(), 'docs/playwright-walkthrough-report.md')

export type WalkStep = {
  id: string
  phase: string
  title: string
  action: string
  screenshot: string
  url: string
  notes?: string
}

export class WalkthroughRecorder {
  readonly steps: WalkStep[] = []

  constructor(private readonly outDir: string) {}

  async capture(
    page: Page,
    input: {
      id: string
      phase: string
      title: string
      action: string
      notes?: string
      fileName?: string
    }
  ) {
    fs.mkdirSync(this.outDir, { recursive: true })
    const fileName = input.fileName ?? `${input.id}.png`
    const absPath = path.join(this.outDir, fileName)
    await page.waitForTimeout(350)
    await page.screenshot({ path: absPath, fullPage: true })
    this.steps.push({
      id: input.id,
      phase: input.phase,
      title: input.title,
      action: input.action,
      notes: input.notes,
      url: page.url(),
      screenshot: path.relative(process.cwd(), absPath)
    })
    return absPath
  }

  writeMarkdown(reportPath: string, meta: { startedAt: string; finishedAt: string; pass: boolean }) {
    const lines: string[] = [
      '# Playwright 全流程试玩记录',
      '',
      `> 自动生成于 \`${meta.finishedAt}\`。交互路径：首页 → 入学前夜（S0 线性三步）→ Ch0 周循环；各 setpiece 节点由 fixture 种子 + 最少确认点击覆盖。`,
      '',
      '| 字段 | 值 |',
      '|------|-----|',
      `| 开始时间 | ${meta.startedAt} |`,
      `| 结束时间 | ${meta.finishedAt} |`,
      `| 结果 | ${meta.pass ? '通过' : '失败'} |`,
      `| 截图目录 | [\`e2e/artifacts/walkthrough/\`](../e2e/artifacts/walkthrough/) |`,
      `| 对照清单 | [\`docs/playtest-checklist-ch0.md\`](./playtest-checklist-ch0.md) |`,
      '',
      '## 阶段一览',
      '',
      '| # | 阶段 | 标题 | 操作 | 截图 |',
      '|---|------|------|------|------|',
      ...this.steps.map((s, i) => {
        const note = s.notes ? `<br>${s.notes.replace(/\|/g, '\\|')}` : ''
        return `| ${i + 1} | ${s.phase} | ${s.title} | ${s.action}${note} | [\`${s.screenshot}\`](../${s.screenshot}) |`
      }),
      '',
      '## 覆盖说明',
      '',
      '- **入学前夜**：真实 UI 点击完成面试 8 题、灵贷比价 30s + 签约、家庭最短结案（培元药剂包 → 知道了 → 扛下 → 接受迁出）→ 制度档案确认。',
      '- **Ch0 周循环**：真实推进若干周（确认本周计划；若仙司来文则选首项回应）。',
      '- **40 周纯 UI 自然通关**：独立用例 `natural UI 40 weeks` 从 `chapter-natural-ch0-start`（natural baseline seed）纯点击至契约终局并履约结业。',
      '- **节点屏**：使用 `e2e/fixtures/ui-audit/*` 种子存档；含 **债务崩盘终局**（`chapter-collapse-debt`）与 **自然履约档案**（`chapter-run-archive`）。',
      ''
    ]
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')
  }
}

export async function clearAllGameSaves(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(() => {
    localStorage.removeItem('kunxu_sim_save_v5')
    localStorage.removeItem('kunxu_sim_save_v2')
    localStorage.removeItem('kunxu_sim_save')
  })
}

export async function waitForPlayHydrated(page: Page) {
  await page.getByText('载入修行档案').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {})
}

export async function dismissLoanAdIfVisible(page: Page) {
  const popup = page.locator('.LoanAdPopup')
  if (await popup.isVisible().catch(() => false)) {
    await popup.getByRole('button', { name: '关闭广告' }).click()
  }
}

const INTERVIEW_STEPS = 8

export async function completeAct1Interview(page: Page) {
  for (let i = 0; i < INTERVIEW_STEPS; i++) {
    await page.locator('.InterviewModule__option').first().click()
    const next = page.getByRole('button', { name: /下一题|提交并评分/ })
    await next.click()
    if (i === INTERVIEW_STEPS - 1) {
      await page.locator('.InterviewModule__recycle-scene').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(400)
    }
  }
  await page.locator('.LoanModule').waitFor({ state: 'visible', timeout: 20_000 })
}

export async function completeAct1Loan(page: Page) {
  await dismissLoanAdIfVisible(page)
  const wrap = page.locator('.LoanModule__table-wrap')
  await wrap.hover()
  await page.waitForTimeout(31_000)
  await page.locator('.LoanModule__contract-body').evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await page.locator('.LoanModule__check input').check()
  await page.getByRole('button', { name: /签署并动用/ }).click()
  await page.locator('.FamilyModule').waitFor({ state: 'visible', timeout: 20_000 })
}

export async function completeAct1FamilyShortPath(page: Page) {
  await page.getByRole('button', { name: /培元药剂包/ }).click()
  await page.getByRole('button', { name: '知道了' }).click()
  await page.getByRole('button', { name: /你扛下/ }).click()
  await page.getByRole('button', { name: '接受迁出' }).click()
  await page.locator('.Act1Settlement, .RunArchiveView').first().waitFor({ state: 'visible', timeout: 20_000 })
}

export async function finishAct1Settlement(page: Page) {
  await page.getByRole('button', { name: '确认并进入昆墟高中' }).click()
  await page.getByRole('region', { name: '周仪表盘' }).waitFor({ state: 'visible', timeout: 30_000 })
}

export async function respondMandateInboxIfVisible(page: Page): Promise<boolean> {
  const inbox = page.locator('.MandateInbox')
  if (!(await inbox.isVisible().catch(() => false))) return false
  await page.locator('.MandateInbox__btn').first().click()
  await inbox.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
  return true
}

/** 与 chapterNaturalSim.drainMandatesForProfile 同源；guard 每批 drain 从 0 计，勿跨周累加 */
export async function drainMandatesNaturalIfVisible(page: Page, seed: number): Promise<boolean> {
  let acted = false
  let guard = 0
  while (await page.locator('.MandateInbox').isVisible().catch(() => false)) {
    guard += 1
    acted = true
    const pickGrit = (seed + guard * NATURAL_SIM_GRIT_MOD) % 100 < NATURAL_SIM_GRIT_PCT
    const gritBtn = page.locator('.MandateInbox__btn--grit').first()
    const firstBtn = page.locator('.MandateInbox__btn').first()

    if (pickGrit && (await gritBtn.isVisible().catch(() => false))) {
      await gritBtn.click({ timeout: 4000 }).catch(() => firstBtn.click({ timeout: 4000 }).catch(() => {}))
    } else {
      await firstBtn.click({ timeout: 4000 }).catch(() => {})
    }
    await page.locator('.MandateInbox').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
  }
  return acted
}

/** @deprecated 单条来文；40 周 natural 请用 drainMandatesNaturalIfVisible */
export async function respondMandateNaturalIfVisible(page: Page, seed: number): Promise<boolean> {
  if (!(await page.locator('.MandateInbox').isVisible().catch(() => false))) return false
  return drainMandatesNaturalIfVisible(page, seed)
}

const NATURAL_BASELINE_SEED = 20260531
const NATURAL_SIM_GRIT_PCT = 6
const NATURAL_SIM_GRIT_MOD = 23

async function getRunSeedFromPage(page: Page): Promise<number> {
  return page.evaluate((fallback) => {
    const raw = localStorage.getItem('kunxu_sim_save_v5')
    if (!raw) return fallback
    try {
      const data = JSON.parse(raw) as { activeRunId?: string; runs?: Record<string, { seed?: number }> }
      const run = data.runs?.[data.activeRunId ?? '']
      return run?.seed ?? fallback
    } catch {
      return fallback
    }
  }, NATURAL_BASELINE_SEED)
}

/** E2E 用：与 chapterNaturalSim.naturalWeekPlan 同公式，避免 Playwright 拉 JSON 模块 */
function naturalWeekPlanForE2e(seed: number, weekIndex: number): WeekPlan {
  const inWork = weekIndex >= 29
  const temperament = seed % 100
  const skipBias = temperament >= 92 ? 9 : 3
  const repayRoll = (seed + weekIndex * 53) % 100
  const repay = repayRoll < skipBias ? 'skip' : 'min'
  const inGrindZone = temperament >= 48 && temperament < 88
  const grind = inGrindZone && (seed + weekIndex * 41) % 100 < 35

  return {
    repay,
    studyHours: inWork ? (grind ? 6 : 4) : grind ? 10 : 8,
    tunaHours: 0,
    parttimeHours: inWork ? (grind ? 14 : 0) : grind ? 6 : 10,
    workHours: inWork ? (grind ? 56 : 44) : 0,
    rest: false
  }
}

const HOUR_FIELD_LABEL: Record<
  'studyHours' | 'tunaHours' | 'parttimeHours' | 'workHours',
  string
> = {
  studyHours: '刷题',
  tunaHours: '吐纳',
  parttimeHours: '零工',
  workHours: '主业'
}

async function readChapterWeekIndex(page: Page): Promise<number> {
  const status = page.locator('header, [role="banner"]').getByText(/第 \d+\/40 周/)
  const text = (await status.first().textContent().catch(() => null)) ?? ''
  const m = text.match(/第 (\d+)\/40/)
  return m ? Number(m[1]) : 1
}

async function setHourViaRange(
  page: Page,
  key: 'studyHours' | 'tunaHours' | 'parttimeHours' | 'workHours',
  hours: number
) {
  const input = page.locator(`#hour-range-${key}`)
  if (!(await input.isVisible().catch(() => false))) return
  if (!(await input.isEnabled().catch(() => false))) return

  const maxAttr = await input.getAttribute('max')
  const target = Math.min(hours, maxAttr ? Number(maxAttr) : 40)

  await input.evaluate((el, value) => {
    const range = el as HTMLInputElement
    range.value = String(value)
    range.dispatchEvent(new Event('input', { bubbles: true }))
  }, target)

  await expect(input).toHaveValue(String(target), { timeout: 5000 })
}

/** 按 natural 模拟人格在 UI 上填本周计划（与 chapterNaturalSim 同源） */
export async function prepareNaturalWeekPlan(page: Page) {
  const weekPlan = page.locator('.WeekPlan')
  if (!(await weekPlan.isVisible().catch(() => false))) return

  const confirmBtn = page.getByRole('button', { name: '确认本周计划' })
  if (await confirmBtn.isDisabled().catch(() => true)) return

  const seed = await getRunSeedFromPage(page)
  const week = await readChapterWeekIndex(page)
  const plan = naturalWeekPlanForE2e(seed, week)

  const repayRadio = page.locator(`input[name="week-repay"][value="${plan.repay}"]`)
  if (await repayRadio.isVisible().catch(() => false)) {
    if (await repayRadio.isEnabled().catch(() => false)) {
      await repayRadio.check({ force: true })
    }
  }

  const restBox = page.getByRole('checkbox', { name: /休息一周/ })
  if (await restBox.isVisible().catch(() => false) && !(await restBox.isDisabled())) {
    if (plan.rest && !(await restBox.isChecked())) await restBox.check()
    if (!plan.rest && (await restBox.isChecked())) await restBox.uncheck()
  }

  if (!plan.rest) {
    for (const key of Object.keys(HOUR_FIELD_LABEL) as Array<keyof typeof HOUR_FIELD_LABEL>) {
      await setHourViaRange(page, key, plan[key])
    }
  }

  await page.waitForTimeout(80)
}

export async function confirmWeekPlanIfReady(page: Page, useNaturalPlan = false): Promise<boolean> {
  const btn = page.getByRole('button', { name: '确认本周计划' })
  if (!(await btn.isVisible().catch(() => false))) return false
  if (useNaturalPlan) await prepareNaturalWeekPlan(page)
  if (await btn.isDisabled()) return false
  await btn.click({ timeout: 8000 })
  await page.waitForTimeout(600)
  return true
}

export async function seedUiFixture(page: Page, scenario: UiFixtureScenario) {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  const payload = seedPayloadForScenario(scenario)
  await page.evaluate((p) => {
    localStorage.removeItem('kunxu_sim_save_v5')
    localStorage.removeItem('kunxu_sim_save_v2')
    if (p.playValue) localStorage.setItem(p.playKey, p.playValue)
    if (p.act1Value) localStorage.setItem(p.act1Key, p.act1Value)
  }, payload)
  await page.goto(scenario.path)
  await page.waitForLoadState('domcontentloaded')
  await waitForPlayHydrated(page)
  if (scenario.waitSelector) {
    await page.locator(scenario.waitSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  }
}

type FixtureAction = (page: Page) => Promise<string | void>

const FIXTURE_ACTIONS: Record<string, FixtureAction> = {
  'chapter-exam-boss': async (page) => {
    await page.getByRole('button', { name: '确认并继续' }).click()
    return '点击「确认并继续」关闭月考结算'
  },
  'chapter-breakthrough-gate': async (page) => {
    await page.getByRole('button', { name: '确认并进入预科' }).click()
    return '点击「确认并进入预科」'
  },
  'chapter-sect-choice': async (page) => {
    await page.locator('.SectChoice__btn').first().click()
    return '择宗：选第一项'
  },
  'chapter-body-mortgage': async (page) => {
    await page.locator('.BodyMortgage__accept').first().click()
    return '身体抵押：接受首项报价'
  },
  'chapter-work-track-choice': async (page) => {
    await page.locator('.TrackChoice__btn').first().click()
    return '职场：择轨第一项'
  },
  'chapter-work-job-choice': async (page) => {
    await page.locator('.JobChoice__btn').first().click()
    return '职场：择岗第一项'
  },
  'chapter-mandate-inbox': async (page) => {
    await page.locator('.MandateInbox__btn').first().click()
    return '仙司来文：选首项回应'
  },
  'chapter-contract-finale': async (page) => {
    await page.getByRole('button', { name: '履约结业' }).click()
    return '契约终局：履约结业'
  },
  'chapter-run-archive': async (page) => {
    await page.getByRole('button', { name: '返回首页' }).click().catch(async () => {
      await page.getByRole('button', { name: /确认并继续|返回/ }).click()
    })
    return '章节档案：确认返回'
  },
  'chapter-collapse-debt': async (page) => {
    await page.getByRole('button', { name: '返回首页' }).click().catch(async () => {
      await page.getByRole('button', { name: /确认并继续|返回/ }).click()
    })
    return '债务崩盘档案：确认返回'
  }
}

export function fixtureScenariosForWalkthrough(): UiFixtureScenario[] {
  return loadUiFixtureScenarios().filter((s) => s.id !== 'home-index' && s.id !== 'pre-act1-desktop')
}

export async function runFixtureInteraction(page: Page, scenarioId: string): Promise<string | undefined> {
  const fn = FIXTURE_ACTIONS[scenarioId]
  if (!fn) return undefined
  const note = await fn(page)
  await page.waitForTimeout(500)
  return note
}

/** 关闭当前可见的 Ch0 setpiece / 关口（不含契约终局） */
export async function dismissChapterGateIfVisible(page: Page): Promise<boolean> {
  if (await page.locator('.ExamBoss').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '确认并继续' }).click()
    await page.waitForTimeout(400)
    return true
  }
  if (await page.locator('.Breakthrough').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /确认并进入预科|确认破境/ }).click()
    await page.waitForTimeout(400)
    return true
  }
  if (await page.locator('.SectChoice').isVisible().catch(() => false)) {
    await page.locator('.SectChoice__btn').first().click()
    await page.waitForTimeout(400)
    return true
  }
  if (await page.locator('.BodyMortgage').isVisible().catch(() => false)) {
    await page.locator('.BodyMortgage__accept').first().click()
    await page.waitForTimeout(400)
    return true
  }
  if (await page.locator('.TrackChoice').isVisible().catch(() => false)) {
    await page.locator('.TrackChoice__btn').first().click()
    await page.waitForTimeout(400)
    return true
  }
  if (await page.locator('.JobChoice').isVisible().catch(() => false)) {
    await page.locator('.JobChoice__btn').first().click()
    await page.waitForTimeout(400)
    return true
  }
  if (await page.locator('.PlayChapterScreenHost__finale').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '签收账单并继续' }).click()
    await page.waitForTimeout(400)
    return true
  }
  return false
}

/** 纯 UI 推进 Ch0 直至契约终局或步数上限；返回实际交互步数 */
export async function advanceCh0NaturalViaUi(page: Page, maxSteps = 320): Promise<number> {
  let steps = 0
  let idleRounds = 0
  while (steps < maxSteps) {
    if (await page.locator('.ContractFinale').isVisible().catch(() => false)) break
    if (await page.locator('.RunArchiveView__post-mortem').isVisible().catch(() => false)) break

    const seed = await getRunSeedFromPage(page)
    let acted = await dismissChapterGateIfVisible(page)
    acted = (await drainMandatesNaturalIfVisible(page, seed)) || acted
    const confirmed = await confirmWeekPlanIfReady(page, true)
    acted = confirmed || acted
    if (!acted) {
      idleRounds += 1
      if (idleRounds >= 5) break
      await page.waitForTimeout(300)
      continue
    }
    idleRounds = 0
    steps += 1
    await page.waitForTimeout(200)
  }
  return steps
}
