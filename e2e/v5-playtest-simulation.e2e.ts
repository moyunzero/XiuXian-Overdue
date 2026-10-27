import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import {
  clearAllGameSaves,
  waitForPlayHydrated,
  completeAct1Interview,
  completeAct1Loan,
  completeAct1FamilyShortPath,
  finishAct1Settlement,
  respondMandateInboxIfVisible,
  confirmWeekPlanIfReady,
  adjustWeekPlanForShortPlay
} from './helpers/v5PlaytestActions'
import { loadUiFixtureScenarios, seedPayloadForScenario } from './helpers/playUiFixtures'
import { META_SAVE_KEY, PLAY_SAVE_KEY, resolvePhase8Seed } from './helpers/v5PlaytestFixtures'
import { getPhase5UatFixture } from './helpers/phase5UatFixtures'
import {
  V5_PLAYTEST_OUT_DIR,
  V5_PLAYTEST_REPORT_PATH,
  V5PlaytestRecorder
} from './helpers/v5PlaytestRecorder'

const recorder = new V5PlaytestRecorder(V5_PLAYTEST_OUT_DIR)
const DESKTOP = { width: 1440, height: 900 }
const PLAYER_A = '小林（§1 短局）'
const PLAYER_B = '阿青（§2 中局）'
const PLAYER_C = '老周（§3 命运链）'

let suiteStartedAt = ''
let suitePass = true

