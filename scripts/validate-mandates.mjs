#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const MANDATES_DIR = path.resolve(__dirname, '../data/mandates')

/** @type {string[]} */
const errors = []

const EFFECT_KINDS = new Set([
  'cash',
  'delinquency',
  'domestication',
  'numbness',
  'supplyCutStreak',
  'institutionalTag',
  'log',
  'queueMandate',
  'primaryFateTransition'
])

const PRIMARY_FATES = new Set([
  'human',
  'indentured',
  'mortgaged',
  'ghost_voluntary',
  'head_jar',
  'ghost_bound',
  'shattered'
])

const INSTITUTIONAL_TAG_IDS = new Set([
  'supply_cut',
  'credit_blacklist',
  'exam_probation',
  'mandate_flood',
  'family_leverage',
  'organelle_liens',
  'ghost_chain_seed'
])

const POOLS = new Set(['routine', 'nodeBonus', 'family'])
const LIFE_STAGES = new Set(['hs', 'uni', 'work'])

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    errors.push(`无法读取 ${filePath}: ${e.message}`)
    return null
  }
}

if (!fs.existsSync(MANDATES_DIR)) {
  errors.push('data/mandates 目录不存在')
}

const files = fs.existsSync(MANDATES_DIR)
  ? fs.readdirSync(MANDATES_DIR).filter((f) => f.endsWith('.json'))
  : []

if (!files.length) {
  errors.push('data/mandates 下无 json 配置')
}

const seenIds = new Set()

for (const file of files) {
  const where = `data/mandates/${file}`
  const data = readJson(path.join(MANDATES_DIR, file))
  if (!data) continue

  if (!Array.isArray(data) || !data.length) {
    errors.push(`${where}: 须为非空数组`)
    continue
  }

  for (const def of data) {
    const prefix = `${where} · ${def.id ?? '(无 id)'}`

    if (typeof def.id !== 'string' || !def.id.trim()) {
      errors.push(`${where}: 条目缺少 id`)
      continue
    }
    if (seenIds.has(def.id)) {
      errors.push(`${prefix}: id 重复`)
    }
    seenIds.add(def.id)

    if (typeof def.title !== 'string' || !def.title.trim()) {
      errors.push(`${prefix}: 缺少 title`)
    }
    if (typeof def.body !== 'string' || !def.body.trim()) {
      errors.push(`${prefix}: 缺少 body`)
    }
    if (!Array.isArray(def.lifeStages) || !def.lifeStages.length) {
      errors.push(`${prefix}: lifeStages 不能为空`)
    } else {
      for (const stage of def.lifeStages) {
        if (!LIFE_STAGES.has(stage)) {
          errors.push(`${prefix}: 未知 lifeStage ${stage}`)
        }
      }
    }
    if (typeof def.pool !== 'string' || !POOLS.has(def.pool)) {
      errors.push(`${prefix}: pool 须为 routine | nodeBonus | family`)
    }
    if (!Array.isArray(def.responses) || def.responses.length < 2) {
      errors.push(`${prefix}: responses 至少 2 条`)
      continue
    }

    if (def.issuerTag !== undefined && typeof def.issuerTag !== 'string') {
      errors.push(`${prefix}: issuerTag 须为 string`)
    }
    const OPTIONAL_ARRAY_FIELDS = ['stageIds', 'primaryFates', 'requiresInstitutionalTags']
    for (const key of OPTIONAL_ARRAY_FIELDS) {
      if (def[key] !== undefined && !Array.isArray(def[key])) {
        errors.push(`${prefix}: ${key} 须为数组`)
      }
    }
    if (def.weight !== undefined && typeof def.weight !== 'number') {
      errors.push(`${prefix}: weight 须为 number`)
    }
    if (def.minEffectCount !== undefined && typeof def.minEffectCount !== 'number') {
      errors.push(`${prefix}: minEffectCount 须为 number`)
    }

    const responseIds = new Set()
    for (const resp of def.responses) {
      if (typeof resp.id !== 'string' || !resp.id.trim()) {
        errors.push(`${prefix}: response 缺少 id`)
        continue
      }
      if (responseIds.has(resp.id)) {
        errors.push(`${prefix}: response id 重复 ${resp.id}`)
      }
      responseIds.add(resp.id)
      if (typeof resp.label !== 'string' || !resp.label.trim()) {
        errors.push(`${prefix} · ${resp.id}: 缺少 label`)
      }
      if (!Array.isArray(resp.effects) || !resp.effects.length) {
        errors.push(`${prefix} · ${resp.id}: effects 不能为空`)
        continue
      }
      for (const effect of resp.effects) {
        if (!EFFECT_KINDS.has(effect.kind)) {
          errors.push(`${prefix} · ${resp.id}: 未知 effect.kind ${effect.kind}`)
        }
        if (effect.kind === 'log') {
          if (typeof effect.message !== 'string' || !effect.message.trim()) {
            errors.push(`${prefix} · ${resp.id}: log effect 须含 message`)
          }
        } else if (effect.kind === 'institutionalTag') {
          if (typeof effect.tagId !== 'string' || !INSTITUTIONAL_TAG_IDS.has(effect.tagId)) {
            errors.push(`${prefix} · ${resp.id}: institutionalTag 须含合法 tagId`)
          }
          if (effect.expiryWeek !== undefined && typeof effect.expiryWeek !== 'number') {
            errors.push(`${prefix} · ${resp.id}: institutionalTag expiryWeek 须为 number`)
          }
        } else if (effect.kind === 'queueMandate') {
          if (typeof effect.mandateId !== 'string' || !effect.mandateId.trim()) {
            errors.push(`${prefix} · ${resp.id}: queueMandate 须含 mandateId`)
          }
        } else if (effect.kind === 'primaryFateTransition') {
          if (typeof effect.toFate !== 'string' || !PRIMARY_FATES.has(effect.toFate)) {
            errors.push(`${prefix} · ${resp.id}: primaryFateTransition 须含合法 toFate`)
          }
        } else if (typeof effect.value !== 'number') {
          errors.push(`${prefix} · ${resp.id}: ${effect.kind} effect 须含 number value`)
        }
      }
    }
  }
}

if (errors.length) {
  console.error('validate-mandates: FAILED')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log(`validate-mandates: OK (${files.length} file(s), ${seenIds.size} mandate(s))`)
process.exit(0)
