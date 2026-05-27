import type { Act1State } from '~/types/act1'
import { buildFamilyNotifications } from './familyLedger'
import { buildLoanNotifications, type Act1Notification } from './loanProducts'

export type { Act1Notification }

/** 合并灵贷 + 家庭通知栈 */
export function buildAct1Notifications(state: Act1State): Act1Notification[] {
  const seen = new Set<string>()
  const out: Act1Notification[] = []
  for (const n of [...buildLoanNotifications(state), ...buildFamilyNotifications(state)]) {
    if (seen.has(n.id)) continue
    seen.add(n.id)
    out.push(n)
  }
  return out
}
