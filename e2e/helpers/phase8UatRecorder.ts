import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'

export const PHASE8_UAT_OUT_DIR = path.join(process.cwd(), 'e2e/artifacts/phase8-uat')
export const PHASE8_UAT_REPORT_PATH = path.join(process.cwd(), 'docs/phase8-uat-playwright-report.md')

export type Phase8UatStep = {
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

export class Phase8UatRecorder {
  readonly steps: Phase8UatStep[] = []

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
      input.fileName ?? `test-${String(input.testId).padStart(2, '0')}-${input.title.replace(/\s+/g, '-').slice(0, 40)}.png`
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
    const byTest = new Map<number, Phase8UatStep[]>()
    for (const s of this.steps) {
      const list = byTest.get(s.testId) ?? []
      list.push(s)
      byTest.set(s.testId, list)
    }

    const lines: string[] = [
      '# Phase 8 UAT · v5 Handoff Preflight',
      '',
      '> 对应 `.planning/phases/08-playtest-harness-gate/08-UAT.md` 与 [playtest-checklist-v5.md](./playtest-checklist-v5.md) §0。串行：上一用例 PASS 才跑下一用例。',
      '',
      '| 字段 | 值 |',
      '|------|-----|',
      `| 开始 | ${meta.startedAt} |`,
      `| 结束 | ${meta.finishedAt} |`,
      `| Harness | ${meta.harnessOk ? 'HARNESS_OK (full)' : '未在本轮执行'} |`,
      `| 截图目录 | [\`e2e/artifacts/phase8-uat/\`](../e2e/artifacts/phase8-uat/) |`,
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

    fs.mkdirSync(path.dirname(PHASE8_UAT_REPORT_PATH), { recursive: true })
    fs.writeFileSync(PHASE8_UAT_REPORT_PATH, lines.join('\n'), 'utf8')
  }
}
