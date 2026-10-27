import type { DelegationJobId, MaintenanceTier, WeekPlan } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import { getFateShell } from '~/logic/play/fateShellRegistry'
import {
  buildMaintenanceBillPreview,
  delegationJobLabel,
  listDelegationJobs
} from '~/logic/play/headJarWeekPlan'
import { buildDualLedgerSettlementLogs, GHOST_MING_WEEKLY_QUOTA } from '~/logic/play/ghostLedger'

const DELEGATION_TWO_FATES = new Set(['head_jar', 'ghost_bound', 'shattered'])

const DELEGATION_MING_PAYOUT: Record<DelegationJobId, number> = {
  yang_patrol: 18,
  collection_escort: 28,
  penalty_register: 12
}

const YANG_PENALTY_RATE = 0.02

export interface DualLedgerBillPreview {
  humanMaintenance: number
  mingQuota: number
  tier: MaintenanceTier
}

export function validateDelegationTwoPlan(
  run: PlayRunState,
  plan: WeekPlan
): { ok: true } | { ok: false; reason: string } {
  const shell = getFateShell(run)
  if (shell.scheduleMode !== 'delegation_two') {
    return { ok: false, reason: '当前命运态无需委托排程。' }
  }
  const fate = run.primaryFate
  if (!fate || !DELEGATION_TWO_FATES.has(fate)) {
    if (fate === 'ghost_bound') {
      return { ok: false, reason: '当前命运态非绑定幽影，无需委托排程。' }
    }
    return { ok: false, reason: '当前命运态非器藏维生，无需委托排程。' }
  }
  if (!plan.maintenanceTier) {
    const tierMsg =
      fate === 'ghost_bound' ? '请选择维生档位后再开本周。' : '请选择维生档位后再开本周。'
    return { ok: false, reason: tierMsg }
  }
  if (!plan.delegationJob) {
    const jobMsg =
      fate === 'ghost_bound' ? '请选择阴司工单后再开本周。' : '请选择委托指令后再开本周。'
    return { ok: false, reason: jobMsg }
  }
  return { ok: true }
}

export function buildDualLedgerBillPreview(
  run: PlayRunState,
  tier: MaintenanceTier
): DualLedgerBillPreview {
  const human = buildMaintenanceBillPreview(run, tier)
  return {
    humanMaintenance: human.maintenanceBase,
    mingQuota: GHOST_MING_WEEKLY_QUOTA,
    tier
  }
}

export function listGhostBoundDelegationJobs(): Array<{
  id: DelegationJobId
  label: string
  costHint: string
}> {
  return listDelegationJobs().map((job) => ({
    ...job,
    label: job.id === 'yang_patrol' ? '幽影阳巡' : delegationJobLabel(job.id)
  }))
}

export function applyGhostBoundLedgerSettlement(run: PlayRunState): PlayRunState {
  if (run.primaryFate !== 'ghost_bound' && run.primaryFate !== 'ghost_voluntary') return run
  if (!run.ghostLedger) return run

  let next = run
  const newLogs: string[] = []

  const job = run.lastWeekPlan?.delegationJob
  if (job) {
    const payout = DELEGATION_MING_PAYOUT[job]
    let ledger = { ...next.ghostLedger! }
    ledger.mingCoin += payout

    if (ledger.mingCoin < GHOST_MING_WEEKLY_QUOTA) {
      ledger.mingUnderpayStreak = (ledger.mingUnderpayStreak ?? 0) + 1
      const penalty = Math.floor(ledger.yangDebtCarried * YANG_PENALTY_RATE)
      ledger.yangDebtCarried += penalty
      newLogs.push(
        `冥币未达配额——阳债上浮 ¥${penalty.toLocaleString()}，连续 ${ledger.mingUnderpayStreak} 周。`
      )
    } else {
      newLogs.push(`冥币入账：+${payout}，结余 ${ledger.mingCoin}。`)
    }
    next = { ...next, ghostLedger: ledger }
  }

  newLogs.push(...buildDualLedgerSettlementLogs(next))
  return { ...next, logs: [...newLogs, ...next.logs].slice(0, 80) }
}
