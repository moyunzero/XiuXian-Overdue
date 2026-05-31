import fs from 'node:fs'
import { z } from 'zod'
import { formatZodErrors } from './format-zod-errors.ts'

const LIFE_STAGES = ['pre', 'hs', 'uni', 'work'] as const
const STAT_TARGETS = ['daoXin', 'faLi', 'rouTi', 'fatigue', 'focus'] as const
const ECON_TARGETS = [
  'cash',
  'collectionFee',
  'debtPrincipal',
  'debtInterestAccrued',
  'dailyRate',
  'delinquency',
  'lastPaymentDay'
] as const
const SCHOOL_TARGETS = ['day', 'week', 'lastExamScore', 'lastRank'] as const
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

const statPayloadSchema = z.object({
  target: z.enum(STAT_TARGETS),
  op: z.string().optional(),
  value: z.number().optional()
})

const econPayloadSchema = z.object({
  target: z.enum(ECON_TARGETS),
  op: z.string().optional(),
  value: z.number().optional()
})

const schoolPayloadSchema = z.object({
  target: z.enum(SCHOOL_TARGETS),
  op: z.string().optional(),
  value: z.number().optional()
})

const logPayloadSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  tone: z.string().optional()
})

const tagPayloadSchema = z.object({
  tag: z.string().min(1)
})

const playEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('stat'), payload: statPayloadSchema }),
  z.object({ kind: z.literal('econ'), payload: econPayloadSchema }),
  z.object({ kind: z.literal('school'), payload: schoolPayloadSchema }),
  z.object({ kind: z.literal('log'), payload: logPayloadSchema }),
  z.object({ kind: z.literal('tag'), payload: tagPayloadSchema })
])

const pressureCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  lifeStages: z.array(z.enum(LIFE_STAGES)).min(1),
  realmTiers: z.array(z.enum(REALM_TIER_IDS)).optional(),
  tags: z.array(z.string().min(1)).min(1),
  effectsOnPlay: z.array(playEffectSchema).min(1),
  effectsOnSkip: z.array(playEffectSchema).optional(),
  requires: z
    .object({
      minCash: z.number().optional(),
      maxDelinquency: z.number().optional(),
      tags: z.array(z.string()).optional()
    })
    .optional(),
  excludesCardIds: z.array(z.string().min(1)).optional()
})

export const pressureCardsFileSchema = z
  .array(pressureCardSchema)
  .min(12, '至少需要 12 张压力牌')
  .superRefine((cards, ctx) => {
    const ids = new Set<string>()
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]!
      if (ids.has(card.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `重复 id: ${card.id}`,
          path: [i, 'id']
        })
      }
      ids.add(card.id)
    }
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]!
      for (const ref of card.excludesCardIds ?? []) {
        if (!ids.has(ref)) {
          ctx.addIssue({
            code: 'custom',
            message: `${card.id}: excludesCardIds 引用未知 ${ref}`,
            path: [i, 'excludesCardIds']
          })
        }
      }
    }
  })

export type PressureCardsFile = z.infer<typeof pressureCardsFileSchema>

export function parsePressureCardsJson(raw: unknown) {
  return pressureCardsFileSchema.safeParse(raw)
}

export function validatePressureCardsFile(filePath: string) {
  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      success: false as const,
      error: {
        issues: [{ path: [] as (string | number)[], message: `无法读取 ${filePath}: ${message}` }]
      }
    }
  }
  return parsePressureCardsJson(raw)
}

export { formatZodErrors, pressureCardSchema, playEffectSchema }
