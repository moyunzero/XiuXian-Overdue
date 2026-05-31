#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const TEMPLATES_PATH = path.resolve(__dirname, '../data/inboxTemplates.json')

/** @type {string[]} */
const errors = []

const ALLOWED_LIFE_STAGES = ['pre', 'hs', 'uni', 'work']
const ALLOWED_THREAD_KINDS = ['family', 'loan', 'system', 'sect', 'employer']
const ALLOWED_CLASS_TIERS = ['示范班', '普通班', '末位班']

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    errors.push(`无法读取 ${filePath}: ${e.message}`)
    return null
  }
}

function validateTrigger(trigger, where) {
  if (!trigger || typeof trigger !== 'object') {
    errors.push(`${where}: trigger 必须是对象`)
    return
  }
  if (trigger.lifeStage !== undefined && !ALLOWED_LIFE_STAGES.includes(trigger.lifeStage)) {
    errors.push(`${where}: lifeStage "${trigger.lifeStage}" 非法`)
  }
  if (trigger.chapterIndex !== undefined && typeof trigger.chapterIndex !== 'number') {
    errors.push(`${where}: chapterIndex 必须是数字`)
  }
  if (trigger.minDay !== undefined && typeof trigger.minDay !== 'number') {
    errors.push(`${where}: minDay 必须是数字`)
  }
  if (trigger.maxDay !== undefined && typeof trigger.maxDay !== 'number') {
    errors.push(`${where}: maxDay 必须是数字`)
  }
  if (trigger.minDelinquency !== undefined && typeof trigger.minDelinquency !== 'number') {
    errors.push(`${where}: minDelinquency 必须是数字`)
  }
  if (trigger.classTierIn !== undefined) {
    if (!Array.isArray(trigger.classTierIn)) {
      errors.push(`${where}: classTierIn 必须是数组`)
    } else {
      for (const t of trigger.classTierIn) {
        if (!ALLOWED_CLASS_TIERS.includes(t)) errors.push(`${where}: classTierIn 含非法 "${t}"`)
      }
    }
  }
  if (trigger.tags !== undefined && !Array.isArray(trigger.tags)) {
    errors.push(`${where}: tags 必须是数组`)
  }
}

function validateTemplate(tpl, index) {
  const where = `templates[${index}] id=${tpl.id ?? '?'}`
  if (typeof tpl.id !== 'string' || !tpl.id.trim()) errors.push(`${where}: 缺少 id`)
  if (typeof tpl.threadId !== 'string' || !tpl.threadId.trim()) errors.push(`${where}: 缺少 threadId`)
  if (typeof tpl.threadKind !== 'string' || !ALLOWED_THREAD_KINDS.includes(tpl.threadKind)) {
    errors.push(`${where}: threadKind 非法`)
  }
  if (typeof tpl.threadTitle !== 'string' || !tpl.threadTitle.trim()) {
    errors.push(`${where}: 缺少 threadTitle`)
  }
  if (typeof tpl.sender !== 'string' || !tpl.sender.trim()) errors.push(`${where}: 缺少 sender`)
  if (typeof tpl.title !== 'string' || !tpl.title.trim()) errors.push(`${where}: 缺少 title`)
  if (typeof tpl.body !== 'string' || !tpl.body.trim()) errors.push(`${where}: 缺少 body`)
  if (typeof tpl.required !== 'boolean') errors.push(`${where}: required 必须是 boolean`)
  validateTrigger(tpl.trigger, `${where}.trigger`)
  if (tpl.preview !== undefined && typeof tpl.preview !== 'string') {
    errors.push(`${where}: preview 必须是字符串`)
  }
}

const templates = readJson(TEMPLATES_PATH)
if (Array.isArray(templates)) {
  if (templates.length < 3) errors.push(`至少需要 3 条模板，当前 ${templates.length}`)
  const ids = new Set()
  templates.forEach((tpl, i) => {
    validateTemplate(tpl, i)
    if (ids.has(tpl.id)) errors.push(`重复 id: ${tpl.id}`)
    ids.add(tpl.id)
  })
}

if (errors.length) {
  console.error('validate-inbox-templates FAILED\n')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log(`validate-inbox-templates OK (${templates.length} templates)`)
