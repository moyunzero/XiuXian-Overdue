#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const EVENTS_PATH = path.resolve(__dirname, '../data/events.json')

/** @type {string[]} */
const errors = []

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    errors.push(`无法读取或解析 JSON：${filePath} - ${e.message}`)
    return null
  }
}

const allowedTones = ['info', 'warn', 'danger', 'ok']
const allowedTier = ['critical', 'normal']
const allowedOptionTones = ['normal', 'primary', 'danger']
const allowedEffectKinds = ['stat', 'econ', 'debt', 'contract', 'school', 'log']
/** EVT-03：社交 / 试功 / 法赛 — 与 data/events.json 中 family 字段一致 */
const EVT03_FAMILIES = ['社交', '试功', '法赛']
/** 计「效果维度」时仅统计 gameplay 类；log 叙事不计入 D-09 双维度 */
const GAMEPLAY_EFFECT_KINDS = ['stat', 'econ', 'debt', 'contract', 'school']
const statTargets = ['daoXin', 'faLi', 'rouTi', 'fatigue', 'focus']
const econTargets = ['cash', 'collectionFee', 'debtPrincipal', 'debtInterestAccrued', 'dailyRate', 'delinquency', 'lastPaymentDay']

function countGameplayDimensions(effects) {
  const kinds = new Set()
  for (const eff of effects) {
    if (eff && GAMEPLAY_EFFECT_KINDS.includes(eff.kind)) kinds.add(eff.kind)
  }
  return kinds.size
}

function validateEvent(event, index) {
  const where = `事件[${index}] id=${event.id ?? '<未填写>'}`

  if (typeof event.id !== 'string' || !event.id.trim()) {
    errors.push(`${where}: 缺少有效的 "id"（必须是非空字符串）。`)
  }
  if (typeof event.title !== 'string' || !event.title.trim()) {
    errors.push(`${where}: 缺少有效的 "title"。`)
  }
  if (typeof event.body !== 'string' || !event.body.trim()) {
    errors.push(`${where}: 缺少有效的 "body"。`)
  }
  if (typeof event.type !== 'string' || !event.type.trim()) {
    errors.push(`${where}: 缺少有效的 "type"。`)
  }

  if (event.family !== undefined) {
    if (typeof event.family !== 'string' || !event.family.trim()) {
      errors.push(`${where}: "family" 若存在必须为非空字符串。`)
    }
  }

  if (event.tier !== undefined && !allowedTier.includes(event.tier)) {
    errors.push(`${where}: tier="${event.tier}" 非法，应为 ${allowedTier.join(' | ')}。`)
  }

  if (event.tone && !allowedTones.includes(event.tone)) {
    errors.push(`${where}: tone="${event.tone}" 非法，应为 ${allowedTones.join(', ')} 之一。`)
  }

  if (!Array.isArray(event.options) || event.options.length === 0) {
    errors.push(`${where}: 必须包含至少一个 "options"。`)
  } else {
    if (event.options.length > 4) {
      errors.push(`${where}: 选项数 ${event.options.length} 超过 D-10 上限 4。`)
    }
    const optionIds = new Set(event.options.map((o) => o.id).filter(Boolean))
    if (typeof event.defaultOptionId === 'string' && event.defaultOptionId.trim()) {
      if (!optionIds.has(event.defaultOptionId)) {
        errors.push(`${where}: defaultOptionId="${event.defaultOptionId}" 不存在于 options[].id（D-16）。`)
      }
    }
    event.options.forEach((opt, optIndex) => validateOption(event, opt, index, optIndex))
  }

  // EVT-03：family 为 社交/试功/法赛 时，至少一个选项含 ≥2 个 gameplay 维度（D-09）
  if (typeof event.family === 'string' && EVT03_FAMILIES.includes(event.family.trim())) {
    let ok = false
    for (const opt of event.options) {
      if (countGameplayDimensions(opt.effects) >= 2) {
        ok = true
        break
      }
    }
    if (!ok) {
      errors.push(
        `${where}: family="${event.family}" 的 EVT-03 事件须至少一个选项的 effects 覆盖 ≥2 个不同维度（stat/econ/debt/contract/school，log 不计）（D-09）。`
      )
    }
  }
}

