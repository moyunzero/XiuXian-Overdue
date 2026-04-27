import type {
  ActionId,
  EmotionalMemory,
  SessionSummary,
  PersonalityProfile,
  HiddenModifiers,
  AggregateMetrics,
  RoutePreference,
  RiskTolerance,
  ComplianceTendency,
  ResourceStrategy,
  BodyAutonomyValue,
  StressResponse,
  GameState
} from '~/types/game'

export const EMOTIONAL_MEMORY_STORAGE_KEY = 'kunxu_sim_emotional_memory_v1'
export const EMOTIONAL_MEMORY_VERSION = 1
export const DEFAULT_MAX_SESSIONS = 50

export interface MemoryConfig {
  maxSessions: number
}

const DEFAULT_CONFIG: MemoryConfig = {
  maxSessions: DEFAULT_MAX_SESSIONS
}

export function createDefaultEmotionalMemory(): EmotionalMemory {
  return {
    version: EMOTIONAL_MEMORY_VERSION,
    sessions: [],
    aggregateMetrics: createDefaultAggregateMetrics(),
    lastUpdated: Date.now()
  }
}

export function createDefaultAggregateMetrics(): AggregateMetrics {
  return {
    totalSessions: 0,
    totalActions: 0,
    avgBorrowRate: 0,
    avgScoreRouteRate: 0,
    avgBodyRepaymentRate: 0,
    avgContractAcceptRate: 0,
    avgRestRate: 0,
    antiProfileStreakAvg: 0
  }
}

export function initEmotionalMemory(
  stored?: EmotionalMemory | null,
  config: MemoryConfig = DEFAULT_CONFIG
): EmotionalMemory {
  if (!stored || stored.version !== EMOTIONAL_MEMORY_VERSION) {
    return createDefaultEmotionalMemory()
  }
  return pruneMemory(stored, config.maxSessions)
}

export function recordSession(
  memory: EmotionalMemory,
  session: SessionSummary,
  config: MemoryConfig = DEFAULT_CONFIG
): EmotionalMemory {
  const newSessions = [...memory.sessions, session]
  const prunedSessions = newSessions.length > config.maxSessions
    ? pruneSessionsByWeight(newSessions, config.maxSessions)
    : newSessions

  const newMemory: EmotionalMemory = {
    ...memory,
    sessions: prunedSessions,
    aggregateMetrics: calculateAggregateMetrics(prunedSessions),
    lastUpdated: Date.now()
  }

  return newMemory
}

