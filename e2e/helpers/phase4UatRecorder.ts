import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'

export const PHASE4_UAT_OUT_DIR = path.join(process.cwd(), 'e2e/artifacts/phase4-uat')
export const PHASE4_UAT_REPORT_PATH = path.join(process.cwd(), 'docs/phase4-uat-playwright-report.md')

export type Phase4UatStep = {
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
  layoutNotes?: string[]
}

export type Phase4LayoutFinding = {
  area: string
  viewport: string
  severity: 'suggestion' | 'minor' | 'major'
  observation: string
  recommendation: string
  screenshot?: string
}

export class Phase4UatRecorder {
  readonly steps: Phase4UatStep[] = []
  readonly layoutFindings: Phase4LayoutFinding[] = []

  constructor(private readonly outDir: string) {}

  addLayoutFinding(finding: Phase4LayoutFinding) {
    this.layoutFindings.push(finding)
  }

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
      layoutNotes?: string[]
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
      layoutNotes: input.layoutNotes,
      url: page.url(),
      screenshot: path.relative(process.cwd(), absPath)
    })
    return absPath
  }

  writeMarkdown(meta: { startedAt: string; finishedAt: string; harnessOk: boolean }) {
    const byTest = new Map<number, Phase4UatStep[]>()
    for (const s of this.steps) {
      const list = byTest.get(s.testId) ?? []
      list.push(s)
      byTest.set(s.testId, list)
    }

    const lines: string[] = [
      '# Phase 4 UAT · Playwright 自动化验收',
      '',
      '> 对应 `.planning/phases/04-fate-slice-shells/04-UAT.md`。覆盖 head_jar 委托面板、mortgaged 四格+抽血、human 基线、灵籍更新 overlay 与 FateShell 主题。',
      '',
      '| 字段 | 值 |',
      '|------|-----|',
      `| 开始 | ${meta.startedAt} |`,
      `| 结束 | ${meta.finishedAt} |`,
      `| Harness | ${meta.harnessOk ? 'HARNESS_OK' : '未在本轮执行'} |`,
      `| 截图目录 | [\`e2e/artifacts/phase4-uat/\`](../e2e/artifacts/phase4-uat/) |`,
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
      '## UI 布局分析',
      '',
      '基于各环节全页截图的静态审阅（1440×900 桌面 + 390×844 窄屏）。',
      ''
    ]

    if (this.layoutFindings.length === 0) {
      lines.push('_本轮未记录结构化布局项。_', '')
    } else {
      lines.push(
        '| 区域 | 视口 | 严重度 | 观察 | 建议 | 截图 |',
        '|------|------|--------|------|------|------|'
      )
      for (const f of this.layoutFindings) {
        const shot = f.screenshot ? `\`${f.screenshot}\`` : '—'
        lines.push(
          `| ${f.area} | ${f.viewport} | ${f.severity} | ${f.observation} | ${f.recommendation} | ${shot} |`
        )
      }
      lines.push('')
    }

    lines.push('## 步骤明细', '')

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
      if (step.layoutNotes?.length) {
        lines.push('- **布局备注**:')
        for (const n of step.layoutNotes) lines.push(`  - ${n}`)
      }
      if (step.notes) lines.push(`- **备注**: ${step.notes}`)
      lines.push(`- **截图**: [${step.screenshot}](../${step.screenshot})`)
      lines.push('')
    }

    fs.mkdirSync(path.dirname(PHASE4_UAT_REPORT_PATH), { recursive: true })
    fs.writeFileSync(PHASE4_UAT_REPORT_PATH, lines.join('\n'), 'utf8')
  }
}