function validateOption(event, opt, eventIndex, optIndex) {
  const where = `事件[${eventIndex}](${event.id}) 的选项[${optIndex}] id=${opt.id ?? '<未填写>'}`

  if (typeof opt.id !== 'string' || !opt.id.trim()) {
    errors.push(`${where}: 缺少有效的 "id"。`)
  }
  if (typeof opt.label !== 'string' || !opt.label.trim()) {
    errors.push(`${where}: 缺少有效的 "label"。`)
  }
  if (opt.tone && !allowedOptionTones.includes(opt.tone)) {
    errors.push(`${where}: tone="${opt.tone}" 非法，应为 ${allowedOptionTones.join(', ')} 之一。`)
  }

  if (!Array.isArray(opt.effects) || opt.effects.length === 0) {
    errors.push(`${where}: 必须包含至少一个 "effects"。`)
    return
  }

  opt.effects.forEach((eff, effIndex) => validateEffect(eff, where + ` 的效果[${effIndex}]`))
}

function validateEffect(eff, where) {
  if (!eff || typeof eff !== 'object') {
    errors.push(`${where}: effect 不是合法对象。`)
    return
  }
  if (!allowedEffectKinds.includes(eff.kind)) {
    errors.push(`${where}: kind="${eff.kind}" 非法，应为 ${allowedEffectKinds.join(', ')} 之一。`)
    return
  }

  if (eff.kind === 'stat') {
    if (!statTargets.includes(eff.target)) {
      errors.push(`${where}: stat.target="${eff.target}" 非法，应为 ${statTargets.join(', ')} 之一。`)
    }
    if (typeof eff.delta !== 'number') {
      errors.push(`${where}: stat.delta 必须是数字。`)
    }
  }

  if (eff.kind === 'econ') {
    if (!econTargets.includes(eff.target)) {
      errors.push(`${where}: econ.target="${eff.target}" 非法，应为 ${econTargets.join(', ')} 之一。`)
    }
    if (typeof eff.delta !== 'number') {
      errors.push(`${where}: econ.delta 必须是数字。`)
    }
  }

  if (eff.kind === 'debt') {
    if (!['addPrincipal', 'addInterest'].includes(eff.mode)) {
      errors.push(`${where}: debt.mode="${eff.mode}" 非法，应为 addPrincipal 或 addInterest。`)
    }
    if (typeof eff.amount !== 'number') {
      errors.push(`${where}: debt.amount 必须是数字（0 表示使用默认 30% 总债务规则）。`)
    }
  }

  if (eff.kind === 'contract') {
    if (!['active', 'progress', 'vigilance'].includes(eff.target)) {
      errors.push(`${where}: contract.target="${eff.target}" 非法，应为 active/progress/vigilance。`)
    }
  }

  if (eff.kind === 'school') {
    if (eff.target !== 'classTier') {
      errors.push(`${where}: school.target 目前只支持 "classTier"。`)
    }
    if (!['示范班', '普通班', '末位班'].includes(eff.value)) {
      errors.push(`${where}: school.value="${eff.value}" 非法，应为 示范班/普通班/末位班。`)
    }
  }

  if (eff.kind === 'log') {
    if (typeof eff.title !== 'string' || !eff.title.trim()) {
      errors.push(`${where}: log.title 必须是非空字符串。`)
    }
    if (typeof eff.detail !== 'string' || !eff.detail.trim()) {
      errors.push(`${where}: log.detail 必须是非空字符串。`)
    }
    if (eff.tone && !['info', 'warn', 'danger', 'ok'].includes(eff.tone)) {
      errors.push(`${where}: log.tone="${eff.tone}" 非法，应为 info/warn/danger/ok 之一。`)
    }
  }
}

const events = readJson(EVENTS_PATH)

if (Array.isArray(events)) {
  events.forEach((event, index) => validateEvent(event, index))

  // EVT-03：社交 / 试功 / 法赛 每类至少 2 条（D-11）
  const counts = Object.fromEntries(EVT03_FAMILIES.map((f) => [f, 0]))
  for (const event of events) {
    const fam = typeof event.family === 'string' ? event.family.trim() : ''
    if (EVT03_FAMILIES.includes(fam)) counts[fam] += 1
  }
  for (const fam of EVT03_FAMILIES) {
    if (counts[fam] < 2) {
      errors.push(`EVT-03（D-11）：family="${fam}" 的事件至少需 2 条，当前 ${counts[fam]} 条。`)
    }
  }
} else {
  errors.push('events.json 顶层必须是数组。')
}

if (errors.length) {
  console.error('❌ 事件校验失败，共发现以下问题：\n')
  for (const msg of errors) {
    console.error('- ' + msg)
  }
  process.exit(1)
} else {
  console.log('✅ 事件数据通过校验。')
}

