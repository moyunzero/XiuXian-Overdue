import type { Act1ModuleId, Act1State } from '~/types/act1'
import { loanBalance } from './loanProducts'

const MODULE_ORDER: Act1ModuleId[] = ['interview', 'loan', 'family']

export function isModuleUnlocked(state: Act1State, module: Act1ModuleId): boolean {
  const idx = MODULE_ORDER.indexOf(module)
  if (idx <= 0) return true
  const prev = MODULE_ORDER[idx - 1]!
  return state.completedModules.includes(prev)
}

export function canCompleteModule(state: Act1State, module: Act1ModuleId): boolean {
  return isModuleUnlocked(state, module) && !state.completedModules.includes(module)
}

export function markModuleComplete(state: Act1State, module: Act1ModuleId): Act1State {
  if (!canCompleteModule(state, module)) return state
  const completedModules = state.completedModules.includes(module)
    ? state.completedModules
    : [...state.completedModules, module]
  const pendingTodos = state.pendingTodos.filter((id) => !id.startsWith(`todo-${module}`))
  const next: Act1State = { ...state, completedModules, pendingTodos }
  if (module === 'interview') {
    return {
      ...next,
      pendingTodos: [...next.pendingTodos, 'todo-loan-popup']
    }
  }
  if (module === 'loan') {
    return {
      ...next,
      pendingTodos: [...next.pendingTodos, 'todo-family-ledger']
    }
  }
  return next
}

export function totalDebtPrincipal(state: Act1State): number {
  return state.loans.reduce((sum, l) => sum + loanBalance(l), 0)
}

export function listCreditors(state: Act1State): { name: string; balance: number }[] {
  return state.loans
    .filter((l) => loanBalance(l) > 0)
    .map((l) => ({ name: l.lenderName, balance: loanBalance(l) }))
}