async function seedPhase8(page: Page, scenarioId: string) {
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

async function seedPhase5(page: Page, fixtureId: string) {
  const scenario = getPhase5UatFixture(fixtureId)
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(
    ({ metaKey, metaV1, playKey, saveV5, clearPlay, clearMeta }) => {
      if (clearMeta) localStorage.removeItem(metaKey)
      if (clearPlay) {
        localStorage.removeItem(playKey)
        localStorage.removeItem('kunxu_sim_save_v2')
        localStorage.removeItem('kunxu_act1_save')
      }
      if (metaV1) localStorage.setItem(metaKey, JSON.stringify(metaV1))
      if (saveV5) localStorage.setItem(playKey, JSON.stringify(saveV5))
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
  if (scenario.path === '/play') await waitForPlayHydrated(page)
  await page.locator(scenario.waitSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  return scenario
}

async function seedUiFixture(page: Page, scenarioId: string) {
  const scenario = loadUiFixtureScenarios().find((s) => s.id === scenarioId)
  if (!scenario) throw new Error(`Missing ui-audit fixture: ${scenarioId}`)
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
  return scenario
}

async function dismissExamBoss(page: Page) {
  await page.getByRole('button', { name: '确认并继续' }).click()
  await page.waitForTimeout(400)
}

async function pickSectFirst(page: Page) {
  await page.locator('.SectChoice__btn').first().click()
  await page.waitForTimeout(400)
}

test.describe('v5 模拟真人试玩 · checklist §1–§4', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(600_000)

  test.beforeAll(() => {
    suiteStartedAt = new Date().toISOString()
    fs.mkdirSync(V5_PLAYTEST_OUT_DIR, { recursive: true })
  })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP)
  })

  test.afterAll(() => {
    recorder.writeMarkdown({
      startedAt: suiteStartedAt,
      finishedAt: new Date().toISOString(),
      pass: suitePass,
      viewport: `${DESKTOP.width}×${DESKTOP.height}`,
      device: 'Playwright Chromium（模拟桌面 Chrome）'
    })
    expect(fs.existsSync(V5_PLAYTEST_REPORT_PATH)).toBe(true)
  })

  test('§1 小林 · 首页 → Act1 → W1–3 周循环与来文', async ({ page }) => {
    try {
      await clearAllGameSaves(page)
      await recorder.capture(page, {
        id: 'pA-01-home',
        section: '§1',
        player: PLAYER_A,
        checklistRef: '§1 0–2min 首页',
        title: 'StartConfig · 账号档案',
        hostNote: 'FateCodexStrip / 槽位可读；默认「签署契约并开始」可见',
        action: '清除存档后打开首页',
        fileName: 'pA-01-home-startconfig.png'
      })

      await page.getByRole('button', { name: /签署契约并开始/ }).click()
      await page.waitForURL('**/play**', { timeout: 30_000 })
      await waitForPlayHydrated(page)
      await recorder.capture(page, {
        id: 'pA-02-s0-start',
        section: '§1',
        player: PLAYER_A,
        checklistRef: '§1 2–15min Act1',
        title: '入学前夜 · 面试开场',
        hostNote: '是否进入制度叙事而非爽游开场',
        action: '点击「签署契约并开始」→ /play',
        fileName: 'pA-02-act1-interview-start.png'
      })

      await completeAct1Interview(page)
      await recorder.capture(page, {
        id: 'pA-03-interview',
        section: '§1',
        player: PLAYER_A,
        checklistRef: '§1 Act1 面试',
        title: '面试提交完成',
        hostNote: '8 题路径是否让玩家感到「被筛选」',
        action: '8 题首项 → 提交并评分',
        fileName: 'pA-03-act1-interview-done.png'
      })

      await completeAct1Loan(page)
      await recorder.capture(page, {
        id: 'pA-04-loan',
        section: '§1',
        player: PLAYER_A,
        checklistRef: '§1 Act1 灵贷',
        title: '灵贷签约完成',
        hostNote: '是否懂「签了什么」— 利率/动用条款可见',
        action: '比价悬停 30s + 勾选 + 签署并动用',
        fileName: 'pA-04-act1-loan-signed.png'
      })

      await completeAct1FamilyShortPath(page)
      await recorder.capture(page, {
        id: 'pA-05-family',
        section: '§1',
        player: PLAYER_A,
        checklistRef: '§1 Act1 家庭',
        title: '家庭最短结案',
        hostNote: '家庭催收情绪铺垫是否到位',
        action: '培元药剂包 → 知道了 → 你扛下 → 接受迁出',
        fileName: 'pA-05-act1-family-settled.png'
      })

      await finishAct1Settlement(page)
      await recorder.capture(page, {
        id: 'pA-06-play-entry',
        section: '§1',
        player: PLAYER_A,
        checklistRef: '§1 15–18min 进入 Play',
        title: '四瓷片周排程 · 第 1 周',
        hostNote: '无 endless 4 选 2 误解；WeekPlan 四格可见',
        action: '制度档案「确认并进入昆墟高中」',
        assertions: ['.WeekPlan visible'],
        fileName: 'pA-06-week1-dashboard.png'
      })

      await adjustWeekPlanForShortPlay(page)
      await recorder.capture(page, {
        id: 'pA-07-plan-adjust',
        section: '§1',
        player: PLAYER_A,
        checklistRef: '§1 18–28min W1–3',
        title: '调整还款/刷题/零工/休息',
        hostNote: '玩家能否读懂四格含义并动手调参',
        action: '按 natural 人格填本周四格',
        fileName: 'pA-07-weekplan-adjusted.png'
      })

      const debtStrip = page.locator('.DebtDash__strip')
      if (await debtStrip.isVisible().catch(() => false)) {
        await debtStrip.click()
      }
      await recorder.capture(page, {
        id: 'pA-08-debt',
        section: '§1',
        player: PLAYER_A,
        checklistRef: '§1 债务仪表盘',
        title: '债务仪表盘展开',
        hostNote: '总债务/最低还款/账单日是否可读',
        action: '展开 DebtDash 明细',
        assertions: ['.DebtDash visible'],
        fileName: 'pA-08-debt-dashboard.png'
      })

      await confirmWeekPlanIfReady(page)
      await recorder.capture(page, {
        id: 'pA-09-week1-confirm',
        section: '§1',
        player: PLAYER_A,
        checklistRef: '§1 确认本周',
        title: '第 1 周确认',
        hostNote: '「确认本周计划」闭环是否清晰',
        action: '点击确认本周计划',
        fileName: 'pA-09-week1-confirmed.png'
      })

      const mandateRound1 = await respondMandateInboxIfVisible(page)
      if (mandateRound1) {
        await recorder.capture(page, {
          id: 'pA-10-mandate',
          section: '§1',
          player: PLAYER_A,
          checklistRef: '§1 28–38min 来文',
          title: '仙司来文回应',
          hostNote: '是否像「被甩脸」的制度来文',
          action: '来文首项回应',
          fileName: 'pA-10-mandate-responded.png'
        })
      }

      for (let w = 2; w <= 3; w++) {
        await respondMandateInboxIfVisible(page)
        const ok = await confirmWeekPlanIfReady(page, true)
        if (!ok) break
        await recorder.capture(page, {
          id: `pA-11-week${w}`,
          section: '§1',
          player: PLAYER_A,
          checklistRef: '§1 38–45min 自由周',
          title: `第 ${w} 周推进`,
          hostNote: '非节点周节奏是否可沿用上周',
          action: `确认第 ${w} 周计划`,
          fileName: `pA-11-week${w}-advanced.png`
        })
      }

      recorder.addInterview({
        player: PLAYER_A,
        q1路人感:
          '（模拟）像被制度和账单推着走的普通人，面试和灵贷像在填表过关，不是天命主角开局。',
        q2续玩意愿: '（模拟）愿意再开几周，想看看最低还款会不会压垮现金。',
        q3懂循环:
          '（模拟）这周先排四格时间和还款，仙司来文要回，最后点确认开本周；钱来自零工和现金结余。',
        hostNotes: '自动化：Act1 最短路径 + 3 周 UI 点击无卡死。'
      })
    } catch (e) {
      suitePass = false
      await recorder
        .capture(page, {
          id: 'pA-fail',
          section: '§1',
          player: PLAYER_A,
          checklistRef: '失败现场',
          title: '小林局中断',
          hostNote: e instanceof Error ? e.message : String(e),
          action: '异常时截图',
          pass: false,
          fileName: 'pA-fail-state.png'
        })
        .catch(() => {})
      throw e
    }
  })

  test('§2 阿青 · 中局关键节点 W16/W17/W40/W41', async ({ page }) => {
    try {
      await seedUiFixture(page, 'chapter-exam-boss')
      await recorder.capture(page, {
        id: 'pB-01-exam',
        section: '§2',
        player: PLAYER_B,
        checklistRef: '§2 高中 W4/8/12 月考',
        title: '月考结算屏（关口感）',
        hostNote: '审判/月考是否像「关口」而非普通弹窗',
        action: 'fixture chapter-exam-boss',
        fileName: 'pB-01-exam-boss-gate.png'
      })
      await dismissExamBoss(page)
      await recorder.capture(page, {
        id: 'pB-02-exam-dismiss',
        section: '§2',
        player: PLAYER_B,
        checklistRef: '§2 W16 筑基审判（代表关口）',
        title: '月考确认并继续',
        hostNote: '关口关闭后回到周循环',
        action: '确认并继续',
        fileName: 'pB-02-exam-boss-dismissed.png'
      })

      await seedUiFixture(page, 'chapter-sect-choice')
      await recorder.capture(page, {
        id: 'pB-03-sect',
        section: '§2',
        player: PLAYER_B,
        checklistRef: '§2 大学 W17 择宗',
        title: '择宗关口',
        hostNote: 'W17 择宗选项是否像制度分流',
        action: 'fixture chapter-sect-choice',
        fileName: 'pB-03-sect-choice.png'
      })
      await pickSectFirst(page)
      await recorder.capture(page, {
        id: 'pB-04-sect-pick',
        section: '§2',
        player: PLAYER_B,
        checklistRef: '§2 W17',
        title: '择宗首项',
        hostNote: '择宗后是否可继续而非终局',
        action: '择宗第一项',
        fileName: 'pB-04-sect-choice-picked.png'
      })

      await seedPhase8(page, 'phase8-w40-continuity')
      await expect(page.getByText('契约终局')).not.toBeVisible()
      await recorder.capture(page, {
        id: 'pB-05-w40',
        section: '§2',
        player: PLAYER_B,
        checklistRef: '§2 W40 续玩',
        title: 'W40 仍显示周排程',
        hostNote: '不出现「契约终局」全屏；v5 主路径可续玩',
        action: 'fixture phase8-w40-continuity',
        assertions: ['WeekPlan visible', '无契约终局文案'],
        fileName: 'pB-05-w40-no-finale.png'
      })

      await seedPhase8(page, 'phase8-w41-m2')
      await recorder.capture(page, {
        id: 'pB-06-w41',
        section: '§2',
        player: PLAYER_B,
        checklistRef: '§2 W41 → M2',
        title: 'W41 进入 M2 学籍段',
        hostNote: 'stage ladder 续玩；可继续排程',
        action: 'fixture phase8-w41-m2',
        assertions: ['.WeekPlan visible'],
        fileName: 'pB-06-w41-m2-dashboard.png'
      })

      recorder.addInterview({
        player: PLAYER_B,
        q1路人感: '（模拟）月考和择宗像被系统分流，不是选天命宗门爽点。',
        q2续玩意愿: '（模拟）W40 还能玩让人意外，愿意看看 M2 学籍段有什么。',
        q3懂循环: '（模拟）关口是周程里的钉子，打完回来还是排程+来文+开周。',
        hostNotes: '自动化：W40 无终局、W41 M2 排程可见。'
      })
    } catch (e) {
      suitePass = false
      throw e
    }
  })

  test('§3 老周 · 命运链 overlay / trauma / ghost_bound', async ({ page }) => {
    try {
      await seedPhase8(page, 'phase8-fate-overlay')
      await expect(page.locator('.FateUpdateOverlay')).toBeVisible()
      await recorder.capture(page, {
        id: 'pC-01-overlay',
        section: '§3',
        player: PLAYER_C,
        checklistRef: '§3 human→mortgaged',
        title: '灵籍更新 overlay',
        hostNote: '制度通知感；非删档结局',
        action: 'fixture phase8-fate-overlay',
        fileName: 'pC-01-fate-overlay.png'
      })
      await page.getByRole('button', { name: '跳过' }).click()
      await expect(page.locator('.FateUpdateOverlay')).toHaveCount(0)
      await expect(page.locator('.WeekPlan')).toBeVisible()
      await recorder.capture(page, {
        id: 'pC-02-overlay-skip',
        section: '§3',
        player: PLAYER_C,
        checklistRef: '§3 overlay 关闭',
        title: '跳过 overlay → 回到周排程',
        hostNote: '更新后仍可玩',
        action: '跳过',
        fileName: 'pC-02-overlay-dismissed.png'
      })

      await seedPhase5(page, 'phase5-trauma-chip-overlay')
      await page.getByRole('button', { name: '跳过' }).click()
      const chip = page.locator('.TraumaArchiveChip')
      await expect(chip).toBeVisible()
      await recorder.capture(page, {
        id: 'pC-03-trauma',
        section: '§3',
        player: PLAYER_C,
        checklistRef: '§3 TraumaArchiveChip',
        title: '创伤档案归档 chip',
        hostNote: '抵押运行档归档提示；抽血 grit 语境',
        action: 'overlay 跳过后 TraumaArchiveChip',
        assertions: ['创伤档案归档 copy'],
        fileName: 'pC-03-trauma-chip.png'
      })

      await seedPhase8(page, 'phase8-ghost-bound')
      await expect(page.locator('.DelegationPanel')).toBeVisible()
      await recorder.capture(page, {
        id: 'pC-04-ghost',
        section: '§3',
        player: PLAYER_C,
        checklistRef: '§3 ghost_bound',
        title: '幽影档 · 双账 DelegationPanel',
        hostNote: '人账/鬼账 settlement 语境；维生+委托',
        action: 'fixture phase8-ghost-bound',
        fileName: 'pC-04-ghost-bound-panel.png'
      })

      await seedPhase8(page, 'phase8-meta-codex')
      await expect(page.locator('.FateCodexStrip')).toBeVisible()
      await recorder.capture(page, {
        id: 'pC-05-codex',
        section: '§3',
        player: PLAYER_C,
        checklistRef: '§0 meta + §3 形态记录',
        title: '账号档案 FateCodexStrip',
        hostNote: '多形态 codex 可读；抵押运行已解锁',
        action: '首页 meta codex',
        fileName: 'pC-05-meta-codex.png'
      })

      recorder.addInterview({
        player: PLAYER_C,
        q1路人感: '（模拟）灵籍更新像路人档案被改写，Trauma chip 像制度归档而非英雄觉醒。',
        q2续玩意愿: '（模拟）抵押/幽影后仍想无教程再玩 5 周，验证不是结局屏。',
        q3懂循环: '（模拟）形态变了但循环还是排程—来文—开周；双账是额外账本。',
        hostNotes: '自动化：overlay/chip/ghost_bound/codex 全可见。'
      })
    } catch (e) {
      suitePass = false
      throw e
    }
  })
})
