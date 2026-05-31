#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const REALM_PATH = path.resolve(__dirname, '../data/realmTemplates.json')
const COLLAPSE_PATH = path.resolve(__dirname, '../data/collapseEndings.json')

const REALM_IDS = new Set([
  'mortal',
  'qi',
  'foundation',
  'purple',
  'core',
  'nascent',
  'deity',
  'void'
])

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

const realmJson = readJson(REALM_PATH)
const collapseJson = readJson(COLLAPSE_PATH)

if (realmJson?.realms && Array.isArray(realmJson.realms)) {
  const seen = new Set()
  const orders = []
  for (let i = 0; i < realmJson.realms.length; i++) {
    const r = realmJson.realms[i]
    const where = `realms[${i}] id=${r.id ?? '?'}`
    if (!REALM_IDS.has(r.id)) {
      errors.push(`${where}: id "${r.id}" 不在 RealmTierId 联合类型中`)
    }
    if (seen.has(r.id)) {
      errors.push(`${where}: 重复 id "${r.id}"`)
    } else {
      seen.add(r.id)
    }
    if (typeof r.order !== 'number') {
      errors.push(`${where}: order 必须是数字`)
    } else {
      orders.push(r.order)
    }
    if (typeof r.displayName !== 'string' || !r.displayName.trim()) {
      errors.push(`${where}: 缺少 displayName`)
    }
    if (typeof r.harvestRate !== 'number' || r.harvestRate <= 0 || r.harvestRate > 1) {
      errors.push(`${where}: harvestRate 须在 (0, 1]`)
    }
    if (typeof r.maintenanceCoeff !== 'number' || r.maintenanceCoeff < 1) {
      errors.push(`${where}: maintenanceCoeff 须 >= 1`)
    }
    if (!r.breakthroughKpi || typeof r.breakthroughKpi !== 'object') {
      errors.push(`${where}: 缺少 breakthroughKpi`)
    }
    if (typeof r.celebrationCopy !== 'string' || !r.celebrationCopy.trim()) {
      errors.push(`${where}: 缺少 celebrationCopy`)
    }
    if (typeof r.billCopy !== 'string' || !r.billCopy.trim()) {
      errors.push(`${where}: 缺少 billCopy`)
    }
  }
  const sorted = [...orders].sort((a, b) => a - b)
  if (sorted.join(',') !== [...orders].sort((a, b) => a - b).join(',')) {
    errors.push('realms order 须单调递增且无重复')
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) {
      errors.push('realms order 存在重复值')
      break
    }
  }
} else {
  errors.push('realmTemplates.json 缺少 realms 数组')
}

if (collapseJson?.endings && Array.isArray(collapseJson.endings)) {
  const seen = new Set()
  for (let i = 0; i < collapseJson.endings.length; i++) {
    const e = collapseJson.endings[i]
    const where = `endings[${i}] id=${e.id ?? '?'}`
    if (typeof e.id !== 'string' || !e.id.trim()) {
      errors.push(`${where}: 缺少 id`)
    } else if (seen.has(e.id)) {
      errors.push(`${where}: 重复 id`)
    } else {
      seen.add(e.id)
    }
    if (!e.trigger || typeof e.trigger !== 'object') {
      errors.push(`${where}: 缺少 trigger`)
    }
    if (typeof e.title !== 'string' || !e.title.trim()) {
      errors.push(`${where}: 缺少 title`)
    }
    if (typeof e.archiveVerdict !== 'string' || !e.archiveVerdict.trim()) {
      errors.push(`${where}: 缺少 archiveVerdict`)
    }
  }
} else {
  errors.push('collapseEndings.json 缺少 endings 数组')
}

if (errors.length) {
  console.error('validate-realm-templates: FAILED')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}

console.log('validate-realm-templates: OK')
