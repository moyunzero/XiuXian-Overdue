import fs from 'node:fs'
import { z } from 'zod'
import { formatZodErrors } from './format-zod-errors.ts'

const REALM_TIER_IDS = [
  'mortal',
  'qi',
  'foundation',
  'purple',
  'core',
  'nascent',
  'deity',
  'void'
] as const

const capitalismSkinSchema = z.object({
  rankingLabel: z.string().min(1),
  employerLabel: z.string().min(1),
  loanProductNames: z.array(z.string().min(1)).min(1),
  maintenanceLabels: z.array(z.string().min(1)).min(1)
})

const loanProductSchema = z.object({
  id: z.string().min(1),
  maxDraw: z.number(),
  dailyRate: z.number(),
  teaseCopy: z.string().min(1)
})

const breakthroughKpiSchema = z.object({
  minDaoXin: z.number().optional(),
  minFaLi: z.number().optional(),
  minRouTi: z.number().optional(),
  minDaysInRealm: z.number().optional()
})

const realmTemplateSchema = z.object({
  id: z.enum(REALM_TIER_IDS),
  displayName: z.string().min(1),
  order: z.number(),
  capitalismSkin: capitalismSkinSchema,
  maintenanceCoeff: z.number().min(1),
  harvestRate: z.number().gt(0).max(1),
  pressureDeckId: z.string().min(1),
  breakthroughKpi: breakthroughKpiSchema,
  loanProducts: z.array(loanProductSchema).min(1),
  celebrationCopy: z.string().min(1),
  billCopy: z.string().min(1)
})

export const realmTemplatesFileSchema = z
  .object({
    realms: z.array(realmTemplateSchema).min(1)
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>()
    const orders: number[] = []
    for (let i = 0; i < data.realms.length; i++) {
      const r = data.realms[i]!
      if (seen.has(r.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `realms[${i}] id=${r.id}: 重复 id "${r.id}"`,
          path: ['realms', i, 'id']
        })
      }
      seen.add(r.id)
      orders.push(r.order)
    }
    const sorted = [...orders].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1]) {
        ctx.addIssue({
          code: 'custom',
          message: 'realms order 存在重复值',
          path: ['realms']
        })
        break
      }
    }
  })

const collapseTriggerSchema = z
  .object({
    minDelinquency: z.number().optional(),
    maxDaoXin: z.number().optional(),
    minBreakthroughs: z.number().optional(),
    minDaysInRealm: z.number().optional(),
    minLienCount: z.number().optional(),
    minFatigue: z.number().optional(),
    minLieFlatStreak: z.number().optional()
  })
  .passthrough()

const collapseEndingSchema = z.object({
  id: z.string().min(1),
  trigger: collapseTriggerSchema,
  title: z.string().min(1),
  archiveVerdict: z.string().min(1)
})

export const collapseEndingsFileSchema = z
  .object({
    endings: z.array(collapseEndingSchema).min(1)
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>()
    for (let i = 0; i < data.endings.length; i++) {
      const e = data.endings[i]!
      if (seen.has(e.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `endings[${i}] id=${e.id}: 重复 id`,
          path: ['endings', i, 'id']
        })
      }
      seen.add(e.id)
    }
  })

export function parseRealmTemplatesJson(raw: unknown) {
  return realmTemplatesFileSchema.safeParse(raw)
}

export function parseCollapseEndingsJson(raw: unknown) {
  return collapseEndingsFileSchema.safeParse(raw)
}

function readJsonFile(filePath: string): { ok: true; raw: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, raw: JSON.parse(fs.readFileSync(filePath, 'utf8')) }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, message: `无法读取 ${filePath}: ${message}` }
  }
}

export function validateRealmTemplatesBundle(realmPath: string, collapsePath: string) {
  const errors: string[] = []

  const realmRead = readJsonFile(realmPath)
  if (!realmRead.ok) {
    errors.push(realmRead.message)
  } else {
    const realmResult = parseRealmTemplatesJson(realmRead.raw)
    if (!realmResult.success) {
      errors.push(...formatZodErrors(realmResult.error))
    }
  }

  const collapseRead = readJsonFile(collapsePath)
  if (!collapseRead.ok) {
    errors.push(collapseRead.message)
  } else {
    const collapseResult = parseCollapseEndingsJson(collapseRead.raw)
    if (!collapseResult.success) {
      errors.push(...formatZodErrors(collapseResult.error))
    }
  }

  if (errors.length) {
    return {
      success: false as const,
      error: { issues: errors.map((message) => ({ path: [] as (string | number)[], message })) }
    }
  }
  return { success: true as const, data: undefined }
}

export { formatZodErrors, realmTemplateSchema, collapseEndingSchema }
