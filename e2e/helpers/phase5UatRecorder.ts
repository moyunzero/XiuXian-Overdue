import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'

export const PHASE5_UAT_OUT_DIR = path.join(process.cwd(), 'e2e/artifacts/phase5-uat')
export const PHASE5_UAT_REPORT_PATH = path.join(process.cwd(), 'docs/phase5-uat-playwright-report.md')

export type Phase5UatStep = {
  testId: number
  testName: string
  title: string
  action: string
  screenshot: string
  url: string
  pass: boolean
  viewport?: string
  notes?: string
  assertions?: string[]
}

export class Phase5UatRecorder {
  readonly steps: Phase5UatStep[] = []

  constructor(private readonly outDir: string) {}

  async capture(
    page: Page,
    input: {
      testId: number
      testName: string
      title: string
      action: string
      pass: boolean
      viewport?: string
      notes?: string
      assertions?: string[]
      fileName?: string
    }
  ) {
    fs.mkdirSync(this.outDir, { recursive: true })
    const fileName =
      input.fileName ?? `test-${input.testId}-${input.title.replace(/\s+/g, '-').slice(0, 40)}.png`
    const absPath = path.join(this.outDir, fileName)
    await page.waitForTimeout(300)
    await page.screenshot({ path: absPath, fullPage: true })
    this.steps.push({
      testId: input.testId,
      testName: input.testName,
      title: input.title,
      action: input.action,
      pass: input.pass,
      viewport: input.viewport,
      notes: input.notes,
      assertions: input.assertions,
      url: page.url(),
      screenshot: path.relative(process.cwd(), absPath)
    })
    return absPath
  }

  writeMarkdown(meta: { startedAt: string; finishedAt: string; harnessOk: boolean }) {
    const byTest = new Map<number, Phase5UatStep[]>()
    for (const s of this.steps) {
      const list = byTest.get(s.testId) ?? []
      list.push(s)
      byTest.set(s.testId, list)
    }

    const lines: string[] = [
      '# Phase 5 UAT · Playwright 自动化验收',
      '',
      '> 对应 `.planning/phases/05-meta-multi-save/05-UAT.md`。覆盖账号档案 codex strip、TraumaArchiveChip、开局条款包与 harness `fate-meta-unlock`。',
      '',
      '| 字段 | 值 |',
      '|------|-----|',
      `| 开始 | ${meta.startedAt} |`,
      `| 结束 | ${meta.finishedAt} |`,
      `| Harness | ${meta.harnessOk ? 'HARNESS_OK' : '未在本轮执行'} |`,
      `| 截图目录 | [\`e2e/artifacts/phase5-uat/\`](../e2e/artifacts/phase5-uat/) |`,
      '',
      '## 用例结果',
      '',
      '| Test | 名称 | 结果 | 截图 |',
      '|------|------|------|------|',
      ...[...byTest.entries()].map(([id, steps]) => {
        const name = steps[0]?.testName ?? ''
        const pass = steps.every((s) => s.pass)
        const shot = steps.map((s) => `\`${s.screenshot}\``).join('<br>')
        return `| ${id} | ${name} | ${pass ? 'PASS' : 'FAIL'} | ${shot} |`
      }),
      '',
      '## 步骤明细',
      ''
    ]

    for (const step of this.steps) {
      lines.push(`### Test ${step.testId} · ${step.title}`)
      lines.push('')
      lines.push(`- **操作**: ${step.action}`)
      if (step.viewport) lines.push(`- **视口**: ${step.viewport}`)
      lines.push(`- **URL**: ${step.url}`)
      lines.push(`- **结果**: ${step.pass ? 'PASS' : 'FAIL'}`)
      if (step.assertions?.length) {
        lines.push('- **断言**:')
        for (const a of step.assertions) lines.push(`  - ${a}`)
      }
      if (step.notes) lines.push(`- **备注**: ${step.notes}`)
      lines.push(`- **截图**: [${step.screenshot}](../${step.screenshot})`)
      lines.push('')
    }

    fs.mkdirSync(path.dirname(PHASE5_UAT_REPORT_PATH), { recursive: true })
    fs.writeFileSync(PHASE5_UAT_REPORT_PATH, lines.join('\n'), 'utf8')
  }
}
