import type { DelegationJobId, MaintenanceTier, WeekPlan } from '~/types/chapter'

export interface HeadJarPlanInput {
  maintenanceTier: MaintenanceTier
  delegationJob: DelegationJobId
}
import type { PlayRunState } from '~/types/play'
import { fullDebtFromRun, minPaymentForRun } from '~/logic/play/debtDashboard'
import { validateDelegationTwoPlan } from '~/logic/play/ghostBoundWeekPlan'
import { mergeTagRecords } from '~/logic/play/playRunFateDefaults'

/** 器藏升级：完整度跌破该线（mortgaged 态仍可因制度损伤触达） */
export const HEAD_JAR_INTEGRITY = 0.12

/** mortgaged 态 decay 地板（D-83）；维生失败 streak 为另一升级路径 */
export const MORTGAGED_INTEGRITY_CAP = 0.35

export const HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD = 2

const MAINTENANCE_BASE: Record<MaintenanceTier, number> = {
  sustain: 420,
  austerity: 260
}

export interface MaintenanceBillPreview {
  total: number
  maintenanceBase: number
  debtService: number
  interest: number
  tier: MaintenanceTier
}

export function getMortgagedIntegrityCap(): number {
  return MORTGAGED_INTEGRITY_CAP
}

export function buildMaintenanceBillPreview(
  run: PlayRunState,
  tier: MaintenanceTier
): MaintenanceBillPreview {
  const maintenanceBase = MAINTENANCE_BASE[tier]
  const debtService = minPaymentForRun(run)
  const interest = Math.floor((run.econ?.debtPrincipal ?? 0) * (run.econ?.dailyRate ?? 0) * 7)
  const total = maintenanceBase + debtService + interest
  return { total, maintenanceBase, debtService, interest, tier }
}

export function headJarInputToWeekPlan(input: HeadJarPlanInput): WeekPlan {
  const jobEffects = delegationJobToPlanEffects(input.delegationJob)
  return {
    repay: 'min',
    studyHours: jobEffects.studyHours ?? 0,
    tunaHours: jobEffects.tunaHours ?? 0,
    parttimeHours: jobEffects.parttimeHours ?? 0,
    workHours: jobEffects.workHours ?? 0,
    rest: jobEffects.rest ?? false,
    maintenanceTier: input.maintenanceTier,
    delegationJob: input.delegationJob
  }
}

export function weekPlanToHeadJarInput(plan: WeekPlan): HeadJarPlanInput | null {
  if (!plan.maintenanceTier || !plan.delegationJob) return null
  return {
    maintenanceTier: plan.maintenanceTier,
    delegationJob: plan.delegationJob
  }
}

export function delegationJobToPlanEffects(job: DelegationJobId): Partial<WeekPlan> {
  switch (job) {
    case 'yang_patrol':
      return { workHours: 32, studyHours: 0, parttimeHours: 0, tunaHours: 4, rest: false }
    case 'collection_escort':
      return { workHours: 28, parttimeHours: 8, studyHours: 0, tunaHours: 0, rest: false }
    case 'penalty_register':
      return { workHours: 24, studyHours: 8, parttimeHours: 0, tunaHours: 0, rest: false }
  }
}

function clampHintStat(value: number, prefix: string): string {
  const sign = value > 0 ? '+' : ''
  const raw = `${prefix}${sign}${value}`
  return raw.length <= 8 ? raw : `${prefix}${sign}${Math.abs(value)}`
}

const DELEGATION_JOB_LABELS: Record<DelegationJobId, string> = {
  yang_patrol: '阳巡值守',
  collection_escort: '催收押运',
  penalty_register: '罚籍登记'
}

export function delegationJobLabel(jobId: DelegationJobId): string {
  return DELEGATION_JOB_LABELS[jobId]
}

export function listDelegationJobs(): Array<{
  id: DelegationJobId
  label: string
  costHint: string
}> {
  const ids: DelegationJobId[] = ['yang_patrol', 'collection_escort', 'penalty_register']
  return ids.map((id) => ({
    id,
    label: delegationJobLabel(id),
    costHint: delegationJobCostHint(id)
  }))
}

export function delegationJobCostHint(jobId: DelegationJobId): string {
  switch (jobId) {
    case 'yang_patrol':
      return clampHintStat(-12, '压力')
    case 'collection_escort':
      return `${clampHintStat(180, '灵石')} ${clampHintStat(8, '压力')}`
    case 'penalty_register':
      return clampHintStat(6, '压力')
  }
}

export function validateHeadJarPlan(
  run: PlayRunState,
  plan: WeekPlan
): { ok: true } | { ok: false; reason: string } {
  if (run.primaryFate !== 'head_jar') {
    return { ok: false, reason: '当前命运态非器藏维生，无需委托排程。' }
  }
  return validateDelegationTwoPlan(run, plan)
}

export function applyHeadJarMaintenanceSettlement(run: PlayRunState): PlayRunState {
  if (run.primaryFate !== 'head_jar') return run
  const tier = run.lastWeekPlan?.maintenanceTier
  if (!tier) return run

  const bill = buildMaintenanceBillPreview(run, tier)
  const cash = run.econ?.cash ?? 0
  if (!run.econ) return run

  if (cash >= bill.total) {
    const mandate = run.mandate ?? {
      numbness: 0,
      domestication: 0,
      pendingDeliveryIds: [],
      supplyCutStreak: 0
    }
    return {
      ...run,
      econ: { ...run.econ, cash: cash - bill.total },
      mandate: { ...mandate, maintenanceFailureStreak: 0 },
      logs: [
        `维生账单入账：${tier === 'sustain' ? '维持' : '紧缩'}档 ¥${bill.total.toLocaleString()}（含最低灵贷 ¥${bill.debtService.toLocaleString()}）。`,
        ...run.logs
      ].slice(0, 80)
    }
  }

  const streak = (run.mandate?.maintenanceFailureStreak ?? 0) + 1
  const mandate = run.mandate ?? {
    numbness: 0,
    domestication: 0,
    pendingDeliveryIds: [],
    supplyCutStreak: 0
  }
  const tags =
    streak >= HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD
      ? mergeTagRecords(run.institutionalTags, [
          {
            id: 'supply_cut',
            appliedAtWeek: run.chapter?.chapterWeekIndex,
            source: 'maintenance_failure'
          }
        ])
      : run.institutionalTags

  return {
    ...run,
    mandate: { ...mandate, maintenanceFailureStreak: streak },
    institutionalTags: tags,
    logs: [
      `维生费不足（需 ¥${bill.total.toLocaleString()}，结余 ¥${cash.toLocaleString()}）——供应档位下调，第 ${streak} 次欠账。`,
      ...run.logs
    ].slice(0, 80)
  }
}

/** 供 transition 检测：维生失败 streak 或 integrity 阈值 */
export function headJarTransitionEligible(run: PlayRunState): boolean {
  if (run.primaryFate !== 'mortgaged') return false
  const integrity = run.bodyIntegrity ?? 1
  const streak = run.mandate?.maintenanceFailureStreak ?? 0
  return integrity < HEAD_JAR_INTEGRITY || streak >= HEAD_JAR_MAINTENANCE_FAILURE_THRESHOLD
}

/** 预览文案用：当前总负债 */
export function headJarDebtLabel(run: PlayRunState): string {
  return `¥${fullDebtFromRun(run).toLocaleString()}`
}
