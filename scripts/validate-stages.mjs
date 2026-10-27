#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

/** @type {string[]} */
const errors = []

const PRIMARY_FATES = new Set([
  'human',
  'indentured',
  'mortgaged',
  'ghost_voluntary',
  'head_jar',
  'ghost_bound',
  'shattered'
])

const LIFE_STAGES = new Set(['hs', 'uni', 'work', 'pre'])
const MANDATE_POOL_KEYS = new Set(['routine', 'nodeBonus', 'family'])
const REQUIRED_STAGE_KEYS = [
  'id',
  'displayName',
  'weekRange',
  'contentPack',
  'chapterId',
  'mandatePools',
  'lifeStages',
  'defaultFate',
  'tagPools',
  'eventPack',
  'unlockMeta'
]

const BANNED_PLAYER_TOKENS = [/mortgaged/i, /head_jar/i, /ghost_bound/i, /primaryFate/i]

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    errors.push(`无法读取 ${filePath}: ${e.message}`)
    return null
  }
}

function rel(p) {
  return path.relative(ROOT, p)
}

function assertPathExists(filePath, where) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(ROOT, filePath)
  if (!fs.existsSync(abs)) {
    errors.push(`${where}: 路径不存在 ${filePath}`)
    return false
  }
  return true
}

function lintPlayerString(value, where) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${where}: 玩家文案须为非空 string`)
    return
  }
  for (const re of BANNED_PLAYER_TOKENS) {
    if (re.test(value)) {
      errors.push(`${where}: 玩家文案含禁止 token (${re})`)
    }
  }
}

function validateStageManifest(filePath, data) {
  const where = rel(filePath)
  for (const key of REQUIRED_STAGE_KEYS) {
    if (!(key in data)) {
      errors.push(`${where}: 缺少必填字段 ${key}`)
    }
  }
  if (!Array.isArray(data.weekRange) || data.weekRange.length !== 2) {
    errors.push(`${where}: weekRange 须为 [from, to]`)
  } else {
    const [from, to] = data.weekRange
    if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
      errors.push(`${where}: weekRange 须为整数且 from <= to`)
    }
  }
  if (!Array.isArray(data.lifeStages) || !data.lifeStages.length) {
    errors.push(`${where}: lifeStages 不能为空`)
  } else {
    for (const stage of data.lifeStages) {
      if (!LIFE_STAGES.has(stage)) {
        errors.push(`${where}: 未知 lifeStage ${stage}`)
      }
    }
  }
  if (!PRIMARY_FATES.has(data.defaultFate)) {
    errors.push(`${where}: defaultFate 须为合法 PrimaryFate`)
  }
  lintPlayerString(data.displayName, `${where}.displayName`)
  if (data.chapterId !== null && typeof data.chapterId !== 'string') {
    errors.push(`${where}: chapterId 须为 string 或 null`)
  }
  if (data.chapterId) {
    assertPathExists(`data/chapters/${data.chapterId}.json`, where)
  }
  if (typeof data.eventPack !== 'string' || !data.eventPack.trim()) {
    errors.push(`${where}: eventPack 须为非空 string`)
  } else {
    assertPathExists(data.eventPack, where)
  }
  if (data.mandatePools && typeof data.mandatePools === 'object') {
    for (const [pool, poolPath] of Object.entries(data.mandatePools)) {
      if (!MANDATE_POOL_KEYS.has(pool)) {
        errors.push(`${where}: 未知 mandate pool key ${pool}`)
      }
      if (typeof poolPath !== 'string' || !poolPath.trim()) {
        errors.push(`${where}: mandatePools.${pool} 须为路径 string`)
      } else {
        assertPathExists(poolPath, `${where}.mandatePools.${pool}`)
      }
    }
  }
  if (data.eventFilter !== undefined) {
    const filter = data.eventFilter
    if (typeof filter !== 'object' || filter === null || Array.isArray(filter)) {
      errors.push(`${where}: eventFilter 须为 object`)
    } else {
      if (filter.includeLifeStages !== undefined) {
        if (!Array.isArray(filter.includeLifeStages)) {
          errors.push(`${where}: eventFilter.includeLifeStages 须为数组`)
        } else {
          for (const stage of filter.includeLifeStages) {
            if (!LIFE_STAGES.has(stage)) {
              errors.push(`${where}: eventFilter 未知 lifeStage ${stage}`)
            }
          }
        }
      }
      for (const key of ['includeIdPrefixes', 'includeIds', 'excludeIds']) {
        if (filter[key] !== undefined && !Array.isArray(filter[key])) {
          errors.push(`${where}: eventFilter.${key} 须为数组`)
        }
      }
    }
  }
}

function validateFateCatalog(filePath, data) {
  const where = rel(filePath)
  if (!PRIMARY_FATES.has(data.id)) {
    errors.push(`${where}: id 须为合法 PrimaryFate`)
  }
  if (data.id !== path.basename(filePath, '.json')) {
    errors.push(`${where}: 文件名与 id 不一致`)
  }
  if (typeof data.playable !== 'boolean') {
    errors.push(`${where}: playable 须为 boolean`)
  }
  lintPlayerString(data.displayName, `${where}.displayName`)
  const shell = data.shell
  if (!shell || typeof shell !== 'object') {
    errors.push(`${where}: shell 缺失`)
    return
  }
  for (const key of ['layoutToken', 'statusBarFields', 'disabledActions', 'scheduleMode']) {
    if (!(key in shell)) {
      errors.push(`${where}: shell 缺少 ${key}`)
    }
  }
}

function triggerKey(rule) {
  const t = rule.trigger ?? {}
  const ids = t.triggerIds ?? (t.triggerId ? [t.triggerId] : [])
  const field = t.field ?? ''
  const valueRef = t.valueRef ?? ''
  return `${(rule.fromFates ?? []).slice().sort().join(',')}|${t.kind}|${ids.slice().sort().join(',')}|${field}|${valueRef}`
}

function validateTransition(filePath, data, seenTriggers) {
  const where = rel(filePath)
  if (typeof data.id !== 'string' || !data.id.trim()) {
    errors.push(`${where}: 缺少 id`)
  }
  if (!Array.isArray(data.fromFates) || !data.fromFates.length) {
    errors.push(`${where}: fromFates 不能为空`)
  } else {
    for (const fate of data.fromFates) {
      if (!PRIMARY_FATES.has(fate)) {
        errors.push(`${where}: 未知 fromFate ${fate}`)
      }
    }
  }
  if (!PRIMARY_FATES.has(data.toFate)) {
    errors.push(`${where}: toFate 须为合法 PrimaryFate`)
  }
  if (!data.trigger || typeof data.trigger !== 'object') {
    errors.push(`${where}: trigger 缺失`)
  } else {
    const key = triggerKey(data)
    if (seenTriggers.has(key)) {
      errors.push(`${where}: 重复 trigger 键 ${key}`)
    }
    seenTriggers.add(key)
  }
  const overlay = data.overlay
  if (!overlay || typeof overlay !== 'object') {
    errors.push(`${where}: overlay 缺失`)
  } else {
    lintPlayerString(overlay.bodyLine, `${where}.overlay.bodyLine`)
    if (overlay.title !== undefined) {
      lintPlayerString(overlay.title, `${where}.overlay.title`)
    }
  }
  if (data.logLine !== undefined) {
    lintPlayerString(data.logLine, `${where}.logLine`)
  }
  if (data.institutionalTags !== undefined) {
    if (!Array.isArray(data.institutionalTags)) {
      errors.push(`${where}: institutionalTags 须为数组`)
    }
  }
}

// --- stages ---
const stagesDir = path.join(ROOT, 'data/stages')
const expectedPacks = ['m0-pre', 'm1-contract', 'm2-hs', 'm3-uni', 'm4-work']
for (const pack of expectedPacks) {
  const filePath = path.join(stagesDir, pack, 'stage.json')
  if (!fs.existsSync(filePath)) {
    errors.push(`缺少 stage manifest data/stages/${pack}/stage.json`)
    continue
  }
  const data = readJson(filePath)
  if (data) validateStageManifest(filePath, data)
}

const m1Path = path.join(stagesDir, 'm1-contract/stage.json')
const ch0Path = path.join(ROOT, 'data/chapters/ch0-forty-week-contract.json')
if (fs.existsSync(m1Path) && fs.existsSync(ch0Path)) {
  const m1 = readJson(m1Path)
  const ch0 = readJson(ch0Path)
  if (m1 && ch0 && JSON.stringify(m1.mandatePools) !== JSON.stringify(ch0.mandatePools)) {
    errors.push('M1 mandatePools 与 ch0-forty-week-contract.json 不一致')
  }
}

// --- fates ---
const fatesDir = path.join(ROOT, 'data/fates')
for (const fateId of PRIMARY_FATES) {
  const filePath = path.join(fatesDir, `${fateId}.json`)
  if (!fs.existsSync(filePath)) {
    errors.push(`缺少 fate catalog data/fates/${fateId}.json`)
    continue
  }
  const data = readJson(filePath)
  if (data) validateFateCatalog(filePath, data)
}

// --- transitions ---
const transitionsDir = path.join(ROOT, 'data/fate-transitions')
const transitionFiles = fs.existsSync(transitionsDir)
  ? fs.readdirSync(transitionsDir).filter((f) => f.endsWith('.json'))
  : []
if (transitionFiles.length < 6) {
  errors.push(`fate-transitions 至少需要 6 个规则文件（当前 ${transitionFiles.length}）`)
}
const seenTriggers = new Set()
for (const file of transitionFiles) {
  const filePath = path.join(transitionsDir, file)
  const data = readJson(filePath)
  if (data) validateTransition(filePath, data, seenTriggers)
}

if (errors.length) {
  console.error('validate-stages: FAILED')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log(
  `validate-stages: OK (${expectedPacks.length} stage(s), ${PRIMARY_FATES.size} fate(s), ${transitionFiles.length} transition(s))`
)
process.exit(0)
