import type {
  ActionId,
  CausalGraph,
  CausalNode,
  CausalEdge,
  ActionRecord,
  StateSnapshot,
  PredictionResult,
  RiskIndicator,
  RiskLevel,
  EffectType,
  SlotId,
  PlayerStats,
  EconomyState,
  SchoolState,
  ContractState,
  GameState,
  HiddenModifiers
} from '~/types/game'

export const DEFAULT_MAX_NODES = 1000

export interface GraphConfig {
  maxNodes: number
}

const DEFAULT_CONFIG: GraphConfig = {
  maxNodes: DEFAULT_MAX_NODES
}

export function createCausalGraph(): CausalGraph {
  return {
    nodes: new Map(),
    edges: [],
    nodeCounter: 0
  }
}

export function generateNodeId(graph: CausalGraph): string {
  graph.nodeCounter++
  return `node_${graph.nodeCounter}_${Date.now()}`
}

export function createActionNode(
  graph: CausalGraph,
  day: number,
  slot: SlotId,
  actionId: ActionId,
  beforeState: GameState,
  afterState: GameState,
  hiddenContributions?: Record<string, number>
): CausalNode {
  const actionRecord: ActionRecord = {
    actionId,
    beforeStats: { ...beforeState.stats },
    afterStats: { ...afterState.stats },
    beforeEcon: { ...beforeState.econ },
    afterEcon: { ...afterState.econ }
  }

  const node: CausalNode = {
    id: generateNodeId(graph),
    type: 'action',
    timestamp: Date.now(),
    day,
    slot,
    data: actionRecord
  }

  return node
}

export function createStateNode(
  graph: CausalGraph,
  day: number,
  state: GameState
): CausalNode {
  const stateSnapshot: StateSnapshot = {
    stats: { ...state.stats },
    econ: { ...state.econ },
    school: { ...state.school },
    contract: { ...state.contract },
    fatigue: state.stats.fatigue,
    focus: state.stats.focus
  }

  const node: CausalNode = {
    id: generateNodeId(graph),
    type: 'state',
    timestamp: Date.now(),
    day,
    data: stateSnapshot
  }

  return node
}

export function recordAction(
  graph: CausalGraph,
  day: number,
  slot: SlotId,
  actionId: ActionId,
  beforeState: GameState,
  afterState: GameState,
  hiddenContributions?: Record<string, number>,
  config: GraphConfig = DEFAULT_CONFIG
): CausalGraph {
  const actionNode = createActionNode(graph, day, slot, actionId, beforeState, afterState, hiddenContributions)
  const stateNode = createStateNode(graph, day, afterState)

  graph.nodes.set(actionNode.id, actionNode)
  graph.nodes.set(stateNode.id, stateNode)

  const edges = createEdgesForAction(actionNode, stateNode, hiddenContributions, day)
  graph.edges.push(...edges)

  if (graph.nodes.size > config.maxNodes) {
    return pruneGraph(graph, config.maxNodes)
  }

  return graph
}

function createEdgesForAction(
  actionNode: CausalNode,
  stateNode: CausalNode,
  hiddenContributions: Record<string, number> | undefined,
  day: number
): CausalEdge[] {
  const edges: CausalEdge[] = []
  const actionRecord = actionNode.data as ActionRecord

  edges.push({
    from: actionNode.id,
    to: stateNode.id,
    weight: 1.0,
    effectType: 'stat',
    day
  })

  if (hiddenContributions) {
    for (const [variable, contribution] of Object.entries(hiddenContributions)) {
      if (Math.abs(contribution) > 0.01) {
        edges.push({
          from: actionNode.id,
          to: stateNode.id,
          weight: contribution,
          effectType: 'hidden',
          hiddenVariable: variable,
          day
        })
      }
    }
  }

  return edges
}

function getStatDelta(before: Partial<PlayerStats>, after: Partial<PlayerStats>, key: keyof PlayerStats): number {
  const beforeVal = before[key] ?? 0
  const afterVal = after[key] ?? 0
  return afterVal - beforeVal
}

function getEconDelta(before: Partial<EconomyState>, after: Partial<EconomyState>, key: keyof EconomyState): number {
  const beforeVal = before[key] ?? 0
  const afterVal = after[key] ?? 0
  return afterVal - beforeVal
}

