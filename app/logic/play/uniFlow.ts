import type { PlayRunState, SectChoicePending, UniRankCohort } from '~/types/play'
import { getSectChoiceById, SECT_CHOICES } from '~/logic/play/sectChoices'
import { startPressureRound, rngForRun } from '~/logic/play/pressureDeck'
import { formatPlayLogLine } from '~/logic/play/playerFacingCopy'

const COHORT_RANK_LABEL: Record<UniRankCohort, string> = {
  elite: '内门预科榜',
  normal: '预科积分榜',
  tail: '尾段观察榜'
}

export function hasSectChoiceBlocking(run: PlayRunState): boolean {
  return !!run.setpiece?.sectChoicePending
}

export function buildSectChoicePending(_run: PlayRunState): SectChoicePending {
  return {
    prompt: '预科榜已出：择宗决定抽成上限与来文倾向。',
    options: SECT_CHOICES
  }
}

export function applySectChoice(run: PlayRunState, sectId: string): PlayRunState {
  const pending = run.setpiece?.sectChoicePending
  const option = getSectChoiceById(sectId) ?? pending?.options.find((o) => o.id === sectId)
  if (!pending || !option || !run.uni || !run.econ) return run

  const uni = {
    ...run.uni,
    sectId: option.id,
    rankCohort: option.cohortBias,
    rankingLabel: COHORT_RANK_LABEL[option.cohortBias],
    subscriptions: run.uni.subscriptions.map((s) => ({ ...s, active: true }))
  }

  const tag = option.id
  const profileTags = run.profileTags.includes(tag) ? run.profileTags : [...run.profileTags, tag]

  const setpiece = { ...run.setpiece }
  delete setpiece.sectChoicePending

  const monthly = uni.subscriptions.filter((s) => s.active).reduce((n, s) => n + s.monthlyCost, 0)
  let cash = run.econ.cash
  let debtPrincipal = run.econ.debtPrincipal
  const activationLogs: string[] = [
    `择宗：${option.name}（抽成上限 ${Math.round(option.harvestRateCap * 100)}%，${option.deckBiasLabel}）。`
  ]
  if (monthly > 0) {
    const activation = Math.max(100, Math.floor(monthly / 4))
    cash -= activation
    if (cash < 0) {
      debtPrincipal += -cash
      cash = 0
      activationLogs.push(
        `择宗激活：首期周扣 ¥${activation.toLocaleString()} 不足，差额滚入本金。`
      )
    } else {
      activationLogs.push(
        `择宗激活：首期周扣 ¥${activation.toLocaleString()}（灵根租+功法订阅）。`
      )
    }
  }

  let next: PlayRunState = {
    ...run,
    uni,
    setpiece,
    profileTags,
    econ: { ...run.econ, cash, debtPrincipal },
    logs: [...activationLogs, ...run.logs].slice(0, 80)
  }

  const rand = rngForRun(next, 99)
  next = startPressureRound(next, rand)
  return next
}

export function tickUniSubscriptions(run: PlayRunState): PlayRunState {
  if (run.lifeStage !== 'uni' || !run.uni || !run.econ || !run.school) return run
  const day = run.school.day
  if (day <= 1 || day % 7 !== 0) return run

  const monthly = run.uni.subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.monthlyCost, 0)
  if (monthly <= 0) return run

  const charge = Math.floor(monthly / 4)
  let cash = run.econ.cash - charge
  const logs = [...run.logs]
  if (cash < 0) {
    const shortfall = -cash
    cash = 0
    logs.unshift(formatPlayLogLine(day, '订阅扣费不足', `欠费 ¥${shortfall.toLocaleString()} 已滚入本金。`))
    return {
      ...run,
      econ: {
        ...run.econ,
        cash: 0,
        debtPrincipal: run.econ.debtPrincipal + shortfall,
        delinquency: Math.min(5, run.econ.delinquency + 1)
      },
      logs: logs.slice(0, 80)
    }
  }

  logs.unshift(formatPlayLogLine(day, '灵根租/功法订阅周扣', `¥${charge.toLocaleString()}。`))
  return {
    ...run,
    econ: { ...run.econ, cash },
    logs: logs.slice(0, 80)
  }
}

export function rankingLabelForRun(run: PlayRunState): string {
  return run.uni?.rankingLabel ?? '预科积分榜'
}

export interface FoundationKpiRow {
  key: 'daoXin' | 'faLi' | 'rouTi'
  label: string
  current: number
  target: number
  pct: number
}

export function foundationKpiRows(run: PlayRunState): FoundationKpiRow[] | null {
  if (!run.uni) return null
  const p = run.uni.foundationProgress
  const t = run.uni.foundationKpi
  const defs: { key: FoundationKpiRow['key']; label: string; current: number; target: number }[] = [
    { key: 'daoXin', label: '道心', current: p.daoXin, target: t.daoXin },
    { key: 'faLi', label: '法力', current: p.faLi, target: t.faLi },
    { key: 'rouTi', label: '肉体', current: p.rouTi, target: t.rouTi }
  ]
  return defs.map((row) => ({
    ...row,
    pct: Math.min(100, Math.round((row.current / Math.max(0.01, row.target)) * 100))
  }))
}

export function foundationKpiSummary(run: PlayRunState): string | null {
  const rows = foundationKpiRows(run)
  if (!rows) return null
  return rows.map((r) => `${r.label} ${r.current.toFixed(1)}/${r.target}`).join(' · ')
}

export function formatUniSubscriptionHud(run: PlayRunState): string | null {
  if (run.lifeStage !== 'uni' || !run.uni) return null
  const active = run.uni.subscriptions.filter((s) => s.active)
  if (!active.length) {
    return '灵根租/功法订阅：择宗后激活'
  }
  const monthly = active.reduce((n, s) => n + s.monthlyCost, 0)
  const weekly = Math.floor(monthly / 4)
  const coeff = run.maintenanceCoeff ?? 1
  return `订阅月费 ¥${monthly.toLocaleString()} · 周扣约 ¥${weekly.toLocaleString()} · 维护费系数 ×${coeff.toFixed(2)}`
}

export function syncFoundationProgressFromStats(run: PlayRunState): PlayRunState {
  if (run.lifeStage !== 'uni' || !run.uni || !run.stats) return run
  return {
    ...run,
    uni: {
      ...run.uni,
      foundationProgress: {
        daoXin: run.stats.daoXin,
        faLi: run.stats.faLi,
        rouTi: run.stats.rouTi
      }
    }
  }
}

export function isFoundationKpiMet(run: PlayRunState): boolean {
  const u = run.uni
  if (!u) return false
  const p = u.foundationProgress
  const t = u.foundationKpi
  return p.daoXin >= t.daoXin && p.faLi >= t.faLi && p.rouTi >= t.rouTi
}
