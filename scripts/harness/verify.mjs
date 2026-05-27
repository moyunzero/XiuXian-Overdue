#!/usr/bin/env node
/**
 * Harness 统一验证入口 — Plan-Execute-Verify 的 Verify 层。
 *
 * Usage:
 *   yarn harness:verify          # 按 git 变更选择 gates
 *   yarn harness:verify --full   # 全部 gates（含慢速 build 除外除非 --with-build）
 *   yarn harness:verify --quick  # 跳过 build 等慢 gate
 *   yarn harness:verify --full --with-build
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { runCommand, tail } from './lib/run.mjs'
import {
  getChangedFiles,
  loadManifest,
  selectContracts,
  selectGates
} from './lib/scope.mjs'

const ROOT = process.cwd()
const args = process.argv.slice(2)
const full = args.includes('--full')
const quick = args.includes('--quick') || (!full && !args.includes('--with-build'))
const withBuild = args.includes('--with-build')
const jsonOut = args.includes('--json')

async function runGate(gate) {
  const result = await runCommand(gate.command, { cwd: ROOT })
  return {
    id: gate.id,
    title: gate.title,
    command: gate.command,
    required: gate.required !== false,
    ...result
  }
}

async function runContractSpecs(contracts) {
  if (!contracts.length) return []

  const specs = [...new Set(contracts.map((c) => c.spec).filter(Boolean))]
  if (!specs.length) return []

  const cmd = `yarn vitest --run ${specs.join(' ')}`
  const result = await runCommand(cmd, { cwd: ROOT })
  return [
    {
      id: 'contracts',
      title: `契约 spec (${specs.length})`,
      command: cmd,
      required: true,
      ...result
    }
  ]
}

function printReport(report) {
  console.log('\n═══════════════════════════════════════')
  console.log('  Harness Verify Report')
  console.log('═══════════════════════════════════════\n')
  console.log(`Mode: ${report.mode}`)
  console.log(`Changed files: ${report.changedFiles.length}`)
  if (report.changedFiles.length > 0 && report.changedFiles.length <= 20) {
    for (const f of report.changedFiles) console.log(`  · ${f}`)
  } else if (report.changedFiles.length > 20) {
    console.log(`  (${report.changedFiles.length} files, use --json for list)`)
  }
  console.log('')

  for (const r of report.results) {
    const icon = r.ok ? '✓' : '✗'
    const req = r.required ? '' : ' (optional)'
    console.log(`${icon} ${r.id}${req} — ${r.title} (${r.ms}ms)`)
    if (!r.ok) {
      const err = tail(r.stderr || r.stdout, 2000)
      if (err) console.log(err.split('\n').map((l) => `    ${l}`).join('\n'))
    }
  }

  console.log('')
  if (report.ok) {
    console.log('HARNESS_OK — safe to mark task complete / open PR')
  } else {
    console.log('HARNESS_FAIL — fix failing gates before delivery')
    const failed = report.results.filter((r) => !r.ok && r.required)
    if (failed.length) {
      console.log('Required failures:', failed.map((f) => f.id).join(', '))
    }
  }
  console.log('')
}

async function main() {
  const manifest = loadManifest(ROOT)
  const changedFiles = full ? [] : getChangedFiles()

  let gates = selectGates(manifest, changedFiles, { full, quick: quick && !withBuild })
  if (full && withBuild) {
    // ensure build included
    const buildGate = manifest.gates.find((g) => g.id === 'build')
    if (buildGate && !gates.some((g) => g.id === 'build')) gates = [...gates, buildGate]
  }

  const contracts = selectContracts(manifest, changedFiles)

  const mode = full ? (withBuild ? 'full+build' : 'full') : quick ? 'scoped-quick' : 'scoped'

  /** @type {Awaited<ReturnType<typeof runGate>>[]} */
  const results = []

  for (const gate of gates) {
    results.push(await runGate(gate))
  }

  const contractResults = await runContractSpecs(contracts)
  results.push(...contractResults)

  const requiredFailed = results.filter((r) => !r.ok && r.required)
  const ok = requiredFailed.length === 0

  const report = {
    ok,
    mode,
    changedFiles,
    gatesRun: gates.map((g) => g.id),
    contractsRun: contracts.map((c) => c.id),
    results: results.map((r) => ({
      id: r.id,
      title: r.title,
      command: r.command,
      required: r.required,
      ok: r.ok,
      code: r.code,
      ms: r.ms
    })),
    timestamp: new Date().toISOString()
  }

  const outDir = join(ROOT, '.harness')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'last-verify.json'), JSON.stringify(report, null, 2))

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printReport(report)
  }

  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
