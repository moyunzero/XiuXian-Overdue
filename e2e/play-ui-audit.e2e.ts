import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { loadUiFixtureScenarios, seedPayloadForScenario, type UiFixtureScenario } from './helpers/playUiFixtures'

const ALL_UI_SCENARIOS = loadUiFixtureScenarios()

const OUT_DIR = path.join(process.cwd(), 'e2e/artifacts/ui-audit')

async function seedScenario(page: import('@playwright/test').Page, scenario: UiFixtureScenario) {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  const payload = seedPayloadForScenario(scenario)
  await page.evaluate((p) => {
    localStorage.removeItem('kunxu_sim_save_v5')
    localStorage.removeItem('kunxu_sim_save_v2')
    if (p.playValue) localStorage.setItem(p.playKey, p.playValue)
    if (p.act1Value) localStorage.setItem(p.act1Key, p.act1Value)
  }, payload)
}

async function captureScenario(
  page: import('@playwright/test').Page,
  scenario: UiFixtureScenario,
  suffix: string
) {
  const viewport = scenario.viewport ?? { width: 1440, height: 900 }
  await page.setViewportSize(viewport)
  await seedScenario(page, scenario)
  await page.goto(scenario.path)
  await page.waitForLoadState('domcontentloaded')
  await page.getByText('载入修行档案').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {})
  if (scenario.waitSelector) {
    await page.locator(scenario.waitSelector).first().waitFor({ state: 'visible', timeout: 30_000 })
  }
  await page.waitForTimeout(400)
  const file = path.join(OUT_DIR, `${scenario.id}${suffix}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

test.describe('Play UI audit · desktop', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  })

  for (const scenario of ALL_UI_SCENARIOS) {
    test(`capture ${scenario.id}`, async ({ page }) => {
      const file = await captureScenario(page, scenario, '')
      await test.info().attach(scenario.label, { path: file, contentType: 'image/png' })
      expect(fs.existsSync(file)).toBeTruthy()
    })
  }
})

test.describe('Play UI audit · mobile', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  })

  const mobileTargets = ALL_UI_SCENARIOS.filter((s) =>
    ['home-index', 'pre-act1-desktop', 'chapter-week-dashboard', 'chapter-mandate-inbox'].includes(
      s.id
    )
  )

  for (const scenario of mobileTargets) {
    test(`capture ${scenario.id} @390`, async ({ page }) => {
      const mobileScenario: UiFixtureScenario = {
        ...scenario,
        viewport: { width: 390, height: 844 }
      }
      const file = await captureScenario(page, mobileScenario, '-mobile')
      await test.info().attach(`${scenario.label} · mobile`, {
        path: file,
        contentType: 'image/png'
      })
      expect(fs.existsSync(file)).toBeTruthy()
    })
  }
})
