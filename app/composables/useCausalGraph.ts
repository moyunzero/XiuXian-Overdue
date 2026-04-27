import type { CausalGraph, ActionId, GameState, HiddenModifiers } from '~/types/game'
import { readonly } from 'vue'
import {
  createCausalGraph,
  recordAction,
  predictSequence,
  pruneGraph,
  getRecentChain,
  DEFAULT_MAX_NODES
} from '~/logic/causalGraphEngine'

export function useCausalGraph() {
  const causalGraph = useState<CausalGraph>('causal-graph', () => createCausalGraph())

  const isSandboxOpen = useState<boolean>('sandbox-open', () => false)

  const initializeGraph = () => {
    causalGraph.value = createCausalGraph()
  }

  const recordGameAction = (
    day: number,
    slot: 'morning' | 'afternoon' | 'night',
    actionId: ActionId,
    beforeState: GameState,
    afterState: GameState,
    hiddenContributions?: Record<string, number>
  ) => {
    causalGraph.value = recordAction(
      causalGraph.value,
      day,
      slot,
      actionId,
      beforeState,
      afterState,
      hiddenContributions,
      { maxNodes: DEFAULT_MAX_NODES }
    )
  }

  const predictActions = (
    currentState: GameState,
    actions: ActionId[],
    hiddenModifiers?: HiddenModifiers
  ) => {
    return predictSequence(
      causalGraph.value,
      currentState,
      actions,
      hiddenModifiers
    )
  }

  const getRecentHistory = (days: number = 7) => {
    return getRecentChain(causalGraph.value, days)
  }

  const executeSandboxSequence = (
    currentState: GameState,
    actions: ActionId[],
    hiddenModifiers?: HiddenModifiers
  ): { newState: GameState; executedActions: Array<{ action: ActionId; day: number; slot: string }> } => {
    const executedActions: Array<{ action: ActionId; day: number; slot: string }> = []
    let state = { ...currentState }
    const slots: Array<'morning' | 'afternoon' | 'night'> = ['morning', 'afternoon', 'night']

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      const slotIndex = i % 3
      const slot = slots[slotIndex]
      const day = currentState.school.day + Math.floor(i / 3)

      const beforeState = { ...state }
      const afterState = simulateAction(state, action, hiddenModifiers)

      recordGameAction(day, slot, action, beforeState, afterState)

      executedActions.push({ action, day, slot })
      state = afterState
    }

    return { newState: state, executedActions }
  }

  function simulateAction(
    state: GameState,
    action: ActionId,
    hiddenModifiers?: HiddenModifiers
  ): GameState {
    const newState = JSON.parse(JSON.stringify(state)) as GameState

    let multiplier = 1.0
    if (hiddenModifiers) {
      multiplier = hiddenModifiers.actionOutcomes[action] || 1.0
    }

    switch (action) {
      case 'study':
        newState.stats.daoXin += Math.floor(1 * multiplier)
        newState.stats.fatigue += 10
        newState.stats.focus = Math.max(0, newState.stats.focus - 5)
        break
      case 'tuna':
        newState.stats.faLi += (0.5 * multiplier)
        newState.stats.fatigue += 5
        break
      case 'train':
        newState.stats.rouTi = Math.min(10, newState.stats.rouTi + (0.3 * multiplier))
        newState.stats.fatigue += 15
        newState.stats.focus = Math.max(0, newState.stats.focus - 10)
        break
      case 'parttime':
        newState.econ.cash += (50 * multiplier)
        newState.stats.fatigue += 20
        break
      case 'buy':
        if (newState.econ.cash >= 30) {
          newState.econ.cash -= 30
          newState.stats.fatigue = Math.max(0, newState.stats.fatigue - 20)
          newState.stats.focus = Math.min(100, newState.stats.focus + 10)
        }
        break
      case 'rest':
        newState.stats.fatigue = Math.max(0, newState.stats.fatigue - 30)
        newState.stats.focus = Math.min(100, newState.stats.focus + 15)
        break
      case 'borrow':
        newState.econ.cash += 1000
        newState.econ.debtPrincipal += 1000
        break
      case 'repay':
        const debt = newState.econ.debtPrincipal + newState.econ.debtInterestAccrued
        if (newState.econ.cash >= debt) {
          newState.econ.cash -= debt
          newState.econ.debtPrincipal = 0
          newState.econ.debtInterestAccrued = 0
        } else if (newState.econ.cash > 0) {
          const payment = newState.econ.cash
          newState.econ.cash = 0
          const interestPayment = Math.min(payment, newState.econ.debtInterestAccrued)
          newState.econ.debtInterestAccrued -= interestPayment
          newState.econ.debtPrincipal -= (payment - interestPayment)
        }
        break
    }

    newState.econ.debtInterestAccrued += newState.econ.debtPrincipal * newState.econ.dailyRate

    if (newState.stats.fatigue > 100) newState.stats.fatigue = 100
    if (newState.stats.focus < 0) newState.stats.focus = 0
    if (newState.stats.fatigue > 80) {
      newState.stats.focus = Math.max(0, newState.stats.focus - 10)
    }

    return newState
  }

  const openSandbox = () => {
    isSandboxOpen.value = true
  }

  const closeSandbox = () => {
    isSandboxOpen.value = false
  }

  return {
    causalGraph: readonly(causalGraph),
    isSandboxOpen: readonly(isSandboxOpen),
    initializeGraph,
    recordGameAction,
    predictActions,
    getRecentHistory,
    executeSandboxSequence,
    openSandbox,
    closeSandbox
  }
}
