import { expect, type Page } from '@playwright/test'

export async function clearAllGameSaves(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.evaluate(() => {
    localStorage.removeItem('kunxu_sim_save_v5')
    localStorage.removeItem('kunxu_sim_save_v2')
    localStorage.removeItem('kunxu_sim_save')
    localStorage.removeItem('kunxu_act1_save')
    localStorage.removeItem('kunxu_sim_meta_v1')
  })
}

export async function waitForPlayHydrated(page: Page) {
  await page.getByText('载入修行档案').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => {})
}

async function dismissLoanAdIfVisible(page: Page) {
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
      await page
        .locator('.InterviewModule__recycle-scene')
        .waitFor({ state: 'hidden', timeout: 5000 })
        .catch(() => {})
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

export async function waitForWeekPlanRegion(page: Page) {
  await page.getByRole('region', { name: /周排程|周仪表盘/ }).waitFor({ state: 'visible', timeout: 30_000 })
}

export async function finishAct1Settlement(page: Page) {
  await page.getByRole('button', { name: '确认并进入昆墟高中' }).click()
  await waitForWeekPlanRegion(page)
}

export async function respondMandateInboxIfVisible(page: Page): Promise<boolean> {
  const inbox = page.locator('.MandateInbox')
  if (!(await inbox.isVisible().catch(() => false))) return false
  await page.locator('.MandateInbox__btn').first().click()
  await inbox.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {})
  return true
}

async function setHourViaRange(page: Page, key: string, hours: number) {
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

/** 短局试玩：手动调参（还款最低 + 刷题8 + 零工10） */
export async function adjustWeekPlanForShortPlay(page: Page) {
  const weekPlan = page.locator('.WeekPlan')
  if (!(await weekPlan.isVisible().catch(() => false))) return

  const repayMin = page.locator('input[name="week-repay"][value="min"]')
  if (await repayMin.isVisible().catch(() => false) && (await repayMin.isEnabled().catch(() => false))) {
    await repayMin.check({ force: true })
  }

  const restBox = page.getByRole('checkbox', { name: /休息一周/ })
  if (await restBox.isVisible().catch(() => false) && (await restBox.isChecked())) {
    await restBox.uncheck()
  }

  await setHourViaRange(page, 'studyHours', 8)
  await setHourViaRange(page, 'parttimeHours', 10)
  await page.waitForTimeout(80)
}

export async function confirmWeekPlanIfReady(page: Page): Promise<boolean> {
  const btn = page.getByRole('button', { name: /开本周|确认本周计划/ })
  if (!(await btn.isVisible().catch(() => false))) return false
  if (await btn.isDisabled()) return false
  await btn.click({ timeout: 8000 })
  await page.waitForTimeout(600)
  return true
}