function pruneSessionsByWeight(sessions: SessionSummary[], maxSessions: number): SessionSummary[] {
  const scored = sessions.map((s, index) => ({
    session: s,
    score: calculateSessionScore(s, index, sessions.length)
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, maxSessions).map(s => s.session)
}

function calculateSessionScore(session: SessionSummary, index: number, total: number): number {
  const recencyScore = index / total
  const durationScore = Math.min(session.totalDays / 30, 1)
  const diversityScore = calculateDiversityScore(session)
  const outcomeScore = calculateOutcomeScore(session)

  return recencyScore * 0.2 + durationScore * 0.3 + diversityScore * 0.2 + outcomeScore * 0.3
}

function calculateDiversityScore(session: SessionSummary): number {
  const actionTypes = Object.keys(session.actionCounts).length
  return Math.min(actionTypes / 6, 1)
}

function calculateOutcomeScore(session: SessionSummary): number {
  const hasDebt = session.finalDebt > 0
  const hasCash = session.finalCash > 0
  const survived = session.finalTier !== ''

  if (!survived) return 0
  if (hasDebt && !hasCash) return 0.3
  if (!hasDebt && hasCash) return 1.0
  if (!hasDebt && !hasCash) return 0.5
  return 0.7
}

export function buildPersonalityProfile(memory: EmotionalMemory): PersonalityProfile {
  const metrics = memory.aggregateMetrics
  const recentSessions = memory.sessions.slice(-10)

  const riskTolerance = calculateRiskTolerance(metrics)
  const complianceTendency = calculateComplianceTendency(metrics, recentSessions)
  const resourceStrategy = calculateResourceStrategy(metrics)
  const bodyAutonomyValue = calculateBodyAutonomyValue(metrics, recentSessions)
  const stressResponse = calculateStressResponse(recentSessions)
  const dominantTraits = extractDominantTraits(metrics, recentSessions)

  return {
    riskTolerance,
    complianceTendency,
    resourceStrategy,
    bodyAutonomyValue,
    stressResponse,
    dominantTraits
  }
}

function calculateRiskTolerance(metrics: AggregateMetrics): RiskTolerance {
  const borrowRate = metrics.avgBorrowRate

  if (borrowRate < 0.1) return 'conservative'
  if (borrowRate < 0.3) return 'moderate'
  return 'aggressive'
}

function calculateComplianceTendency(
  metrics: AggregateMetrics,
  recentSessions: SessionSummary[]
): ComplianceTendency {
  const contractRate = metrics.avgContractAcceptRate
  const bodyRepaymentRate = metrics.avgBodyRepaymentRate

  const combinedScore = contractRate * 0.6 + bodyRepaymentRate * 0.4

  if (combinedScore < 0.2) return 'resistant'
  if (combinedScore < 0.5) return 'adaptive'
  return 'compliant'
}

function calculateResourceStrategy(metrics: AggregateMetrics): ResourceStrategy {
  const scoreRate = metrics.avgScoreRouteRate

  if (scoreRate > 0.7) return 'accumulator'
  if (scoreRate > 0.3) return 'balanced'
  return 'spender'
}

function calculateBodyAutonomyValue(
  metrics: AggregateMetrics,
  recentSessions: SessionSummary[]
): BodyAutonomyValue {
  const bodyRepaymentRate = metrics.avgBodyRepaymentRate
  const recentBodyCount = recentSessions.filter(s => s.bodyPartRepaymentCount > 0).length
  const recentRatio = recentSessions.length > 0 ? recentBodyCount / recentSessions.length : 0

  const avgRate = recentSessions.length > 0
    ? (bodyRepaymentRate + recentRatio) / 2
    : bodyRepaymentRate

  if (avgRate < 0.1) return 'high'
  if (avgRate < 0.3) return 'medium'
  return 'low'
}

function calculateStressResponse(recentSessions: SessionSummary[]): StressResponse {
  if (recentSessions.length === 0) return 'fighter'

  const borrowAfterDebt = recentSessions.filter(s => {
    const hadDebt = s.finalDebt > 0
    return hadDebt && s.borrowCount > 0
  }).length

  const ratio = borrowAfterDebt / recentSessions.length

  if (ratio > 0.6) return 'fighter'
  if (ratio > 0.3) return 'negotiator'
  return 'avoider'
}

function extractDominantTraits(
  metrics: AggregateMetrics,
  recentSessions: SessionSummary[]
): string[] {
  const traits: string[] = []

  if (metrics.totalSessions === 0) {
    return traits
  }

  if (metrics.avgBorrowRate > 0.4) {
    traits.push('高频借贷者')
  }

  if (metrics.avgScoreRouteRate > 0.6) {
    traits.push('刷分优先')
  } else if (metrics.avgScoreRouteRate < 0.3) {
    traits.push('现金优先')
  }

  if (metrics.avgBodyRepaymentRate > 0.3) {
    traits.push('身体置换者')
  }

  if (metrics.avgContractAcceptRate > 0.5) {
    traits.push('契约依赖者')
  }

  if (metrics.antiProfileStreakAvg > 3) {
    traits.push('反画像选手')
  }

  return traits
}

export function getHiddenModifiers(profile: PersonalityProfile): HiddenModifiers {
  const actionOutcomes: Record<string, number> = {}
  const eventProbabilities: Record<string, number> = {}

  switch (profile.riskTolerance) {
    case 'conservative':
      actionOutcomes.study = 1.1
      actionOutcomes.tuna = 1.1
      actionOutcomes.train = 0.95
      actionOutcomes.borrow = 0.8
      eventProbabilities.debtCollection = 0.9
      eventProbabilities.riskyContract = 0.7
      break
    case 'moderate':
      actionOutcomes.study = 1.0
      actionOutcomes.tuna = 1.0
      actionOutcomes.train = 1.0
      actionOutcomes.borrow = 1.0
      eventProbabilities.debtCollection = 1.0
      eventProbabilities.riskyContract = 1.0
      break
    case 'aggressive':
      actionOutcomes.study = 0.9
      actionOutcomes.tuna = 0.9
      actionOutcomes.train = 1.15
      actionOutcomes.borrow = 1.2
      eventProbabilities.debtCollection = 1.2
      eventProbabilities.riskyContract = 1.3
      break
  }

  switch (profile.complianceTendency) {
    case 'resistant':
      eventProbabilities.authorityEvent = 0.8
      eventProbabilities.complianceEvent = 1.2
      break
    case 'adaptive':
      eventProbabilities.authorityEvent = 1.0
      eventProbabilities.complianceEvent = 1.0
      break
    case 'compliant':
      eventProbabilities.authorityEvent = 1.3
      eventProbabilities.complianceEvent = 0.7
      break
  }

  switch (profile.resourceStrategy) {
    case 'accumulator':
      actionOutcomes.parttime = 0.9
      actionOutcomes.buy = 0.85
      eventProbabilities.economicOpportunity = 1.15
      break
    case 'balanced':
      actionOutcomes.parttime = 1.0
      actionOutcomes.buy = 1.0
      eventProbabilities.economicOpportunity = 1.0
      break
    case 'spender':
      actionOutcomes.parttime = 1.1
      actionOutcomes.buy = 1.2
      eventProbabilities.economicOpportunity = 0.85
      break
  }

  switch (profile.bodyAutonomyValue) {
    case 'high':
      eventProbabilities.bodyRepaymentEvent = 0.7
      eventProbabilities.bodyHarmingEvent = 0.8
      break
    case 'medium':
      eventProbabilities.bodyRepaymentEvent = 1.0
      eventProbabilities.bodyHarmingEvent = 1.0
      break
    case 'low':
      eventProbabilities.bodyRepaymentEvent = 1.3
      eventProbabilities.bodyHarmingEvent = 1.2
      break
  }

  const narrativeBias: string[] = []
  if (profile.riskTolerance === 'aggressive') {
    narrativeBias.push('crisis', 'danger', 'highStakes')
  } else if (profile.riskTolerance === 'conservative') {
    narrativeBias.push('caution', 'stability', 'gradual')
  }

  if (profile.complianceTendency === 'resistant') {
    narrativeBias.push('rebellion', 'defiance')
  } else if (profile.complianceTendency === 'compliant') {
    narrativeBias.push('acceptance', 'system')
  }

  return {
    actionOutcomes,
    eventProbabilities,
    narrativeBias
  }
}

function calculateAggregateMetrics(sessions: SessionSummary[]): AggregateMetrics {
  if (sessions.length === 0) {
    return createDefaultAggregateMetrics()
  }

  const totalSessions = sessions.length
  let totalActions = 0
  let totalBorrowRate = 0
  let totalScoreRouteRate = 0
  let totalBodyRepaymentRate = 0
  let totalContractAcceptRate = 0
  let totalRestRate = 0
  let totalAntiProfileStreak = 0

  for (const session of sessions) {
    const actions = Object.values(session.actionCounts).reduce((a, b) => a + b, 0)
    totalActions += actions

    const borrowRate = actions > 0 ? session.borrowCount / actions : 0
    totalBorrowRate += borrowRate

    const scoreActions = (session.actionCounts.study || 0) + (session.actionCounts.tuna || 0)
    const scoreRouteRate = actions > 0 ? scoreActions / actions : 0
    totalScoreRouteRate += scoreRouteRate

    const restRate = actions > 0 ? (session.actionCounts.rest || 0) / actions : 0
    totalRestRate += restRate

    const bodyRepaymentRate = session.totalDays > 0 ? session.bodyPartRepaymentCount / session.totalDays : 0
    totalBodyRepaymentRate += bodyRepaymentRate

    totalContractAcceptRate += session.contractAccepted ? 1 : 0

    totalAntiProfileStreak += session.antiProfileStreakMax
  }

  return {
    totalSessions,
    totalActions,
    avgBorrowRate: totalBorrowRate / totalSessions,
    avgScoreRouteRate: totalScoreRouteRate / totalSessions,
    avgBodyRepaymentRate: totalBodyRepaymentRate / totalSessions,
    avgContractAcceptRate: totalContractAcceptRate / totalSessions,
    avgRestRate: totalRestRate / totalSessions,
    antiProfileStreakAvg: totalAntiProfileStreak / totalSessions
  }
}

export function pruneMemory(memory: EmotionalMemory, maxSessions: number): EmotionalMemory {
  if (memory.sessions.length <= maxSessions) {
    return memory
  }

  const prunedSessions = pruneSessionsByWeight(memory.sessions, maxSessions)

  return {
    ...memory,
    sessions: prunedSessions,
    aggregateMetrics: calculateAggregateMetrics(prunedSessions),
    lastUpdated: Date.now()
  }
}

export function createSessionSummaryFromGameState(
  gameState: GameState,
  startDay: number,
  startTime: number,
  antiProfileStreakMax: number = 0
): SessionSummary {
  const actionCounts = gameState.sessionMetrics?.actionCounts || gameState.daySlotActions || {}
  const totalActions = Object.values(actionCounts).reduce((sum, count) => sum + count, 0)
  const borrowCount = gameState.sessionMetrics?.borrowCount || 0
  const bodyPartRepaymentCount = gameState.sessionMetrics?.bodyPartRepaymentCount || 0

  const studyCount = actionCounts.study || 0
  const tunaCount = actionCounts.tuna || 0
  const parttimeCount = actionCounts.parttime || 0
  const scoreActions = studyCount + tunaCount
  const cashActions = parttimeCount

  let routePreference: RoutePreference = 'mixed'
  if (totalActions === 0) {
    routePreference = 'mixed'
  } else if (scoreActions > cashActions * 2) {
    routePreference = 'score'
  } else if (cashActions > scoreActions * 2) {
    routePreference = 'cash'
  }

  const finalDebt = gameState.econ.debtPrincipal + gameState.econ.debtInterestAccrued

  return {
    id: generateSessionId(),
    startDay,
    endDay: gameState.school.day,
    totalDays: Math.max(1, gameState.school.day - startDay),
    actionCounts,
    borrowCount,
    bodyPartRepaymentCount,
    contractAccepted: gameState.contract.active,
    contractFinalProgress: gameState.contract.progress,
    finalTier: gameState.school.classTier,
    finalDebt,
    finalCash: gameState.econ.cash,
    antiProfileStreakMax,
    routePreference,
    timestamp: startTime
  }
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function applyMemoryToState(
  memory: EmotionalMemory,
  state: GameState
): GameState {
  const profile = buildPersonalityProfile(memory)
  const modifiers = getHiddenModifiers(profile)

  const sessionMetrics: GameState['sessionMetrics'] = {
    actionCounts: {},
    borrowCount: 0,
    bodyPartRepaymentCount: 0,
    antiProfileActionCount: 0,
    restCount: 0,
    startTime: Date.now()
  }

  const hiddenVariables: GameState['hiddenVariables'] = {
    emotionalResidues: {
      borrowTrauma: memory.aggregateMetrics.avgBorrowRate > 0.3 ? memory.aggregateMetrics.avgBorrowRate * 50 : 0,
      complianceFatigue: memory.aggregateMetrics.avgContractAcceptRate * 30,
      bodyConcern: memory.aggregateMetrics.avgBodyRepaymentRate * 40
    },
    environmentalFactors: {
      marketConditions: 0,
      institutionalScrutiny: memory.aggregateMetrics.avgContractAcceptRate > 0.5 ? 20 : 0
    },
    npcAttitudes: {},
    narrativeMomentum: {
      crisisTendency: modifiers.actionOutcomes.borrow > 1 ? 1 : 0,
      stabilityTendency: modifiers.actionOutcomes.study > 1 ? 1 : 0
    }
  }

  return {
    ...state,
    sessionMetrics,
    hiddenVariables
  } as GameState
}

export function mergeEmotionalMemory(
  local: EmotionalMemory,
  imported: EmotionalMemory,
  conflictResolution: 'local' | 'imported' | 'newest' = 'newest'
): EmotionalMemory {
  const mergedSessions = [...local.sessions]

  for (const importedSession of imported.sessions) {
    const existingIndex = mergedSessions.findIndex(s => s.id === importedSession.id)

    if (existingIndex === -1) {
      mergedSessions.push(importedSession)
    } else if (conflictResolution === 'imported') {
      mergedSessions[existingIndex] = importedSession
    } else if (conflictResolution === 'newest') {
      if (importedSession.timestamp > mergedSessions[existingIndex].timestamp) {
        mergedSessions[existingIndex] = importedSession
      }
    }
  }

  mergedSessions.sort((a, b) => b.timestamp - a.timestamp)

  const prunedSessions = mergedSessions.length > DEFAULT_MAX_SESSIONS
    ? pruneSessionsByWeight(mergedSessions, DEFAULT_MAX_SESSIONS)
    : mergedSessions

  return {
    version: EMOTIONAL_MEMORY_VERSION,
    sessions: prunedSessions,
    aggregateMetrics: calculateAggregateMetrics(prunedSessions),
    lastUpdated: Date.now()
  }
}

export function validateEmotionalMemory(data: unknown): data is EmotionalMemory {
  if (typeof data !== 'object' || data === null) return false

  const mem = data as EmotionalMemory

  if (typeof mem.version !== 'number') return false
  if (!Array.isArray(mem.sessions)) return false
  if (typeof mem.aggregateMetrics !== 'object') return false
  if (typeof mem.lastUpdated !== 'number') return false

  for (const session of mem.sessions) {
    if (typeof session !== 'object' || session === null) return false
    if (typeof session.id !== 'string') return false
    if (typeof session.startDay !== 'number') return false
    if (typeof session.endDay !== 'number') return false
    if (typeof session.timestamp !== 'number') return false
    if (typeof session.actionCounts !== 'object') return false
    if (typeof session.borrowCount !== 'number') return false
    if (typeof session.bodyPartRepaymentCount !== 'number') return false
    if (typeof session.contractAccepted !== 'boolean') return false
    if (typeof session.routePreference !== 'string') return false
  }

  return true
}

export function exportEmotionalMemory(memory: EmotionalMemory): string {
  return JSON.stringify(memory, null, 2)
}

export function importEmotionalMemory(json: string): EmotionalMemory | null {
  try {
    const parsed = JSON.parse(json)
    if (!validateEmotionalMemory(parsed)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
