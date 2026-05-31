#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const CHAPTERS_DIR = path.resolve(__dirname, '../data/chapters')

/** @type {string[]} */
const errors = []

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    errors.push(`无法读取 ${filePath}: ${e.message}`)
    return null
  }
}

const files = fs.readdirSync(CHAPTERS_DIR).filter((f) => f.endsWith('.json'))
if (!files.length) {
  errors.push('data/chapters 下无 json 配置')
}

for (const file of files) {
  const config = readJson(path.join(CHAPTERS_DIR, file))
  if (!config) continue
  const where = file

  if (typeof config.id !== 'string' || !config.id.trim()) {
    errors.push(`${where}: 缺少 id`)
  }
  if (typeof config.weekBudget !== 'number' || config.weekBudget < 1) {
    errors.push(`${where}: weekBudget 须为正整数`)
  }
  if (!Array.isArray(config.segments) || !config.segments.length) {
    errors.push(`${where}: segments 不能为空`)
  }
  if (!Array.isArray(config.beats)) {
    errors.push(`${where}: beats 必须是数组`)
  }
  if (!Array.isArray(config.gates)) {
    errors.push(`${where}: gates 必须是数组`)
  }

  const gateIds = new Set((config.gates ?? []).map((g) => g.id))
  for (const beat of config.beats ?? []) {
    if (typeof beat.week !== 'number' || beat.week < 1 || beat.week > config.weekBudget) {
      errors.push(`${where}: beat week ${beat.week} 超出 [1, weekBudget]`)
    }
    if (beat.gateId && !gateIds.has(beat.gateId)) {
      errors.push(`${where}: beat week ${beat.week} 引用未知 gate ${beat.gateId}`)
    }
  }

  for (const seg of config.segments ?? []) {
    if (seg.weekFrom > seg.weekTo) {
      errors.push(`${where}: segment ${seg.id} weekFrom > weekTo`)
    }
    if (seg.weekTo > config.weekBudget) {
      errors.push(`${where}: segment ${seg.id} weekTo 超出 weekBudget`)
    }
  }
}

if (errors.length) {
  console.error('validate-chapters: FAILED')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log(`validate-chapters: OK (${files.length} file(s))`)
process.exit(0)