export function predictSequence(
  graph: CausalGraph,
  currentState: GameState,
  actions: ActionId[],
  hiddenModifiers?: HiddenModifiers,
  config: GraphConfig = DEFAULT_CONFIG
): PredictionResult {
  if (actions.length === 0) {
    const currentSnapshot = createStateSnapshot(currentState)
    return {
      finalState: currentSnapshot,
      stateChain: [currentSnapshot],
      uncertaintyIntervals: {},
      riskIndicators: calculateRiskIndicators(currentSnapshot),
      potentialEvents: []
    }
  }

  const stateChain: StateSnapshot[] = []
  const uncertaintyIntervals: Record<string, [number, number]> = {}
  let currentGameState = { ...currentState }

  stateChain.push(createStateSnapshot(currentGameState))

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    const day = currentGameState.school.day + Math.floor(i / 3)
    const slotIndex = i % 3
    const slots: SlotId[] = ['morning', 'afternoon', 'night']
    const slot = slots[slotIndex]

    const beforeState = { ...currentGameState }
    const afterState = simulateAction(beforeState, action, hiddenModifiers)

    if (hiddenModifiers) {
      const modifier = hiddenModifiers.actionOutcomes[action] || 1.0
      const uncertainty = Math.abs(modifier - 1.0) * 0.5
      for (const stat of ['daoXin', 'faLi', 'rouTi'] as (keyof PlayerStats)[]) {
        const key = `predicted_${stat}_${i}`
        const baseDelta = getStatDelta(beforeState.stats, afterState.stats, stat)
        uncertaintyIntervals[key] = [
          baseDelta * (1 - uncertainty),
          baseDelta * (1 + uncertainty)
        ]
      }
    }

    currentGameState = afterState
    stateChain.push(createStateSnapshot(currentGameState))
  }

  const riskIndicators = calculateRiskIndicators(stateChain[stateChain.length - 1])
  const potentialEvents = predictPotentialEvents(stateChain, actions)

  return {
    finalState: stateChain[stateChain.length - 1],
    stateChain,
    uncertaintyIntervals,
    riskIndicators,
    potentialEvents
  }
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

function createStateSnapshot(state: GameState): StateSnapshot {
  return {
    stats: { ...state.stats },
    econ: { ...state.econ },
    school: { ...state.school },
    contract: { ...state.contract },
    fatigue: state.stats.fatigue,
    focus: state.stats.focus
  }
}

function calculateRiskIndicators(state: StateSnapshot): RiskIndicator[] {
  const indicators: RiskIndicator[] = []

  const debtToIncomeRatio = state.econ.debtPrincipal / Math.max(1, state.econ.cash + 1)
  if (debtToIncomeRatio > 10) {
    indicators.push({
      type: 'debt_trajectory',
      level: 'critical',
      description: '债务严重超出偿还能力'
    })
  } else if (debtToIncomeRatio > 5) {
    indicators.push({
      type: 'debt_trajectory',
      level: 'high',
      description: '债务压力较大'
    })
  } else if (debtToIncomeRatio > 2) {
    indicators.push({
      type: 'debt_trajectory',
      level: 'medium',
      description: '债务需关注'
    })
  } else {
    indicators.push({
      type: 'debt_trajectory',
      level: 'low',
      description: '债务处于安全水平'
    })
  }

  if (state.fatigue >= 90) {
    indicators.push({
      type: 'fatigue_accumulation',
      level: 'critical',
      description: '疲劳过度，需要休息'
    })
  } else if (state.fatigue >= 70) {
    indicators.push({
      type: 'fatigue_accumulation',
      level: 'high',
      description: '疲劳累积严重'
    })
  } else if (state.fatigue >= 50) {
    indicators.push({
      type: 'fatigue_accumulation',
      level: 'medium',
      description: '疲劳需要注意'
    })
  } else {
    indicators.push({
      type: 'fatigue_accumulation',
      level: 'low',
      description: '状态良好'
    })
  }

  if (state.school.day >= 7) {
    const projectedScore = state.stats.daoXin * 5 + state.stats.faLi * 2 + (10 - state.stats.rouTi) * 3
    if (projectedScore < 30) {
      indicators.push({
        type: 'exam_forecast',
        level: 'high',
        description: '月考成绩可能不理想'
      })
    } else if (projectedScore < 50) {
      indicators.push({
        type: 'exam_forecast',
        level: 'medium',
        description: '月考成绩有待提高'
      })
    } else {
      indicators.push({
        type: 'exam_forecast',
        level: 'low',
        description: '月考成绩预计良好'
      })
    }
  }

  if (state.econ.delinquency >= 3) {
    indicators.push({
      type: 'collapse_risk',
      level: 'critical',
      description: '逾期严重，崩溃风险极高'
    })
  } else if (state.econ.delinquency >= 2) {
    indicators.push({
      type: 'collapse_risk',
      level: 'high',
      description: '逾期情况危险'
    })
  } else if (state.econ.delinquency >= 1) {
    indicators.push({
      type: 'collapse_risk',
      level: 'medium',
      description: '有逾期风险'
    })
  }

  return indicators
}

