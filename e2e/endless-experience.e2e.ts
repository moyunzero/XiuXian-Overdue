import { test, expect, type Page } from '@playwright/test'

const START_BTN = '开始修行'
const ENTER_HS_BTN = '确认并进入昆墟高中'
const SAVE_KEY = 'kunxu_sim_save_v5'

async function clickIfEnabled(page: Page, pattern: RegExp | string): Promise<boolean> {
  const btn = page.getByRole('button', { name: pattern }).first()
  if (await btn.count()) {
    if (await btn.isEnabled()) {
      await btn.click()
      return true
    }
  }
  return false
}

async function chooseFirstEnabledAnswer(page: Page): Promise<boolean> {
  const buttons = page.locator('main button')
  const total = await buttons.count()
  for (let i = 0; i < total; i++) {
    const btn = buttons.nth(i)
    if (!(await btn.isEnabled())) continue
    const text = (await btn.innerText()).trim()
    if (
      ['上一步', '下一题', '提交并评分', '确认出牌'].includes(text) ||
      text.includes('完成入学面试登记') ||
      text.includes('处理灵贷弹窗与首笔借款') ||
      text.includes('核对家庭账本与家人去向')
    ) {
      continue
    }
    await btn.click()
    return true
  }
  return false
}

async function scrollAllContainersToBottom(page: Page): Promise<void> {
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll<HTMLElement>('*'))
    for (const el of all) {
      const style = window.getComputedStyle(el)
      const canScroll = /(auto|scroll)/.test(style.overflowY || '') && el.scrollHeight > el.clientHeight
      if (canScroll) el.scrollTop = el.scrollHeight
    }
    window.scrollTo(0, document.body.scrollHeight)
  })
}

async function completeAct1Prelude(page: Page): Promise<void> {
  // Walk through S0 using robust interaction heuristics.
  for (let i = 0; i < 260; i++) {
    if (await clickIfEnabled(page, ENTER_HS_BTN)) return

    // Interview path
    await chooseFirstEnabledAnswer(page)
    await clickIfEnabled(page, /下一题|提交并评分|完成入学面试登记/)

    // Loan popups/dialogs
    await clickIfEnabled(page, /关闭|领取额度|知道了|了解更多|申请宽限/)
    const checkbox = page.locator('input[type="checkbox"]').first()
    if (await checkbox.count()) {
      await scrollAllContainersToBottom(page)
      if (await checkbox.isEnabled()) {
        await checkbox.check()
      }
      await clickIfEnabled(page, /签署并动用/)
      await clickIfEnabled(page, /处理灵贷弹窗与首笔借款/)
    }

    // Family ledger & settlement path
    await clickIfEnabled(page, /向家里要/)
    await clickIfEnabled(page, /你扛下，不联系家人|联系家人/)
    await clickIfEnabled(page, /接受迁出|支付挽留金|再签家庭周转贷/)
    await clickIfEnabled(page, /完整制度档案|核对家庭账本与家人去向/)

    // give UI time to settle
    await page.waitForTimeout(80)
  }

  await expect(page.getByRole('button', { name: ENTER_HS_BTN })).toBeVisible()
  await page.getByRole('button', { name: ENTER_HS_BTN }).click()
}

async function pickGrowthCardsAndResolveRound(page: Page): Promise<void> {
  const preference = ['吐纳调息', '刷题到闭馆', '月考冲刺', '图书馆占座', '炼体公示', '硬睡四小时']
  const pickedTexts = new Set<string>()
  let picked = 0
  for (const key of preference) {
    const card = page.getByRole('button', { name: new RegExp(key) }).first()
    if (await card.count()) {
      const text = (await card.innerText()).trim()
      await card.click()
      pickedTexts.add(text)
      picked += 1
      if (picked >= 2) break
    }
  }

  // Fallback: if preference cards don't reach 2 picks, fill with first available cards.
  if (picked < 2) {
    const fallbackCards = await pressureCardButtons(page)
    const total = await fallbackCards.count()
    for (let i = 0; i < total && picked < 2; i++) {
      const card = fallbackCards.nth(i)
      const text = (await card.innerText()).trim()
      if (pickedTexts.has(text)) continue
      await card.click()
      pickedTexts.add(text)
      picked += 1
    }
  }

  const confirm = page.getByRole('button', { name: '确认出牌' })
  await expect(confirm).toBeEnabled()
  await confirm.click()
}

