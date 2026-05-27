#!/usr/bin/env node
/**
 * 机械分层检查：logic 不得依赖 UI；禁止在 logic 中 import Vue。
 * Agent 改代码后由 harness:verify 自动执行，失败即阻断交付。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()

/** @type {{ pattern: RegExp; message: string }[]} */
const FORBIDDEN_IN_LOGIC = [
  { pattern: /from\s+['"]~\/pages\//, message: 'logic 不得 import pages' },
  { pattern: /from\s+['"]~\/components\//, message: 'logic 不得 import components' },
  { pattern: /from\s+['"]vue['"]/, message: 'logic 不得 import vue' },
  { pattern: /from\s+['"]#app['"]/, message: 'logic 不得 import Nuxt #app' }
]

/** @type {{ pattern: RegExp; message: string }[]} */
const FORBIDDEN_IN_COMPOSABLES = [
  { pattern: /from\s+['"]~\/pages\//, message: 'composables 不得 import pages（编排应通过参数/路由回调）' }
]

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function collectTsFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '.nuxt') continue
      collectTsFiles(full, acc)
    } else if (/\.ts$/.test(name) && !/\.spec\.ts$/.test(name) && !/\.d\.ts$/.test(name)) {
      acc.push(full)
    }
  }
  return acc
}

/**
 * @param {string} file
 * @param {{ pattern: RegExp; message: string }[]} rules
 * @returns {string[]}
 */
function lintFile(file, rules) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  const text = readFileSync(file, 'utf8')
  const hits = []

  for (const { pattern, message } of rules) {
    if (pattern.test(text)) {
      hits.push(`${rel}: ${message}`)
    }
  }
  return hits
}

function main() {
  const logicDir = join(ROOT, 'app/logic')
  const composablesDir = join(ROOT, 'app/composables')
  const hits = []

  for (const file of collectTsFiles(logicDir)) {
    hits.push(...lintFile(file, FORBIDDEN_IN_LOGIC))
  }

  for (const file of collectTsFiles(composablesDir)) {
    hits.push(...lintFile(file, FORBIDDEN_IN_COMPOSABLES))
  }

  if (hits.length > 0) {
    console.error('architecture-check FAILED\n')
    for (const h of hits) console.error(`  - ${h}`)
    console.error('\nFix: move UI imports to pages/components; keep rules in app/logic/*.ts')
    process.exit(1)
  }

  console.log('architecture-check OK (logic/composables boundaries)')
}

main()
