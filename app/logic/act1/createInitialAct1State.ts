import type { Act1State } from '~/types/act1'
import type { StartConfig } from '~/types/game'
import { deriveAct1Modifiers } from './startConfigModifiers'

export function createInitialAct1State(startConfig: StartConfig): Act1State {
  const mods = deriveAct1Modifiers(startConfig)
  return {
    chapter: 'act1-pre-enrollment',
    day: 1,
    cash: startConfig.background === '富户' ? 800 : startConfig.background === '中产' ? 400 : 120,
    familyResilience: mods.familyResilienceBase,
    pressure: 10,
    delinquency: startConfig.initialDebt > 0 ? 1 : 0,
    profileTags: startConfig.initialDebt > 0 ? ['prior-debt'] : [],
    interview: { completed: false, score: 0, answers: {} },
    loanMeta: { adDismissCount: 0, compareViewMs: 0, comparedProducts: false, popupAcknowledged: false },
    loans:
      startConfig.initialDebt > 0
        ? [
            {
              id: 'loan-prior-credit',
              lenderName: '既有征信欠款',
              principal: startConfig.initialDebt,
              drawn: startConfig.initialDebt,
              accruedInterest: 0,
              dailyRate: 0.01,
              graceDaysLeft: 0,
              nextRepaymentDay: 7,
              tags: ['prior-debt']
            }
          ]
        : [],
    creditLineUsed: 0,
    familyMeta: { moneyRequests: 0, collectionStage: 0 },
    completedModules: [],
    pendingTodos: ['todo-interview-open']
  }
}
