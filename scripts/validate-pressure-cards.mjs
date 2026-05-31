#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const CARDS_PATH = path.resolve(__dirname, '../data/pressureCards.json')

/** @type {string[]} */
const errors = []

const ALLOWED_KINDS = ['stat', 'econ', 'school', 'log', 'tag']
const ALLOWED_LIFE_STAGES = ['pre', 'hs', 'uni', 'work']
const STAT_TARGETS = ['daoXin', 'faLi', 'rouTi', 'fatigue', 'focus']
const ECON_TARGETS = [
  'cash',
  'collectionFee',
  'debtPrincipal',
  'debtInterestAccrued',
  'dailyRate',
  'delinquency',
  'lastPaymentDay'
]
const SCHOOL_TARGETS = ['day', 'week', 'lastExamScore', 'lastRank']

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    errors.push(`无法读取 ${filePath}: ${e.message}`)
    return null
  }
}

function validateEffect(effect, where) {
  if (!effect || typeof effect !== 'object') {
    errors.push(`${where}: effect 必须是对象`)
    return
  }
  if (!ALLOWED_KINDS.includes(effect.kind)) {
    errors.push(`${where}: kind "${effect.kind}" 非法，应为 ${ALLOWED_KINDS.join(' | ')}`)
    return
  }
  const p = effect.payload
  if (!p || typeof p !== 'object') {
    errors.push(`${where}: 缺少 payload`)
    return
  }
  if (effect.kind === 'stat') {
    if (!STAT_TARGETS.includes(p.target)) {
      errors.push(`${where}: stat.target "${p.target}" 非法`)
    }
  }
  if (effect.kind === 'econ') {
    if (!ECON_TARGETS.includes(p.target)) {
      errors.push(`${where}: econ.target "${p.target}" 非法`)
    }
  }
  if (effect.kind === 'school') {
    if (!SCHOOL_TARGETS.includes(p.target)) {
      errors.push(`${where}: school.target "${p.target}" 非法`)
    }
  }
  if (effect.kind === 'log') {
    if (typeof p.title !== 'string' || typeof p.detail !== 'string') {
      errors.push(`${where}: log 需 title + detail 字符串`)
    }
  }
  if (effect.kind === 'tag') {
    if (typeof p.tag !== 'string' || !p.tag.trim()) {
      errors.push(`${where}: tag 需非空字符串`)
    }
  }
}

function validateCard(card, index) {
  const where = `cards[${index}] id=${card.id ?? '?'}`
  if (typeof card.id !== 'string' || !card.id.trim()) {
    errors.push(`${where}: 缺少 id`)
  }
  if (typeof card.title !== 'string' || !card.title.trim()) {
    errors.push(`${where}: 缺少 title`)
  }
  if (typeof card.description !== 'string') {
    errors.push(`${where}: 缺少 description`)
  }
  if (!Array.isArray(card.lifeStages) || card.lifeStages.length === 0) {
    errors.push(`${where}: lifeStages 不能为空`)
  } else {
    for (const s of card.lifeStages) {
      if (!ALLOWED_LIFE_STAGES.includes(s)) {
        errors.push(`${where}: lifeStage "${s}" 非法`)
      }
    }
  }
  if (!Array.isArray(card.tags) || card.tags.length === 0) {
    errors.push(`${where}: tags 不能为空`)
  }
  if (!Array.isArray(card.effectsOnPlay) || card.effectsOnPlay.length === 0) {
    errors.push(`${where}: effectsOnPlay 不能为空`)
  } else {
    card.effectsOnPlay.forEach((eff, i) => validateEffect(eff, `${where}.effectsOnPlay[${i}]`))
  }
  if (card.effectsOnSkip) {
    card.effectsOnSkip.forEach((eff, i) => validateEffect(eff, `${where}.effectsOnSkip[${i}]`))
  }
}

const cards = readJson(CARDS_PATH)
if (Array.isArray(cards)) {
  if (cards.length < 12) {
    errors.push(`至少需要 12 张压力牌，当前 ${cards.length}`)
  }
  const ids = new Set()
  cards.forEach((card, i) => {
    validateCard(card, i)
    if (ids.has(card.id)) errors.push(`重复 id: ${card.id}`)
    ids.add(card.id)
  })
  for (const card of cards) {
    for (const ref of card.excludesCardIds ?? []) {
      if (!ids.has(ref)) errors.push(`${card.id}: excludesCardIds 引用未知 ${ref}`)
    }
  }
}

if (errors.length) {
  console.error('validate-pressure-cards FAILED\n')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log(`validate-pressure-cards OK (${cards.length} cards)`)
