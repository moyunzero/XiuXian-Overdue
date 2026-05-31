import type { BreakthroughPending, PlayRunState } from '~/types/play'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'
import { touchPlayRun } from '~/logic/play/createPlayRun'
import { lifeStageLabel, realmTierLabel } from '~/logic/play/chapterFlow'
import { getNextRealmTemplate, getRealmTemplate } from '~/logic/play/realmTemplates'

const LIFE_SEGMENT_ORDER = ['pre', 'hs', 'uni', 'work'] as const

export function breakthroughBillRevealSeconds(breakthroughCount: number): number {
  return breakthroughCount >= 2 ? 15 : 60
}

export function advanceLifeSegment(run: PlayRunState): PlayRunState {
  const idx = LIFE_SEGMENT_ORDER.indexOf(run.lifeStage)
  if (idx < 0 || idx >= LIFE_SEGMENT_ORDER.length - 1) return run
  const nextStage = LIFE_SEGMENT_ORDER[idx + 1]
  return {
    ...run,
    lifeStage: nextStage,
    logs: [
      `人生段落推进：${lifeStageLabel(run.lifeStage)} → ${lifeStageLabel(nextStage)}，月供与抽成同步上调。`,
      ...run.logs
    ].slice(0, 80)
  }
}

export function meetsBreakthroughKpi(run: PlayRunState): boolean {
  if (run.runMode !== 'endless' || !run.endless) return false
  const template = getRealmTemplate(run.realmTier)
  const next = getNextRealmTemplate(run.realmTier)
  if (!template || !next) return false
  const kpi = template.breakthroughKpi
  const stats = run.stats
  if (!stats) return false
  const days = run.endless.daysInCurrentRealm
  if (days < (kpi.minDaysInRealm ?? 3)) return false
  if (stats.daoXin < (kpi.minDaoXin ?? 0)) return false
  if (stats.faLi < (kpi.minFaLi ?? 0)) return false
  if (stats.rouTi < (kpi.minRouTi ?? 0)) return false
  return true
}

function deterministicBreakthroughRoll(run: PlayRunState): number {
  const seed = run.seed ?? 1
  const day = run.school?.day ?? 1
  const realmIdx = getRealmTemplate(run.realmTier)?.order ?? 0
  const mix = (seed * 1103515245 + day * 12345 + realmIdx * 2654435761) >>> 0
  return (mix % 1000) / 1000
}

function softPityWindowForRealm(realmId: string): { startDay: number; forceDay: number } {
  if (realmId === 'qi') return { startDay: 20, forceDay: 38 }
  if (realmId === 'foundation') return { startDay: 30, forceDay: 54 }
  if (realmId === 'purple') return { startDay: 24, forceDay: 42 }
  return { startDay: 26, forceDay: 46 }
}

function softPityBreakthroughDue(run: PlayRunState): boolean {
  if (run.runMode !== 'endless' || !run.endless) return false
  const days = run.endless.daysInCurrentRealm
  const { startDay, forceDay } = softPityWindowForRealm(run.realmTier)
  if (days < startDay) return false
  if (days >= forceDay) return true
  const chance = (days - startDay) / (forceDay - startDay)
  return deterministicBreakthroughRoll(run) < chance
}

export function buildBreakthroughPending(run: PlayRunState): BreakthroughPending | null {
  const current = getRealmTemplate(run.realmTier)
  const next = getNextRealmTemplate(run.realmTier)
  if (!current || !next) return null
  const totalDebt = fullDebtFromRun(run)
  const bumpPct = Math.round((next.maintenanceCoeff - current.maintenanceCoeff) * 100)
  return {
    currentRealmId: current.id,
    nextRealmId: next.id,
    currentRealmLabel: current.displayName,
    nextRealmLabel: next.displayName,
    celebrationLine: current.celebrationCopy,
    billLines: [
      next.billCopy,
      `下一境抽成率 ${(next.harvestRate * 100).toFixed(0)}%（本境 ${(current.harvestRate * 100).toFixed(0)}%）。`,
      '制度说明：负债清零不构成胜利条件，只影响你还能撑几轮。'
    ],
    totalDebt,
    billRevealSeconds: breakthroughBillRevealSeconds(run.endless?.breakthroughsCount ?? 0),
    maintenanceBumpLabel:
      bumpPct > 0
        ? `维护费系数 ×${next.maintenanceCoeff.toFixed(2)}（较 ${current.displayName} +${bumpPct}%）`
        : `维护费系数 ×${next.maintenanceCoeff.toFixed(2)}`
  }
}

export function scheduleBreakthroughIfDue(run: PlayRunState): PlayRunState {
  if (run.setpiece?.breakthroughPending) return run
  const byKpi = meetsBreakthroughKpi(run)
  const bySoftPity = !byKpi && softPityBreakthroughDue(run)
  if (!byKpi && !bySoftPity) return run
  const pending = buildBreakthroughPending(run)
  if (!pending) return run
  return {
    ...run,
    setpiece: { ...run.setpiece, breakthroughPending: pending },
    logs: [
      byKpi
        ? `${pending.currentRealmLabel} KPI 达标：破境庆典排队中，账单已预生成。`
        : `${pending.currentRealmLabel} 境中日压力触发：破境庆典排队中，账单已预生成。`,
      ...run.logs
    ].slice(0, 80)
  }
}

export function confirmBreakthrough(run: PlayRunState): PlayRunState {
  const pending = run.setpiece?.breakthroughPending
  if (!pending || !run.endless || !run.econ) return run

  const nextTemplate = getRealmTemplate(pending.nextRealmId)
  if (!nextTemplate) return run

  const principalBump = Math.max(
    5000,
    Math.round(fullDebtFromRun(run) * 0.08 * nextTemplate.maintenanceCoeff)
  )
  const setpiece = { ...run.setpiece }
  delete setpiece.breakthroughPending

  const maintenanceStack = run.endless.maintenanceStack * nextTemplate.maintenanceCoeff

  return touchPlayRun(advanceLifeSegment({
    ...run,
    setpiece,
    realmTier: pending.nextRealmId,
    realmIndex: nextTemplate.order,
    maintenanceCoeff: (run.maintenanceCoeff ?? 1) * nextTemplate.maintenanceCoeff,
    econ: {
      ...run.econ,
      debtPrincipal: run.econ.debtPrincipal + principalBump
    },
    endless: {
      ...run.endless,
      maintenanceStack,
      harvestRate: nextTemplate.harvestRate,
      daysInCurrentRealm: 0,
      breakthroughsCount: run.endless.breakthroughsCount + 1
    },
    profileTags: [...run.profileTags.filter((t) => t !== 'realm-breakthrough'), 'realm-breakthrough'].slice(
      0,
      12
    ),
    logs: [
      `破境·${pending.nextRealmLabel}：庆典结束，本金台阶 +¥${principalBump.toLocaleString()}。`,
      `你仍在 ${realmTierLabel(pending.nextRealmId)}，没有「还清」按钮。`,
      ...run.logs
    ].slice(0, 80)
  }))
}

/** 负债清零不构成胜利（无尽境契约） */
export function isVictoryByDebtRepayment(_run: PlayRunState): boolean {
  return false
}
