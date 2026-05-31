#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const JOBS_PATH = path.resolve(__dirname, '../data/jobs.json')
const CARDS_PATH = path.resolve(__dirname, '../data/pressureCards.json')

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

const cardsRaw = readJson(CARDS_PATH)
const jobsJson = readJson(JOBS_PATH)
if (!jobsJson?.jobs || !Array.isArray(jobsJson.jobs)) {
  errors.push('jobs.json 缺少 jobs 数组')
} else {
  const cards = Array.isArray(cardsRaw) ? cardsRaw : cardsRaw?.cards ?? []
  const workCardIds = new Set(
    cards
      .filter((c) => Array.isArray(c.lifeStages) && c.lifeStages.includes('work'))
      .map((c) => c.id)
  )
  const seenIds = new Set()

  for (let i = 0; i < jobsJson.jobs.length; i++) {
    const job = jobsJson.jobs[i]
    const where = `jobs[${i}] id=${job.id ?? '?'}`

    if (typeof job.id !== 'string' || !job.id.trim()) {
      errors.push(`${where}: 缺少 id`)
    } else if (seenIds.has(job.id)) {
      errors.push(`${where}: 重复 id "${job.id}"`)
    } else {
      seenIds.add(job.id)
    }

    if (typeof job.title !== 'string' || !job.title.trim()) {
      errors.push(`${where}: 缺少 title`)
    }
    if (typeof job.description !== 'string') {
      errors.push(`${where}: description 必须是字符串`)
    }
    if (!Array.isArray(job.minEducationTags)) {
      errors.push(`${where}: minEducationTags 必须是数组`)
    } else {
      for (const tag of job.minEducationTags) {
        if (typeof tag !== 'string' || !tag.trim()) {
          errors.push(`${where}: minEducationTags 含非法项`)
        }
      }
    }
    if (typeof job.hourlyPay !== 'number' || job.hourlyPay <= 0) {
      errors.push(`${where}: hourlyPay 须为正数`)
    }
    if (typeof job.harvestRate !== 'number' || job.harvestRate < 0 || job.harvestRate > 1) {
      errors.push(`${where}: harvestRate 须在 [0, 1]`)
    }
    if (!Array.isArray(job.pressureCardUnlocks)) {
      errors.push(`${where}: pressureCardUnlocks 必须是数组`)
    } else {
      for (const cardId of job.pressureCardUnlocks) {
        if (typeof cardId !== 'string' || !cardId.trim()) {
          errors.push(`${where}: pressureCardUnlocks 含非法项`)
        } else if (!workCardIds.has(cardId)) {
          errors.push(
            `${where}: pressureCardUnlocks "${cardId}" 不是 work 段压力牌（见 pressureCards.json）`
          )
        }
      }
    }
  }

  if (jobsJson.jobs.length < 3) {
    errors.push('jobs.json 至少应有 3 个岗位定义')
  }
}

if (errors.length) {
  console.error('validate-jobs: FAILED')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

console.log('validate-jobs: OK')
process.exit(0)
