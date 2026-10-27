import type { MandateEffect, MandateResponseDef } from '~/types/chapter'
import type { MandateInboxPending } from '~/logic/play/mandateDelivery'

export interface MandateOptionView {
  id: string
  label: string
  costHint: string
  costHintFuzzed: boolean
  timingTag?: string
  isGrit?: boolean
}

export interface MandateCardOptionsView {
  left: MandateOptionView | null
  right: MandateOptionView | null
  grit: MandateOptionView[]
}

const GRIT_PREFIXES = ['短痛', '长痛'] as const

function clampHintStat(value: number, prefix: string): string {
  const sign = value > 0 ? '+' : ''
  const raw = `${prefix}${sign}${value}`
  return raw.length <= 8 ? raw : `${prefix}${sign}${Math.abs(value)}`
}

function deriveCostHintFromEffects(effects: MandateEffect[]): string {
  let cash = 0
  let pressure = 0
  for (const effect of effects) {
    if (effect.kind === 'cash' && effect.value) cash += effect.value
    if (effect.kind === 'numbness' && effect.value) pressure += effect.value
    if (effect.kind === 'domestication' && effect.value) pressure += effect.value
  }
  const parts: string[] = []
  if (cash !== 0) parts.push(clampHintStat(cash, '灵石'))
  if (pressure !== 0) parts.push(clampHintStat(pressure, '压力'))
  return parts.join(' ')
}

export function fuzzCostHintText(text: string): string {
  if (!text.trim()) return '约 ±?'
  return text.replace(/[+-]?\d+/g, '???')
}

export function formatMandateCostHint(
  response: MandateResponseDef,
  fuzz = false
): { hint: string; timingTag?: string; fuzzed: boolean } {
  const raw = response.costHint?.trim() || deriveCostHintFromEffects(response.effects)
  const hint = fuzz && raw ? fuzzCostHintText(raw) : raw
  const timingTag = response.effectTiming === 'weekend' ? '本周末入账' : undefined
  return { hint, timingTag, fuzzed: fuzz && !!raw }
}

export function partitionMandateResponses(responses: MandateResponseDef[]): {
  left: MandateResponseDef | null
  right: MandateResponseDef | null
  grit: MandateResponseDef[]
} {
  const compliant = responses.filter((r) => !r.grit)
  const grit = responses.filter((r) => r.grit)
  return {
    left: compliant[0] ?? null,
    right: compliant[1] ?? null,
    grit
  }
}

export function gritLinkLabel(response: MandateResponseDef, gritIndex: number): string {
  const prefix = GRIT_PREFIXES[gritIndex] ?? GRIT_PREFIXES.at(-1) ?? '长痛'
  return `${prefix}：${response.label}`
}

function toOptionView(
  response: MandateResponseDef,
  fuzz: boolean,
  unblurId?: string
): MandateOptionView {
  const forceSharp = unblurId != null && response.id === unblurId
  const effectiveFuzz = fuzz && !forceSharp
  const { hint, timingTag, fuzzed } = formatMandateCostHint(response, effectiveFuzz)
  return {
    id: response.id,
    label: response.label,
    costHint: hint,
    costHintFuzzed: fuzzed,
    timingTag,
    isGrit: response.grit
  }
}

export function buildMandateCardOptions(
  responses: MandateResponseDef[],
  fuzzFlags?: MandateInboxPending['fuzzFlags']
): MandateCardOptionsView {
  const fuzz = !!fuzzFlags?.costBlur
  const unblurId = fuzzFlags?.clauseLiterateUnblurId
  let { left, right, grit } = partitionMandateResponses(responses)
  if (!right && grit.length > 0) {
    right = grit[0]!
    grit = grit.slice(1)
  }
  return {
    left: left ? toOptionView(left, fuzz, unblurId) : null,
    right: right ? toOptionView(right, fuzz, unblurId) : null,
    grit: grit.map((r) => toOptionView(r, fuzz, unblurId))
  }
}

export function formatIssuerLabel(
  issuerLabel: string | undefined,
  fuzzFlags?: MandateInboxPending['fuzzFlags']
): string {
  const base = issuerLabel?.trim() || '来文'
  if (!fuzzFlags?.issuerNoise) return base
  return base.replace(/[\u4e00-\u9fff]/g, (ch, i) => (i % 3 === 1 ? '·' : ch))
}
