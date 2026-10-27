import type { GhostLedger, PlayRunState } from '~/types/play'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'

export const GHOST_MING_WEEKLY_QUOTA = 40

const GHOST_FATES = new Set(['ghost_bound', 'ghost_voluntary'])

export function initGhostLedgerOnTransition(run: PlayRunState): PlayRunState {
  if (run.ghostLedger) return run
  const yangDebtCarried = fullDebtFromRun(run)
  const ghostLedger: GhostLedger = {
    yangDebtCarried,
    mingCoin: GHOST_MING_WEEKLY_QUOTA
  }
  return { ...run, ghostLedger }
}

export function tickGhostLedgerWeek(run: PlayRunState): { run: PlayRunState; logs: string[] } {
  if (!run.ghostLedger || !run.primaryFate || !GHOST_FATES.has(run.primaryFate)) {
    return { run, logs: [] }
  }
  const dailyRate = run.econ?.dailyRate ?? 0
  const interest = Math.floor(run.ghostLedger.yangDebtCarried * dailyRate * 7)
  const yangDebtCarried = run.ghostLedger.yangDebtCarried + interest
  const logs = [
    `阳债滚动：本周期利息 +¥${interest.toLocaleString()}，累计 ¥${yangDebtCarried.toLocaleString()}。`
  ]
  return {
    run: {
      ...run,
      ghostLedger: { ...run.ghostLedger, yangDebtCarried }
    },
    logs
  }
}

export function buildDualLedgerSettlementLogs(run: PlayRunState): string[] {
  const ledger = run.ghostLedger
  if (!ledger) return []
  return [
    `阳债入账：¥${ledger.yangDebtCarried.toLocaleString()}（本周期利息已滚动）。`,
    `冥币结余：${ledger.mingCoin}（工单配额${ledger.mingUnderpayStreak ?? 0}周未达标则阳债上浮）。`
  ]
}
