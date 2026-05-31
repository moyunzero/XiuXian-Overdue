import type { WeekPlan } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'

export interface WeekActionFlags {
  repay: boolean
  study: boolean
  tuna: boolean
  parttime: boolean
  work: boolean
  rest: boolean
}

export type WeekRepayTier = WeekPlan['repay']

export type WeekRepayTierFlags = Record<WeekRepayTier, boolean>

export const NUMBNESS_MUTE_THRESHOLD = 40
export const DOMESTICATION_MUTE_THRESHOLD = 50

const ALL_REPAY_TIERS: WeekRepayTier[] = ['min', 'partial', 'extra', 'skip']

function mandateNumbness(run: PlayRunState): number {
  return run.mandate?.numbness ?? 0
}

function mandateDomestication(run: PlayRunState): number {
  return run.mandate?.domestication ?? 0
}

export function isPsyMuted(run: PlayRunState): boolean {
  return (
    mandateNumbness(run) >= NUMBNESS_MUTE_THRESHOLD ||
    mandateDomestication(run) >= DOMESTICATION_MUTE_THRESHOLD
  )
}

/** 麻木时锁「最优解」按钮，保留还款 skip / 零工等劣质出路 */
export function applyMandatePsyToActions(run: PlayRunState, base: WeekActionFlags): WeekActionFlags {
  const numbness = mandateNumbness(run)
  const domestication = mandateDomestication(run)

  if (numbness < NUMBNESS_MUTE_THRESHOLD && domestication < DOMESTICATION_MUTE_THRESHOLD) {
    return base
  }

  return {
    ...base,
    study: base.study && numbness < NUMBNESS_MUTE_THRESHOLD,
    tuna: base.tuna && numbness < NUMBNESS_MUTE_THRESHOLD,
    rest:
      base.rest &&
      !(domestication >= DOMESTICATION_MUTE_THRESHOLD && numbness >= NUMBNESS_MUTE_THRESHOLD)
  }
}

/** 驯化高时灰掉「多还」档位，保留 min / skip（以贷养贷式拖延） */
export function applyMandatePsyToRepayTiers(run: PlayRunState): WeekRepayTierFlags {
  const flags = Object.fromEntries(ALL_REPAY_TIERS.map((t) => [t, true])) as WeekRepayTierFlags
  if (mandateDomestication(run) < DOMESTICATION_MUTE_THRESHOLD) return flags
  flags.partial = false
  flags.extra = false
  return flags
}

export function weekPlanPsyNotice(run: PlayRunState): string | null {
  const numbness = mandateNumbness(run)
  const domestication = mandateDomestication(run)
  const highNumb = numbness >= NUMBNESS_MUTE_THRESHOLD
  const highDom = domestication >= DOMESTICATION_MUTE_THRESHOLD
  if (!highNumb && !highDom) return null
  if (highNumb && highDom) {
    return '麻木与驯化偏高：刷题/吐纳与部分还款档位已灰化；本周不还、零工与最低还款仍可选。'
  }
  if (highNumb) {
    return '麻木偏高：刷题与吐纳已灰化；零工、最低还款与「本周不还」仍可选。'
  }
  return '驯化偏高：部分提前/多还档位已灰化；最低还款与「本周不还」仍可选。'
}

/** 提交周计划前钳制被 PSY 锁定的字段（防沿用上周绕过） */
export function clampWeekPlanToPsy(run: PlayRunState, plan: WeekPlan): WeekPlan {
  const actions = applyMandatePsyToActions(run, {
    repay: true,
    study: true,
    tuna: true,
    parttime: true,
    work: true,
    rest: true
  })
  const repayTiers = applyMandatePsyToRepayTiers(run)
  let next: WeekPlan = { ...plan }

  if (!actions.study) next = { ...next, studyHours: 0 }
  if (!actions.tuna) next = { ...next, tunaHours: 0 }
  if (!actions.parttime) next = { ...next, parttimeHours: 0 }
  if (!actions.work) next = { ...next, workHours: 0 }
  if (!actions.rest && next.rest) {
    next = { ...next, rest: false, studyHours: plan.studyHours, tunaHours: plan.tunaHours }
    if (!actions.study) next.studyHours = 0
    if (!actions.tuna) next.tunaHours = 0
  }

  if (!repayTiers[next.repay]) {
    const fallback: WeekRepayTier = repayTiers.skip ? 'skip' : repayTiers.min ? 'min' : 'skip'
    next = { ...next, repay: fallback }
  }

  return next
}

/** V4-4：周仪表盘至少保留一条劣质出路（skip / 零工 / 休息） */
export function hasInferiorWeekOutlet(actions: WeekActionFlags, repayTiers: WeekRepayTierFlags): boolean {
  if (repayTiers.skip) return true
  if (actions.parttime) return true
  if (actions.rest) return true
  return false
}
