import type { Act1State } from '~/types/act1'
import { normalizeLoanContract } from './loanProducts'

/** 兼容旧存档缺少 W2/W3 字段 */
export function normalizeAct1State(state: Act1State): Act1State {
  const loanMeta = state.loanMeta ?? {
    adDismissCount: 0,
    compareViewMs: 0,
    comparedProducts: false,
    popupAcknowledged: false
  }

  const loans = (state.loans ?? []).map((loan) => {
    const normalized = normalizeLoanContract(loan)
    if (normalized.drawn === 0 && normalized.accruedInterest === 0 && state.creditLineUsed > 0) {
      const legacyDrawn = Math.min(normalized.principal, state.creditLineUsed)
      return { ...normalized, drawn: legacyDrawn }
    }
    return normalized
  })

  return {
    ...state,
    loanMeta: {
      ...loanMeta,
      compareViewMs: loanMeta.compareViewMs ?? 0
    },
    loans,
    familyMeta: state.familyMeta ?? {
      moneyRequests: 0,
      collectionStage: 0
    }
  }
}
