import type {
  HiddenVariables,
  HiddenModifiers,
  PersonalityProfile,
  EmotionalMemory,
  GameState
} from '~/types/game'

export const DEFAULT_HIDDEN_VARIABLES: HiddenVariables = {
  emotionalResidues: {
    borrowTrauma: 0,
    complianceFatigue: 0,
    bodyConcern: 0
  },
  environmentalFactors: {
    marketConditions: 0,
    institutionalScrutiny: 0
  },
  npcAttitudes: {},
  narrativeMomentum: {
    crisisTendency: 0,
    stabilityTendency: 0
  }
}

export function createDefaultHiddenVariables(): HiddenVariables {
  return JSON.parse(JSON.stringify(DEFAULT_HIDDEN_VARIABLES))
}

export function updateHiddenVariables(
  current: HiddenVariables,
  updates: Partial<HiddenVariables>
): HiddenVariables {
  return {
    emotionalResidues: {
      ...current.emotionalResidues,
      ...(updates.emotionalResidues || {})
    },
    environmentalFactors: {
      ...current.environmentalFactors,
      ...(updates.environmentalFactors || {})
    },
    npcAttitudes: {
      ...current.npcAttitudes,
      ...(updates.npcAttitudes || {})
    },
    narrativeMomentum: {
      ...current.narrativeMomentum,
      ...(updates.narrativeMomentum || {})
    }
  }
}

export function getEmotionalResidue(
  variables: HiddenVariables,
  key: string
): number {
  return variables.emotionalResidues[key] || 0
}

export function setEmotionalResidue(
  variables: HiddenVariables,
  key: string,
  value: number
): HiddenVariables {
  return {
    ...variables,
    emotionalResidues: {
      ...variables.emotionalResidues,
      [key]: Math.max(0, value)
    }
  }
}

export function applyActionModifier(
  baseValue: number,
  actionKey: string,
  modifiers: HiddenModifiers
): number {
  const modifier = modifiers.actionOutcomes[actionKey] || 1.0
  return baseValue * modifier
}

export function applyEventProbabilityModifier(
  baseProbability: number,
  eventKey: string,
  modifiers: HiddenModifiers
): number {
  const modifier = modifiers.eventProbabilities[eventKey] || 1.0
  return baseProbability * modifier
}

export function buildModifiersFromProfile(profile: PersonalityProfile): HiddenModifiers {
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

export function deriveHiddenVariablesFromMemory(
  memory: EmotionalMemory
): HiddenVariables {
  const metrics = memory.aggregateMetrics
  const recentSessions = memory.sessions.slice(-5)

  const borrowTrauma = metrics.avgBorrowRate > 0.3 ? metrics.avgBorrowRate * 50 : 0
  const complianceFatigue = metrics.avgContractAcceptRate * 30
  const bodyConcern = metrics.avgBodyRepaymentRate * 40

  const institutionalScrutiny = metrics.avgContractAcceptRate > 0.5 ? 20 : 0

  const crisisTendency = metrics.avgBorrowRate > 0.3 ? 1 : 0
  const stabilityTendency = metrics.avgScoreRouteRate > 0.5 ? 1 : 0

  return {
    emotionalResidues: {
      borrowTrauma,
      complianceFatigue,
      bodyConcern
    },
    environmentalFactors: {
      marketConditions: 0,
      institutionalScrutiny
    },
    npcAttitudes: {},
    narrativeMomentum: {
      crisisTendency,
      stabilityTendency
    }
  }
}

export function getNarrativeBiasTags(variables: HiddenVariables): string[] {
  const tags: string[] = []

  if (variables.narrativeMomentum.crisisTendency > 0.5) {
    tags.push('crisis', 'danger', 'highStakes')
  }

  if (variables.narrativeMomentum.stabilityTendency > 0.5) {
    tags.push('caution', 'stability', 'gradual')
  }

  if (variables.emotionalResidues.borrowTrauma > 20) {
    tags.push('debtAnxiety')
  }

  if (variables.emotionalResidues.complianceFatigue > 20) {
    tags.push('systemResentment')
  }

  return tags
}

export function calculateStressLevel(
  variables: HiddenVariables,
  state: GameState
): number {
  let stress = 0

  stress += Math.min(30, state.stats.fatigue * 0.3)

  const debtToIncomeRatio = state.econ.debtPrincipal / Math.max(1, state.econ.cash + 1)
  stress += Math.min(25, debtToIncomeRatio * 5)

  stress += variables.emotionalResidues.borrowTrauma * 0.2

  stress += variables.emotionalResidues.complianceFatigue * 0.3

  if (state.econ.delinquency > 0) {
    stress += state.econ.delinquency * 5
  }

  if (state.contract.active) {
    stress += state.contract.progress * 0.1
  }

  return Math.max(0, Math.min(100, stress))
}

export function serializeHiddenVariables(variables: HiddenVariables): string {
  return JSON.stringify(variables)
}

export function deserializeHiddenVariables(json: string): HiddenVariables | null {
  try {
    const parsed = JSON.parse(json)
    return parsed as HiddenVariables
  } catch {
    return null
  }
}

export function validateHiddenVariables(data: unknown): data is HiddenVariables {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const hv = data as Record<string, unknown>

  if (typeof hv.emotionalResidues !== 'object' || hv.emotionalResidues === null) {
    return false
  }

  if (typeof hv.environmentalFactors !== 'object' || hv.environmentalFactors === null) {
    return false
  }

  if (typeof hv.npcAttitudes !== 'object' || hv.npcAttitudes === null) {
    return false
  }

  if (typeof hv.narrativeMomentum !== 'object' || hv.narrativeMomentum === null) {
    return false
  }

  return true
}