async function pickNaturalProgressCardsAndResolveRound(page: Page): Promise<void> {
  const preference = [
    '最低还款',
    '工位硬睡',
    '静室硬睡',
    '硬睡四小时',
    '吐纳调息',
    '图书馆占座',
    '月考冲刺',
    '闭关筑基',
    '功法订阅加练',
    '发薪日扣款',
    '零工换现',
    '宗门杂务'
  ]
  const avoid = ['登记躺平', '预支薪水', '灵贷续命', '躲催收话术']

  const cards = await pressureCardButtons(page)
  const count = await cards.count()
  const picked = new Set<number>()

  const textAt = async (i: number) => (await cards.nth(i).innerText()).trim()
  const clickAt = async (i: number) => {
    if (picked.has(i)) return
    await cards.nth(i).click()
    picked.add(i)
  }

  for (const key of preference) {
    for (let i = 0; i < count; i++) {
      if (picked.size >= 2) break
      const txt = await textAt(i)
      if (txt.includes(key) && !avoid.some((a) => txt.includes(a))) {
        await clickAt(i)
      }
    }
    if (picked.size >= 2) break
  }

  if (picked.size < 2) {
    for (let i = 0; i < count && picked.size < 2; i++) {
      const txt = await textAt(i)
      if (avoid.some((a) => txt.includes(a))) continue
      await clickAt(i)
    }
  }

  if (picked.size < 2) {
    for (let i = 0; i < count && picked.size < 2; i++) {
      await clickAt(i)
    }
  }

  const confirm = page.getByRole('button', { name: '确认出牌' })
  await expect(confirm).toBeEnabled()
  await confirm.click()
}

async function pressureCardButtons(page: Page) {
  const region = page.getByRole('region', { name: '压力牌：四选二' })
  return region.locator('button').filter({ hasNotText: '确认出牌' })
}

async function mutateActiveRun(page: Page, mutator: (run: any) => any): Promise<void> {
  await page.evaluate(
    ([key, mutatorSource]) => {
      const raw = localStorage.getItem(key)
      if (!raw) throw new Error('missing save container')
      const container = JSON.parse(raw)
      const activeRunId = container.activeRunId
      if (!activeRunId || !container.runs?.[activeRunId]) throw new Error('missing active run')
      const fn = new Function('run', `"use strict"; return (${mutatorSource})(run);`) as (run: any) => any
      const nextRun = fn(container.runs[activeRunId])
      container.runs[activeRunId] = { ...nextRun, updatedAt: new Date().toISOString() }
      localStorage.setItem(key, JSON.stringify(container))
    },
    [SAVE_KEY, mutator.toString()]
  )
}

