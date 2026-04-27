import { describe, it, expect, beforeEach } from 'vitest'
import type {
  CausalGraph,
  CausalNode,
  ActionId,
  GameState,
  PredictionResult,
  HiddenModifiers
} from '~/types/game'
import {
  createCausalGraph,
  generateNodeId,
  createActionNode,
  createStateNode,
  recordAction,
  predictSequence,
  pruneGraph,
  getRecentChain,
  getActionHistory,
  getStateAtNode,
  validateGraph,
  serializeGraph,
  deserializeGraph,
  DEFAULT_MAX_NODES
} from '~/logic/causalGraphEngine'

describe('causalGraphEngine', () => {
  let baseGraph: CausalGraph
  let baseGameState: GameState

  beforeEach(() => {
    baseGraph = createCausalGraph()
    baseGameState = createMockGameState()
  })

  describe('createCausalGraph', () => {
    it('should create an empty graph', () => {
      const graph = createCausalGraph()

      expect(graph.nodes.size).toBe(0)
      expect(graph.edges).toEqual([])
      expect(graph.nodeCounter).toBe(0)
    })
  })

  describe('generateNodeId', () => {
    it('should generate unique ids', () => {
      const id1 = generateNodeId(baseGraph)
      const id2 = generateNodeId(baseGraph)

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^node_1_\d+$/)
      expect(id2).toMatch(/^node_2_\d+$/)
    })

    it('should increment nodeCounter', () => {
      expect(baseGraph.nodeCounter).toBe(0)

      generateNodeId(baseGraph)
      expect(baseGraph.nodeCounter).toBe(1)

      generateNodeId(baseGraph)
      expect(baseGraph.nodeCounter).toBe(2)
    })
  })

  describe('createActionNode', () => {
    it('should create a valid action node', () => {
      const node = createActionNode(
        baseGraph,
        1,
        'morning',
        'study',
        baseGameState,
        baseGameState
      )

      expect(node.id).toMatch(/^node_\d+_\d+$/)
      expect(node.type).toBe('action')
      expect(node.day).toBe(1)
      expect(node.slot).toBe('morning')
      expect(node.data).toBeDefined()
    })

    it('should record before and after stats', () => {
      const beforeState = JSON.parse(JSON.stringify(baseGameState)) as GameState
      beforeState.stats.daoXin = 1

      const afterState = JSON.parse(JSON.stringify(baseGameState)) as GameState
      afterState.stats.daoXin = 2

      const node = createActionNode(baseGraph, 1, 'morning', 'study', beforeState, afterState)

      const actionData = node.data as { beforeStats: { daoXin: number }; afterStats: { daoXin: number } }
      expect(actionData.beforeStats.daoXin).toBe(1)
      expect(actionData.afterStats.daoXin).toBe(2)
    })
  })

  describe('createStateNode', () => {
    it('should create a valid state node', () => {
      const node = createStateNode(baseGraph, 1, baseGameState)

      expect(node.type).toBe('state')
      expect(node.day).toBe(1)
      expect(node.data).toBeDefined()
    })
  })

  describe('recordAction', () => {
    it('should add action and state nodes to graph', () => {
      const result = recordAction(
        baseGraph,
        1,
        'morning',
        'study',
        baseGameState,
        baseGameState
      )

      expect(result.nodes.size).toBe(2)
      expect(result.edges.length).toBeGreaterThanOrEqual(1)
    })

    it('should create edge with correct properties', () => {
      const result = recordAction(
        baseGraph,
        1,
        'morning',
        'study',
        baseGameState,
        baseGameState
      )

      const edge = result.edges[0]
      expect(edge.from).toBeDefined()
      expect(edge.to).toBeDefined()
      expect(edge.weight).toBeGreaterThan(0)
      expect(edge.effectType).toBe('stat')
      expect(edge.day).toBe(1)
    })

    it('should record hidden variable contributions', () => {
      const hiddenContributions = { borrowTrauma: 0.5 }

      const result = recordAction(
        baseGraph,
        1,
        'morning',
        'study',
        baseGameState,
        baseGameState,
        hiddenContributions
      )

      const hiddenEdge = result.edges.find(e => e.effectType === 'hidden')
      expect(hiddenEdge).toBeDefined()
      expect(hiddenEdge?.hiddenVariable).toBe('borrowTrauma')
      expect(hiddenEdge?.weight).toBe(0.5)
    })

    it('should prune graph when exceeding maxNodes', () => {
      const smallConfig = { maxNodes: 5 }
      let graph = createCausalGraph()

      for (let i = 0; i < 10; i++) {
        graph = recordAction(graph, i, 'morning', 'study', baseGameState, baseGameState, undefined, smallConfig)
      }

      expect(graph.nodes.size).toBeLessThanOrEqual(5)
    })
  })

  describe('predictSequence', () => {
    it('should return current state for empty action sequence', () => {
      const result = predictSequence(baseGraph, baseGameState, [])

      expect(result.finalState).toBeDefined()
      expect(result.stateChain.length).toBe(1)
    })

    it('should predict state changes for action sequence', () => {
      const actions: ActionId[] = ['study', 'tuna', 'rest']

      const result = predictSequence(baseGraph, baseGameState, actions)

      expect(result.finalState).toBeDefined()
      expect(result.stateChain.length).toBe(actions.length + 1)
    })

    it('should apply hidden modifiers to predictions', () => {
      const modifiers: HiddenModifiers = {
        actionOutcomes: { study: 2.0, tuna: 0.5 },
        eventProbabilities: {},
        narrativeBias: []
      }

      const actions: ActionId[] = ['study', 'study', 'study']

      const resultWithModifiers = predictSequence(baseGraph, baseGameState, actions, modifiers)
      const resultWithoutModifiers = predictSequence(baseGraph, baseGameState, actions)

      expect(resultWithModifiers.stateChain[3].stats.daoXin)
        .toBeGreaterThan(resultWithoutModifiers.stateChain[3].stats.daoXin)
    })

    it('should calculate uncertainty intervals when modifiers present', () => {
      const modifiers: HiddenModifiers = {
        actionOutcomes: { study: 1.2 },
        eventProbabilities: {},
        narrativeBias: []
      }

      const actions: ActionId[] = ['study']

      const result = predictSequence(baseGraph, baseGameState, actions, modifiers)

      expect(Object.keys(result.uncertaintyIntervals).length).toBeGreaterThan(0)
    })

    it('should calculate risk indicators', () => {
      const actions: ActionId[] = ['study', 'tuna', 'train']

      const result = predictSequence(baseGraph, baseGameState, actions)

      expect(result.riskIndicators.length).toBeGreaterThan(0)
      expect(result.riskIndicators[0].type).toBeDefined()
      expect(result.riskIndicators[0].level).toBeDefined()
    })

    it('should predict potential events', () => {
      const highDebtState = { ...baseGameState }
      highDebtState.econ.debtPrincipal = 10000

      const actions: ActionId[] = ['borrow', 'borrow']

      const result = predictSequence(baseGraph, highDebtState, actions)

      expect(result.potentialEvents).toBeDefined()
    })

    it('should handle all action types', () => {
      const actions: ActionId[] = ['study', 'tuna', 'train', 'parttime', 'buy', 'rest', 'borrow', 'repay']

      const result = predictSequence(baseGraph, baseGameState, actions)

      expect(result.finalState).toBeDefined()
      expect(result.stateChain.length).toBe(actions.length + 1)
    })

    it('should simulate study action correctly', () => {
      const initialState = { ...baseGameState }
      initialState.stats.daoXin = 0
      initialState.stats.fatigue = 0
      initialState.stats.focus = 100

      const result = predictSequence(baseGraph, initialState, ['study'])

      expect(result.finalState.stats.daoXin).toBeGreaterThan(initialState.stats.daoXin)
      expect(result.finalState.stats.fatigue).toBeGreaterThan(initialState.stats.fatigue)
    })

    it('should simulate rest action correctly', () => {
      const initialState = { ...baseGameState }
      initialState.stats.fatigue = 80

      const result = predictSequence(baseGraph, initialState, ['rest'])

      expect(result.finalState.stats.fatigue).toBeLessThan(initialState.stats.fatigue)
    })

    it('should simulate borrow action correctly', () => {
      const initialState = { ...baseGameState }
      initialState.econ.cash = 0
      initialState.econ.debtPrincipal = 0

      const result = predictSequence(baseGraph, initialState, ['borrow'])

      expect(result.finalState.econ.cash).toBeGreaterThan(initialState.econ.cash)
      expect(result.finalState.econ.debtPrincipal).toBeGreaterThan(initialState.econ.debtPrincipal)
    })
  })

  describe('pruneGraph', () => {
    it('should not prune when under maxNodes', () => {
      const graph = createCausalGraph()

      for (let i = 0; i < 5; i++) {
        recordAction(graph, i, 'morning', 'study', baseGameState, baseGameState)
      }

      const result = pruneGraph(graph, 100)

      expect(result.nodes.size).toBe(10)
    })

    it('should prune oldest leaf nodes first', () => {
      const graph = createCausalGraph()

      for (let i = 0; i < 20; i++) {
        recordAction(graph, i, 'morning', 'study', baseGameState, baseGameState)
      }

      const result = pruneGraph(graph, 10)

      expect(result.nodes.size).toBeLessThanOrEqual(10)
    })

    it('should preserve critical path nodes', () => {
      const graph = createCausalGraph()

      for (let i = 0; i < 10; i++) {
        recordAction(graph, i, 'morning', 'study', baseGameState, baseGameState)
      }

      const lastNodeId = Array.from(graph.nodes.keys()).pop()
      const result = pruneGraph(graph, 5)

      expect(result.nodes.has(lastNodeId!)).toBe(true)
    })
  })

  describe('getRecentChain', () => {
    it('should return empty array for empty graph', () => {
      const result = getRecentChain(baseGraph, 7)

      expect(result).toEqual([])
    })

    it('should return nodes within time window', () => {
      recordAction(baseGraph, 1, 'morning', 'study', baseGameState, baseGameState)

      const result = getRecentChain(baseGraph, 7)

      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('getActionHistory', () => {
    it('should return empty array for empty graph', () => {
      const result = getActionHistory(baseGraph)

      expect(result).toEqual([])
    })

    it('should return action nodes sorted by timestamp', () => {
      recordAction(baseGraph, 1, 'morning', 'study', baseGameState, baseGameState)
      recordAction(baseGraph, 1, 'afternoon', 'tuna', baseGameState, baseGameState)
      recordAction(baseGraph, 1, 'night', 'rest', baseGameState, baseGameState)

      const result = getActionHistory(baseGraph, 2)

      expect(result.length).toBe(2)
      expect(result[0].type).toBe('action')
    })

    it('should respect limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        recordAction(baseGraph, i, 'morning', 'study', baseGameState, baseGameState)
      }

      const result = getActionHistory(baseGraph, 3)

      expect(result.length).toBe(3)
    })
  })

  describe('getStateAtNode', () => {
    it('should return null for non-existent node', () => {
      const result = getStateAtNode(baseGraph, 'non_existent')

      expect(result).toBeNull()
    })

    it('should return state for state node', () => {
      recordAction(baseGraph, 1, 'morning', 'study', baseGameState, baseGameState)

      const stateNodeId = Array.from(baseGraph.nodes.values()).find(n => n.type === 'state')?.id

      const result = getStateAtNode(baseGraph, stateNodeId!)

      expect(result).toBeDefined()
    })

    it('should return target state for action node', () => {
      recordAction(baseGraph, 1, 'morning', 'study', baseGameState, baseGameState)

      const actionNodeId = Array.from(baseGraph.nodes.values()).find(n => n.type === 'action')?.id

      const result = getStateAtNode(baseGraph, actionNodeId!)

      expect(result).toBeDefined()
    })
  })

  describe('validateGraph', () => {
    it('should return valid for empty graph', () => {
      const result = validateGraph(baseGraph)

      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should detect missing node references', () => {
      baseGraph.edges.push({
        from: 'non_existent',
        to: 'also_non_existent',
        weight: 1,
        effectType: 'stat',
        day: 1
      })

      const result = validateGraph(baseGraph)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('serializeGraph and deserializeGraph', () => {
    it('should serialize and deserialize graph correctly', () => {
      recordAction(baseGraph, 1, 'morning', 'study', baseGameState, baseGameState)
      recordAction(baseGraph, 1, 'afternoon', 'tuna', baseGameState, baseGameState)

      const json = serializeGraph(baseGraph)
      const deserialized = deserializeGraph(json)

      expect(deserialized).not.toBeNull()
      expect(deserialized!.nodes.size).toBe(baseGraph.nodes.size)
      expect(deserialized!.edges.length).toBe(baseGraph.edges.length)
      expect(deserialized!.nodeCounter).toBe(baseGraph.nodeCounter)
    })

    it('should return null for invalid JSON', () => {
      const result = deserializeGraph('invalid json')

      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = deserializeGraph('')

      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle consecutive same actions', () => {
      const actions: ActionId[] = ['study', 'study', 'study', 'study', 'study']

      const result = predictSequence(baseGraph, baseGameState, actions)

      expect(result.finalState.stats.daoXin).toBeGreaterThan(baseGameState.stats.daoXin)
    })

    it('should handle fatigue exceeding 100', () => {
      const exhaustedState = { ...baseGameState }
      exhaustedState.stats.fatigue = 95

      const actions: ActionId[] = ['train', 'train', 'train', 'train']

      const result = predictSequence(baseGraph, exhaustedState, actions)

      expect(result.finalState.stats.fatigue).toBeLessThanOrEqual(100)
    })

    it('should handle focus dropping below 0', () => {
      const focusedState = { ...baseGameState }
      focusedState.stats.focus = 5

      const actions: ActionId[] = ['train', 'train', 'train']

      const result = predictSequence(baseGraph, focusedState, actions)

      expect(result.finalState.stats.focus).toBeGreaterThanOrEqual(0)
    })

    it('should handle repay when cash is insufficient', () => {
      const debtState = { ...baseGameState }
      debtState.econ.cash = 10
      debtState.econ.debtPrincipal = 1000
      debtState.econ.debtInterestAccrued = 100

      const result = predictSequence(baseGraph, debtState, ['repay'])

      expect(result.finalState.econ.cash).toBe(0)
      expect(result.finalState.econ.debtInterestAccrued).toBeLessThan(debtState.econ.debtInterestAccrued)
    })

    it('should handle repay when cash equals debt', () => {
      const debtState = { ...baseGameState }
      debtState.econ.cash = 1100
      debtState.econ.debtPrincipal = 1000
      debtState.econ.debtInterestAccrued = 100

      const result = predictSequence(baseGraph, debtState, ['repay'])

      expect(result.finalState.econ.debtPrincipal).toBe(0)
      expect(result.finalState.econ.debtInterestAccrued).toBe(0)
    })

    it('should handle 21-day prediction sequence', () => {
      const actions: ActionId[] = Array(21).fill('study') as ActionId[]

      const startTime = Date.now()
      const result = predictSequence(baseGraph, baseGameState, actions)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100)
      expect(result.finalState).toBeDefined()
      expect(result.stateChain.length).toBe(22)
    })
  })
})

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  const schoolOverrides = overrides.school || {}
  const econOverrides = overrides.econ || {}

  return {
    started: true,
    seed: 12345,
    stats: {
      daoXin: 1,
      faLi: 0,
      rouTi: 5,
      fatigue: 30,
      focus: 80
    },
    econ: {
      cash: 1000,
      collectionFee: 0,
      debtPrincipal: 10000,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 1,
      ...econOverrides
    },
    school: {
      day: 1,
      week: 1,
      slot: 'morning',
      classTier: '普通班' as const,
      lastExamScore: 60,
      lastRank: 20,
      perks: {
        mealSubsidy: 0,
        focusBonus: 0
      },
      ...schoolOverrides
    },
    contract: {
      active: false,
      name: '',
      patron: '',
      progress: 0,
      vigilance: 0,
      lastTriggerDay: 0
    },
    logs: [],
    bodyPartRepayment: {},
    domestication: 0,
    numbness: 0,
    lastStrongCollapseDay: 0,
    nextStrongCollapseEarliestDay: 0,
    collapseFirstDone: {},
    collapseModifierActive: false,
    summaryUnlocked: false,
    summaryUnlockedAtDay: 0,
    summarySeen: false,
    summarySeenAtDay: 0,
    profileSnapshot: undefined,
    antiProfileDayStreak: 0,
    ...overrides
  }
}
