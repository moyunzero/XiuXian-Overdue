import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  WALKTHROUGH_OUT_DIR,
  WALKTHROUGH_REPORT_PATH,
  WalkthroughRecorder,
  clearAllGameSaves,
  waitForPlayHydrated,
  completeAct1Interview,
  completeAct1Loan,
  completeAct1FamilyShortPath,
  finishAct1Settlement,
  respondMandateInboxIfVisible,
  confirmWeekPlanIfReady,
  seedUiFixture,
  fixtureScenariosForWalkthrough,
  runFixtureInteraction,
  advanceCh0NaturalViaUi
} from './helpers/playWalkthrough'
import { loadUiFixtureScenarios } from './helpers/playUiFixtures'

test.describe('Ch0 全流程试玩 · 截图 + 文档', () => {
  test.setTimeout(600_000)

  test('interactive S0 → Ch0 weeks → fixture setpieces', async ({ page }) => {
    const startedAt = new Date().toISOString()
    fs.mkdirSync(WALKTHROUGH_OUT_DIR, { recursive: true })
    const recorder = new WalkthroughRecorder(WALKTHROUGH_OUT_DIR)
    let pass = true

    try {
      await page.setViewportSize({ width: 1440, height: 900 })

      // ── 首页 ──
      await clearAllGameSaves(page)
      await recorder.capture(page, {
        id: '01-home-index',
        phase: '首页',
        title: '开局 · StartConfig',
        action: '清除存档后打开 `/`',
        notes: '默认槽位与「签署契约并开始」可见'
      })

      await page.getByRole('button', { name: /签署契约并开始/ }).click()
      await page.waitForURL('**/play**', { timeout: 30_000 })
      await waitForPlayHydrated(page)
      await recorder.capture(page, {
        id: '02-s0-setpiece-start',
        phase: 'S0 入学前夜',
        title: '线性名场面 · 入学面试',
        action: '首页点击「签署契约并开始」→ `/play`'
      })

      // ── Act1 三步 ──
      await completeAct1Interview(page)
      await recorder.capture(page, {
        id: '03-s0-interview-done',
        phase: 'S0 入学前夜',
        title: '面试提交完成',
        action: '8 题均选首项 → 提交并评分',
        notes: '自动进入灵贷首贷大卡'
      })

      await completeAct1Loan(page)
      await recorder.capture(page, {
        id: '04-s0-loan-signed',
        phase: 'S0 入学前夜',
        title: '灵贷签约完成',
        action: '比价表悬停 30s + 滚到底勾选 + 签署并动用',
        notes: '进入家庭账本'
      })

      await completeAct1FamilyShortPath(page)
      await recorder.capture(page, {
        id: '05-s0-family-settled',
        phase: 'S0 入学前夜',
        title: '家庭模块结案',
        action: '培元药剂包 → 知道了 → 你扛下 → 接受迁出'
      })

      await finishAct1Settlement(page)
      await recorder.capture(page, {
        id: '06-ch0-week1-dashboard',
        phase: 'Ch0 四十周契约',
        title: '高中周仪表盘 · 第 1 周',
        action: '制度档案「确认并进入昆墟高中」',
        notes: 'DebtDashboard + WeekPlanPanel'
      })

      // ── Ch0 交互推进（最多 6 轮：来文 + 周计划）──
      for (let round = 0; round < 6; round++) {
        const mandate = await respondMandateInboxIfVisible(page)
        if (mandate) {
          await recorder.capture(page, {
            id: `07-ch0-mandate-r${round + 1}`,
            phase: 'Ch0 四十周契约',
            title: `仙司来文回应 · 轮次 ${round + 1}`,
            action: '选来文首项回应'
          })
        }

        const confirmed = await confirmWeekPlanIfReady(page)
        if (!confirmed && !mandate) break

        if (confirmed) {
          await recorder.capture(page, {
            id: `08-ch0-week-advance-r${round + 1}`,
            phase: 'Ch0 四十周契约',
            title: `周计划确认 · 轮次 ${round + 1}`,
            action: '点击「确认本周计划」推进周次'
          })
        }

        const gateVisible = await page
          .locator('.ExamBossScreen, .BreakthroughScreen, .ContractFinaleScreen')
          .first()
          .isVisible()
          .catch(() => false)
        if (gateVisible) break
      }

      // ── Fixture 节点（种子 + 一次交互）──
      const fixtures = fixtureScenariosForWalkthrough()
      for (const scenario of fixtures) {
        await seedUiFixture(page, scenario)
        await recorder.capture(page, {
          id: `fixture-${scenario.id}-before`,
          phase: 'Ch0 节点屏',
          title: scenario.label,
          action: `Fixture 种子 \`${scenario.id}\``,
          notes: `wait: ${scenario.waitSelector}`
        })

        const interactionNote = await runFixtureInteraction(page, scenario.id)
        if (interactionNote) {
          await recorder.capture(page, {
            id: `fixture-${scenario.id}-after`,
            phase: 'Ch0 节点屏',
            title: `${scenario.label} · 交互后`,
            action: interactionNote
          })
        }
      }

      expect(recorder.steps.length).toBeGreaterThan(10)
    } catch (e) {
      pass = false
      await recorder.capture(page, {
        id: '99-failure-state',
        phase: '错误',
        title: '失败现场',
        action: '捕获异常时页面状态',
        notes: e instanceof Error ? e.message : String(e)
      }).catch(() => {})
      throw e
    } finally {
      const finishedAt = new Date().toISOString()
      recorder.writeMarkdown(WALKTHROUGH_REPORT_PATH, { startedAt, finishedAt, pass })
    }
  })

  test('natural UI 40 weeks · 纯点击通关至履约档案', async ({ page }) => {
    test.setTimeout(600_000)
    const outDir = WALKTHROUGH_OUT_DIR
    fs.mkdirSync(outDir, { recursive: true })

    await page.setViewportSize({ width: 1440, height: 900 })
    await clearAllGameSaves(page)

    const naturalStart = loadUiFixtureScenarios().find((s) => s.id === 'chapter-natural-ch0-start')
    expect(naturalStart, 'chapter-natural-ch0-start fixture').toBeDefined()
    await seedUiFixture(page, naturalStart!)

    await page.screenshot({
      path: path.join(outDir, 'natural-40w-ch0-week1-start.png'),
      fullPage: true
    })

    const steps = await advanceCh0NaturalViaUi(page, 400)
    const collapsed = await page.locator('.RunArchiveView__post-mortem').isVisible().catch(() => false)

    if (collapsed) {
      await page.screenshot({
        path: path.join(outDir, 'natural-40w-collapse-archive.png'),
        fullPage: true
      })
    }

    expect(collapsed, `Ch0 在 ${steps} 步 UI 交互后崩盘（应与 chapterNaturalSim baseline 一致）`).toBe(false)
    expect(steps, 'natural 40 周应推进足够周次').toBeGreaterThan(25)
    await page.locator('.ContractFinale').waitFor({ state: 'visible', timeout: 60_000 })

    await page.screenshot({
      path: path.join(outDir, 'natural-40w-contract-finale.png'),
      fullPage: true
    })

    await page.getByRole('button', { name: '履约结业' }).click()
    await page.locator('.RunArchiveView').waitFor({ state: 'visible', timeout: 30_000 })
    await page.screenshot({
      path: path.join(outDir, 'natural-40w-fulfilled-archive.png'),
      fullPage: true
    })

    await expect(page.locator('.RunArchiveView__post-mortem')).toHaveCount(0)
  })
})