test('all game stages and setpieces are reachable', async ({ page }) => {
  await page.goto('/')
  await clickIfEnabled(page, /清空存档/)
  await page.getByRole('button', { name: START_BTN }).click()

  await completeAct1Prelude(page)

  await expect(page.getByText(/高中 ·/)).toBeVisible()
  await expect(page.getByText('本回合 · 四选二')).toBeVisible()
  await expect(page.getByRole('heading', { name: '回合记录' })).toBeVisible()

  // Experience quality checkpoint 1:
  // each round should offer meaningful choice surface.
  const roundCards = await pressureCardButtons(page)
  const cardCount = await roundCards.count()
  expect(cardCount).toBeGreaterThanOrEqual(4)

  // Experience quality checkpoint 2:
  // play several rounds and ensure card titles rotate (not same tiny subset forever).
  const seenTitles = new Set<string>()
  for (let i = 0; i < 4; i++) {
    const titles = await roundCards.allInnerTexts()
    for (const t of titles) {
      const cleaned = t.trim()
      if (cleaned.length > 0) seenTitles.add(cleaned)
    }
    await pickGrowthCardsAndResolveRound(page)
    await page.waitForTimeout(120)
    // clear potential modal interruptions
    await clickIfEnabled(page, /知道了|申请宽限/)
    if (await clickIfEnabled(page, /确认破境|确认/)) break
  }
  expect(seenTitles.size).toBeGreaterThanOrEqual(6)

  // Force breakthrough setpiece and verify full interaction.
  await mutateActiveRun(page, (run: any) => ({
    ...run,
    setpiece: {
      ...(run.setpiece ?? {}),
      breakthroughPending: {
        currentRealmId: 'qi',
        nextRealmId: 'foundation',
        currentRealmLabel: '练气',
        nextRealmLabel: '筑基',
        celebrationLine: '你通过了第一轮破境考核。',
        billLines: ['庆典后利息上浮。', '抽成继续增长。', '负债清零不算胜利。'],
        totalDebt: 25000,
        maintenanceBumpLabel: '维护费系数上调',
        billRevealSeconds: 15
      }
    }
  }))
  await page.goto('/play')
  await expect(page.getByRole('dialog', { name: /庆典灯未灭/ })).toBeVisible()
  await page.getByRole('button', { name: /确认破境/ }).click()
  await expect(page.getByRole('dialog', { name: /庆典灯未灭/ })).toHaveCount(0)

  // Force UNI stage and verify it is rendered.
  await mutateActiveRun(page, (run: any) => ({
    ...run,
    lifeStage: 'uni',
    setpiece: { ...(run.setpiece ?? {}), breakthroughPending: undefined, bodyMortgagePending: undefined }
  }))
  await page.goto('/play')
  await expect(page.getByText(/大学 ·/)).toBeVisible()
  await expect(page.getByText('本回合 · 四选二')).toBeVisible()

  // Force WORK stage without job, verify job choice screen.
  await mutateActiveRun(page, (run: any) => ({
    ...run,
    lifeStage: 'work',
    work: run.work ?? {
      jobId: null,
      educationTags: ['hs-grad'],
      monthlyTarget: 4500,
      kpiScore: 0,
      shameEvents: 0
    },
    setpiece: { ...(run.setpiece ?? {}), breakthroughPending: undefined, bodyMortgagePending: undefined }
  }))
  await page.goto('/play')
  await expect(page.getByRole('dialog', { name: /职场通行证已签发/ })).toBeVisible()
  await page.locator('.JobChoice__btn').first().click()
  await expect(page.getByRole('heading', { name: '回合记录' })).toBeVisible()

  // Force body mortgage (optional), verify refuse path.
  await mutateActiveRun(page, (run: any) => ({
    ...run,
    lifeStage: 'work',
    setpiece: {
      ...(run.setpiece ?? {}),
      bodyMortgagePending: {
        mandatory: false,
        offers: [
          {
            partId: 'LeftPalm',
            label: '左手掌',
            repaymentValue: 3200,
            lockedDebtAdded: 3200,
            mortgageType: 'debt_reduction',
            narrative: '减债型抵押',
            irreversible: true
          }
        ]
      }
    }
  }))
  await page.goto('/play')
  await expect(page.getByRole('dialog', { name: /身体抵押/ })).toBeVisible()
  await page.getByRole('button', { name: /拒绝（继续承受压力）/ }).click()
  await expect(page.getByRole('dialog', { name: /身体抵押/ })).toHaveCount(0)

  // Force body mortgage (mandatory), verify accept path.
  await mutateActiveRun(page, (run: any) => ({
    ...run,
    lifeStage: 'work',
    setpiece: {
      ...(run.setpiece ?? {}),
      bodyMortgagePending: {
        mandatory: true,
        offers: [
          {
            partId: 'RightPalm',
            label: '右手掌',
            repaymentValue: 3600,
            lockedDebtAdded: 3600,
            mortgageType: 'debt_reduction',
            narrative: '减债型抵押',
            irreversible: true
          }
        ]
      }
    }
  }))
  await page.goto('/play')
  await expect(page.getByRole('dialog', { name: /身体抵押/ })).toBeVisible()
  await page.getByRole('button', { name: /抵押 右手掌/ }).click()
  await expect(page.getByRole('dialog', { name: /身体抵押/ })).toHaveCount(0)
  const hasLien = await page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const container = JSON.parse(raw)
    const run = container.runs?.[container.activeRunId]
    if (!run) return false
    return Array.isArray(run.bodyLiens) && run.bodyLiens.some((id: string) => id.includes('RightPalm'))
  }, SAVE_KEY)
  expect(hasLien).toBeTruthy()
})

test('natural long-run reaches uni and work without save injection', async ({ page }) => {
  test.setTimeout(8 * 60 * 1000)

  await page.goto('/')
  await clickIfEnabled(page, /清空存档/)
  await page.getByRole('button', { name: START_BTN }).click()
  await completeAct1Prelude(page)

  let sawUni = false
  let sawWork = false
  let breakthroughConfirms = 0

  for (let round = 0; round < 150; round++) {
    const body = await page.locator('body').innerText()

    if (body.includes('无尽境崩盘')) {
      throw new Error(`natural run collapsed at round ${round}`)
    }

    if (body.includes('庆典灯未灭')) {
      await page.getByRole('button', { name: /确认破境/ }).click()
      breakthroughConfirms += 1
      await page.waitForTimeout(80)
      continue
    }

    if (body.includes('身体抵押')) {
      if (await page.getByRole('button', { name: /拒绝（继续承受压力）/ }).count()) {
        await page.getByRole('button', { name: /拒绝（继续承受压力）/ }).click()
      } else {
        await page.locator('.BodyMortgage__accept').first().click()
      }
      await page.waitForTimeout(80)
      continue
    }

    if (body.includes('职场通行证已签发')) {
      await page.locator('.JobChoice__btn').first().click()
      await page.waitForTimeout(80)
      continue
    }

    if (body.includes('大学 ·')) sawUni = true
    if (body.includes('职场 ·')) {
      sawWork = true
      break
    }

    const canPlayRound = await page.getByText('本回合 · 四选二').count()
    if (!canPlayRound) {
      await page.waitForTimeout(120)
      continue
    }

    await pickNaturalProgressCardsAndResolveRound(page)
    await page.waitForTimeout(90)
  }

  expect(sawUni).toBeTruthy()
  expect(sawWork).toBeTruthy()
  expect(breakthroughConfirms).toBeGreaterThanOrEqual(2)
})

