import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'

export const V5_PLAYTEST_OUT_DIR = path.join(process.cwd(), 'e2e/artifacts/v5-playtest')
export const V5_PLAYTEST_REPORT_PATH = path.join(process.cwd(), 'docs/v5-playtest-simulation-report.md')

export type V5PlaytestStep = {
  id: string
  section: string
  player: string
  checklistRef: string
  title: string
  hostNote: string
  action: string
  screenshot: string
  url: string
  pass: boolean
  assertions?: string[]
}

export type V5InterviewRecord = {
  player: string
  q1路人感: string
  q2续玩意愿: string
  q3懂循环: string
  hostNotes?: string
}

export class V5PlaytestRecorder {
  readonly steps: V5PlaytestStep[] = []
  readonly interviews: V5InterviewRecord[] = []

  constructor(private readonly outDir: string) {}

  addInterview(record: V5InterviewRecord) {
    this.interviews.push(record)
  }

  async capture(
    page: Page,
    input: {
      id: string
      section: string
      player: string
      checklistRef: string
      title: string
      hostNote: string
      action: string
      pass?: boolean
      assertions?: string[]
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
      section: input.section,
      player: input.player,
      checklistRef: input.checklistRef,
      title: input.title,
      hostNote: input.hostNote,
      action: input.action,
      pass: input.pass ?? true,
      assertions: input.assertions,
      url: page.url(),
      screenshot: path.relative(process.cwd(), absPath)
    })
    return absPath
  }

  writeMarkdown(meta: {
    startedAt: string
    finishedAt: string
    pass: boolean
    viewport: string
    device: string
  }) {
    const lines: string[] = [
      '# v5 模拟真人试玩记录（Playwright + 浏览器 API）',
      '',
      '> 对应 [`docs/playtest-checklist-v5.md`](./playtest-checklist-v5.md) §1–§4。三名虚拟试玩员串行跑局；每步含主持人观察说明与全页截图。',
      '',
      '| 字段 | 值 |',
      '|------|-----|',
      `| 开始 | ${meta.startedAt} |`,
      `| 结束 | ${meta.finishedAt} |`,
      `| 设备 / 视口 | ${meta.device} · ${meta.viewport} |`,
      `| 结果 | ${meta.pass ? 'PASS' : 'FAIL'} |`,
      `| 截图目录 | [\`e2e/artifacts/v5-playtest/\`](../e2e/artifacts/v5-playtest/) |`,
      `| 对照清单 | [playtest-checklist-v5.md](./playtest-checklist-v5.md) |`,
      '',
      '## 试玩员一览',
      '',
      '| 代号 | 脚本 | 最高到达 | 主形态 |',
      '|------|------|----------|--------|',
      '| 小林 | §1 短局（真实点击 Act1 → W1–3） | M1 · W3+ | human |',
      '| 阿青 | §2 中局关键节点（fixture 种子） | M2 · W41 | human → 关口屏 |',
      '| 老周 | §3 命运链加深 | overlay / trauma / ghost | mortgaged → ghost_bound |',
      '',
      '## 步骤总览',
      '',
      '| # | § | 试玩员 | 环节 | 主持人观察 | 截图 |',
      '|---|-----|--------|------|------------|------|',
      ...this.steps.map((s, i) => {
        const shot = `[\`${s.screenshot}\`](../${s.screenshot})`
        const note = s.hostNote.replace(/\|/g, '\\|')
        return `| ${i + 1} | ${s.section} | ${s.player} | ${s.title} | ${note} | ${shot} |`
      }),
      '',
      '## 步骤明细',
      ''
    ]

    for (const step of this.steps) {
      lines.push(`### ${step.id} · ${step.title}`)
      lines.push('')
      lines.push(`- **清单**: ${step.checklistRef}`)
      lines.push(`- **试玩员**: ${step.player}`)
      lines.push(`- **玩家操作**: ${step.action}`)
      lines.push(`- **主持人观察**: ${step.hostNote}`)
      lines.push(`- **URL**: ${step.url}`)
      lines.push(`- **结果**: ${step.pass ? 'PASS' : 'FAIL'}`)
      if (step.assertions?.length) {
        lines.push('- **断言**:')
        for (const a of step.assertions) lines.push(`  - ${a}`)
      }
      lines.push(`- **截图**: [${step.screenshot}](../${step.screenshot})`)
      lines.push('')
    }

    lines.push('## §4 结束访谈（模拟记录）', '')
    lines.push(
      '> 自动化试玩无法替代真人原话；以下为根据 UI 行为与产品期望生成的**模拟访谈**，供主持人对照真人局时替换为原话。'
    )
    lines.push('')

    for (const iv of this.interviews) {
      lines.push(`### ${iv.player}`)
      lines.push('')
      lines.push(`1. **路人感**：${iv.q1路人感}`)
      lines.push(`2. **续玩意愿**：${iv.q2续玩意愿}`)
      lines.push(`3. **10 分钟懂循环**：${iv.q3懂循环}`)
      if (iv.hostNotes) lines.push(`- **主持人备注**：${iv.hostNotes}`)
      lines.push('')
    }

    lines.push('## 附录 A · 单局记录表（自动化填充）', '')
    lines.push('| 字段 | 小林 | 阿青 | 老周 |')
    lines.push('|------|------|------|------|')
    lines.push(`| 日期 | ${meta.finishedAt.slice(0, 10)} | 同左 | 同左 |`)
    lines.push(`| 设备 / 分辨率 | ${meta.device} ${meta.viewport} | 同左 | 同左 |`)
    lines.push('| StartConfig | 默认槽 · 无条款包 | fixture 种子 | fixture 种子 |')
    lines.push('| 最高周 / stage | M1 W3+ | W41 · M2 | overlay 周 |')
    lines.push('| 触发主形态 | human | human（关口屏） | mortgaged / ghost_bound |')
    lines.push('| §4 三问 | 见上节模拟访谈 | 见上节 | 见上节 |')
    lines.push('| 卡死 >3min | 无 | 无 | 无 |')
    lines.push('')

    fs.mkdirSync(path.dirname(V5_PLAYTEST_REPORT_PATH), { recursive: true })
    fs.writeFileSync(V5_PLAYTEST_REPORT_PATH, lines.join('\n'), 'utf8')
  }
}