function predictPotentialEvents(stateChain: StateSnapshot[], actions: ActionId[]): string[] {
  const events: string[] = []
  const lastState = stateChain[stateChain.length - 1]

  if (lastState.econ.debtPrincipal > 5000 && actions.includes('borrow')) {
    events.push('债务累积警告：高频借贷可能触发催收')
  }

  if (lastState.fatigue >= 80 && actions.includes('train')) {
    events.push('崩溃风险：疲劳过高时炼体可能出事')
  }

  if (lastState.econ.delinquency >= 2) {
    events.push('逾期危机：高等级逾期可能触发强制措施')
  }

  if (lastState.contract.active && lastState.contract.progress >= 80) {
    events.push('契约悬崖：契约进度过高可能触发反噬')
  }

  if (lastState.econ.cash < 200 && actions.includes('parttime')) {
    events.push('经济压力：现金不足可能限制行动')
  }

  if (lastState.focus < 20) {
    events.push('专注耗尽：低专注可能影响修炼效果')
  }

  return events
}

export function pruneGraph(graph: CausalGraph, maxNodes: number): CausalGraph {
  if (graph.nodes.size <= maxNodes) {
    return graph
  }

  const nodesToRemove: string[] = []
  const nodesArray = Array.from(graph.nodes.values())
  const criticalNodeIds = new Set<string>()

  const currentNode = nodesArray[nodesArray.length - 1]
  if (currentNode) {
    criticalNodeIds.add(currentNode.id)
  }

  const leafNodes = nodesArray.filter(node => {
    const hasOutgoingEdges = graph.edges.some(e => e.from === node.id)
    return !hasOutgoingEdges && node.type === 'state'
  })

  for (const node of leafNodes) {
    if (!criticalNodeIds.has(node.id)) {
      nodesToRemove.push(node.id)
    }
    if (nodesToRemove.length >= graph.nodes.size - maxNodes) {
      break
    }
  }

  if (nodesToRemove.length < graph.nodes.size - maxNodes) {
    const actionNodes = nodesArray.filter(node => {
      return node.type === 'action' && !criticalNodeIds.has(node.id) && !nodesToRemove.includes(node.id)
    })

    for (const node of actionNodes) {
      nodesToRemove.push(node.id)
      if (nodesToRemove.length >= graph.nodes.size - maxNodes) {
        break
      }
    }
  }

  for (const nodeId of nodesToRemove) {
    graph.nodes.delete(nodeId)
  }

  graph.edges = graph.edges.filter(edge => {
    return !nodesToRemove.includes(edge.from) && !nodesToRemove.includes(edge.to)
  })

  return graph
}

export function getRecentChain(graph: CausalGraph, days: number): CausalNode[] {
  const now = Date.now()
  const cutoffTime = now - days * 24 * 60 * 60 * 1000

  const recentNodes = Array.from(graph.nodes.values())
    .filter(node => node.timestamp >= cutoffTime || node.day >= graph.nodes.size - days * 3)
    .sort((a, b) => a.timestamp - b.timestamp)

  return recentNodes
}

export function getActionHistory(graph: CausalGraph, limit: number = 10): CausalNode[] {
  const actionNodes = Array.from(graph.nodes.values())
    .filter(node => node.type === 'action')
    .sort((a, b) => b.timestamp - a.timestamp)

  return actionNodes.slice(0, limit)
}

export function getStateAtNode(graph: CausalGraph, nodeId: string): StateSnapshot | null {
  const node = graph.nodes.get(nodeId)
  if (!node) return null

  if (node.type === 'state') {
    return node.data as StateSnapshot
  }

  const outgoingEdge = graph.edges.find(e => e.from === nodeId)
  if (!outgoingEdge) return null

  const targetNode = graph.nodes.get(outgoingEdge.to)
  if (!targetNode || targetNode.type !== 'state') return null

  return targetNode.data as StateSnapshot
}

export function validateGraph(graph: CausalGraph): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  const nodeIds = new Set(graph.nodes.keys())
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge references non-existent source node: ${edge.from}`)
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge references non-existent target node: ${edge.to}`)
    }
  }

  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true
    }
    if (visited.has(nodeId)) {
      return false
    }

    visited.add(nodeId)
    recursionStack.add(nodeId)

    const outgoingEdges = graph.edges.filter(e => e.from === nodeId)
    for (const edge of outgoingEdges) {
      if (hasCycle(edge.to)) {
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  for (const nodeId of nodeIds) {
    if (hasCycle(nodeId)) {
      errors.push(`Cycle detected in graph starting from node: ${nodeId}`)
      break
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function serializeGraph(graph: CausalGraph): string {
  const serializable = {
    nodes: Array.from(graph.nodes.entries()),
    edges: graph.edges,
    nodeCounter: graph.nodeCounter
  }
  return JSON.stringify(serializable)
}

export function deserializeGraph(json: string): CausalGraph | null {
  try {
    const parsed = JSON.parse(json)
    return {
      nodes: new Map(parsed.nodes),
      edges: parsed.edges,
      nodeCounter: parsed.nodeCounter
    }
  } catch {
    return null
  }
}
