import type {
  SocialNetwork,
  NPC,
  Relationship,
  NpcAttitude,
  NpcMemory,
  RelationshipHint,
  InteractionType,
  GameState
} from '~/types/game'

export const DEFAULT_MAX_HOPS = 2

export function createSocialNetwork(): SocialNetwork {
  const npcs = new Map<string, NPC>()
  const relationships = new Map<string, Relationship>()

  const defaultNPCs = [
    { id: 'homeroom_teacher', name: '班主任', role: 'authority' },
    { id: 'cultivation_instructor', name: '修炼导师', role: 'authority' },
    { id: 'debt_collector', name: '催收员', role: 'institutional' },
    { id: 'black_market_merchant', name: '黑市商人', role: 'neutral' },
    { id: 'classmate_rival', name: '同学(对手)', role: 'rival' },
    { id: 'classmate_ally', name: '同学(盟友)', role: 'ally' }
  ]

  for (const npcData of defaultNPCs) {
    npcs.set(npcData.id, {
      id: npcData.id,
      name: npcData.name,
      role: npcData.role,
      attitude: {
        affinity: 0,
        trust: 50,
        fear: 0,
        respect: 0,
        hiddenTags: []
      },
      memory: [],
      thresholdTriggers: []
    })
  }

  const defaultRelationships: Array<[string, string, number]> = [
    ['homeroom_teacher', 'cultivation_instructor', 30],
    ['homeroom_teacher', 'debt_collector', 50],
    ['cultivation_instructor', 'debt_collector', 20],
    ['classmate_rival', 'classmate_ally', -20],
    ['homeroom_teacher', 'classmate_ally', 10],
    ['cultivation_instructor', 'classmate_rival', 15]
  ]

  for (const [npcA, npcB, affinity] of defaultRelationships) {
    const key = createRelationshipKey(npcA, npcB)
    relationships.set(key, {
      npcA,
      npcB,
      affinity,
      sharedSecrets: [],
      sharedGrievances: [],
      lastInteraction: Date.now()
    })
  }

  return {
    npcs,
    relationships,
    lastPropagated: Date.now()
  }
}

function createRelationshipKey(npcA: string, npcB: string): string {
  return [npcA, npcB].sort().join('|')
}

export function recordInteraction(
  network: SocialNetwork,
  npcId: string,
  interactionType: InteractionType,
  intensity: number = 1
): SocialNetwork {
  const npc = network.npcs.get(npcId)
  if (!npc) return network

  const attitudeChange = calculateAttitudeChange(interactionType, intensity)

  npc.attitude.affinity += attitudeChange.affinity
  npc.attitude.trust += attitudeChange.trust
  npc.attitude.fear += attitudeChange.fear
  npc.attitude.respect += attitudeChange.respect

  npc.attitude.affinity = Math.max(-100, Math.min(100, npc.attitude.affinity))
  npc.attitude.trust = Math.max(0, Math.min(100, npc.attitude.trust))
  npc.attitude.fear = Math.max(0, Math.min(100, npc.attitude.fear))
  npc.attitude.respect = Math.max(0, Math.min(100, npc.attitude.respect))

  npc.memory.push({
    day: 0,
    eventType: interactionType,
    impact: intensity,
    description: getInteractionDescription(interactionType, intensity)
  })

  network.lastPropagated = Date.now()

  return network
}

function calculateAttitudeChange(
  interactionType: InteractionType,
  intensity: number
): { affinity: number; trust: number; fear: number; respect: number } {
  const multiplier = intensity

  switch (interactionType) {
    case 'helped':
      return {
        affinity: 10 * multiplier,
        trust: 5 * multiplier,
        fear: 0,
        respect: 5 * multiplier
      }
    case 'harmed':
      return {
        affinity: -10 * multiplier,
        trust: -5 * multiplier,
        fear: 5 * multiplier,
        respect: -5 * multiplier
      }
    case 'ignored':
      return {
        affinity: -2 * multiplier,
        trust: 0,
        fear: 0,
        respect: 0
      }
    case 'betrayed':
      return {
        affinity: -20 * multiplier,
        trust: -15 * multiplier,
        fear: 10 * multiplier,
        respect: -10 * multiplier
      }
    case 'impressed':
      return {
        affinity: 5 * multiplier,
        trust: 10 * multiplier,
        fear: 0,
        respect: 15 * multiplier
      }
    case 'disappointed':
      return {
        affinity: -5 * multiplier,
        trust: -10 * multiplier,
        fear: 0,
        respect: -5 * multiplier
      }
    default:
      return { affinity: 0, trust: 0, fear: 0, respect: 0 }
  }
}

function getInteractionDescription(interactionType: InteractionType, intensity: number): string {
  const descriptions: Record<InteractionType, string> = {
    helped: `提供了帮助 (x${intensity})`,
    harmed: `造成了伤害 (x${intensity})`,
    ignored: `无视了对方 (x${intensity})`,
    betrayed: `背叛了信任 (x${intensity})`,
    impressed: `留下了好印象 (x${intensity})`,
    disappointed: `让人失望了 (x${intensity})`
  }
  return descriptions[interactionType]
}

export function propagateInfluence(
  network: SocialNetwork,
  sourceNpcId: string,
  change: { affinity?: number; trust?: number; fear?: number; respect?: number },
  maxHops: number = DEFAULT_MAX_HOPS
): SocialNetwork {
  const sourceNpc = network.npcs.get(sourceNpcId)
  if (!sourceNpc) return network

  const visited = new Set<string>([sourceNpcId])

  function propagate(currentNpcId: string, hop: number, magnitude: number) {
    if (hop > maxHops) return

    const currentNpc = network.npcs.get(currentNpcId)
    if (!currentNpc) return

    if (hop > 0) {
      if (change.affinity !== undefined) {
        currentNpc.attitude.affinity += change.affinity * magnitude
      }
      if (change.trust !== undefined) {
        currentNpc.attitude.trust += change.trust * magnitude
      }
      if (change.fear !== undefined) {
        currentNpc.attitude.fear += change.fear * magnitude
      }
      if (change.respect !== undefined) {
        currentNpc.attitude.respect += change.respect * magnitude
      }

      currentNpc.attitude.affinity = Math.max(-100, Math.min(100, currentNpc.attitude.affinity))
      currentNpc.attitude.trust = Math.max(0, Math.min(100, currentNpc.attitude.trust))
      currentNpc.attitude.fear = Math.max(0, Math.min(100, currentNpc.attitude.fear))
      currentNpc.attitude.respect = Math.max(0, Math.min(100, currentNpc.attitude.respect))
    }

    const neighbors = getNeighbors(network, currentNpcId)
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        const relationshipKey = createRelationshipKey(currentNpcId, neighbor)
        const relationship = network.relationships.get(relationshipKey)
        const attenuation = relationship ? Math.abs(relationship.affinity) / 100 * 0.5 : 0.25
        propagate(neighbor, hop + 1, magnitude * attenuation)
      }
    }
  }

  propagate(sourceNpcId, 0, 1.0)

  network.lastPropagated = Date.now()

  return network
}

function getNeighbors(network: SocialNetwork, npcId: string): string[] {
  const neighbors: string[] = []

  for (const [key, relationship] of network.relationships) {
    if (relationship.npcA === npcId) {
      neighbors.push(relationship.npcB)
    } else if (relationship.npcB === npcId) {
      neighbors.push(relationship.npcA)
    }
  }

  return neighbors
}

export function getNpcAttitude(
  network: SocialNetwork,
  npcId: string
): NpcAttitude | null {
  const npc = network.npcs.get(npcId)
  return npc ? { ...npc.attitude } : null
}

export function getNpcOverallAttitude(
  network: SocialNetwork,
  npcId: string
): number {
  const npc = network.npcs.get(npcId)
  if (!npc) return 0

  const { affinity, trust, fear, respect } = npc.attitude

  const overall = (affinity * 0.3 + trust * 0.2 - fear * 0.3 + respect * 0.2)

  return Math.max(-100, Math.min(100, overall))
}

export interface ThresholdEvent {
  npcId: string
  eventType: string
  triggerCondition: string
  eventTemplateId: string
}

export function checkThresholdEvents(
  network: SocialNetwork,
  _state: GameState
): ThresholdEvent[] {
  const events: ThresholdEvent[] = []

  for (const [npcId, npc] of network.npcs) {
    if (npc.attitude.affinity <= -50 && !hasTriggered(npc, 'low_affinity')) {
      events.push({
        npcId,
        eventType: 'low_affinity',
        triggerCondition: 'affinity <= -50',
        eventTemplateId: 'npc_hostile_event'
      })
      npc.thresholdTriggers.push({
        condition: 'low_affinity',
        eventTemplateId: 'npc_hostile_event',
        triggered: true
      })
    }

    if (npc.attitude.trust >= 80 && !hasTriggered(npc, 'high_trust')) {
      events.push({
        npcId,
        eventType: 'high_trust',
        triggerCondition: 'trust >= 80',
        eventTemplateId: 'npc_trust_event'
      })
      npc.thresholdTriggers.push({
        condition: 'high_trust',
        eventTemplateId: 'npc_trust_event',
        triggered: true
      })
    }

    if (npc.attitude.fear >= 60 && !hasTriggered(npc, 'high_fear')) {
      events.push({
        npcId,
        eventType: 'high_fear',
        triggerCondition: 'fear >= 60',
        eventTemplateId: 'npc_fear_event'
      })
      npc.thresholdTriggers.push({
        condition: 'high_fear',
        eventTemplateId: 'npc_fear_event',
        triggered: true
      })
    }
  }

  return events
}

function hasTriggered(npc: NPC, condition: string): boolean {
  return npc.thresholdTriggers.some(t => t.condition === condition && t.triggered)
}

export function getRelationshipHints(
  network: SocialNetwork,
  playerInsight: number = 0
): RelationshipHint[] {
  const hints: RelationshipHint[] = []
  const insightFactor = Math.max(0, Math.min(1, playerInsight / 100))

  for (const [key, relationship] of network.relationships) {
    if (relationship.affinity >= 40) {
      const [npcA, npcB] = key.split('|')
      if (Math.random() < insightFactor + 0.3) {
        hints.push({
          npcA,
          npcB,
          hintType: 'alliance',
          description: `${network.npcs.get(npcA)?.name} 和 ${network.npcs.get(npcB)?.name} 似乎关系不错`,
          confidence: Math.min(0.9, insightFactor + 0.2)
        })
      }
    } else if (relationship.affinity <= -20) {
      const [npcA, npcB] = key.split('|')
      if (Math.random() < insightFactor + 0.3) {
        hints.push({
          npcA,
          npcB,
          hintType: 'tension',
          description: `${network.npcs.get(npcA)?.name} 和 ${network.npcs.get(npcB)?.name} 之间有些紧张`,
          confidence: Math.min(0.9, insightFactor + 0.2)
        })
      }
    }

    if (relationship.sharedSecrets.length > 0 && insightFactor > 0.5) {
      const [npcA, npcB] = key.split('|')
      hints.push({
        npcA,
        npcB,
        hintType: 'secret',
        description: `${network.npcs.get(npcA)?.name} 和 ${network.npcs.get(npcB)?.name} 之间似乎有共同的秘密`,
        confidence: Math.min(0.8, insightFactor)
      })
    }
  }

  return hints.sort((a, b) => b.confidence - a.confidence)
}

export function getAllNpcSummaries(
  network: SocialNetwork
): Array<{ id: string; name: string; role: string; overallAttitude: number }> {
  const summaries: Array<{ id: string; name: string; role: string; overallAttitude: number }> = []

  for (const [id, npc] of network.npcs) {
    summaries.push({
      id,
      name: npc.name,
      role: npc.role,
      overallAttitude: getNpcOverallAttitude(network, id)
    })
  }

  return summaries.sort((a, b) => b.overallAttitude - a.overallAttitude)
}

export function serializeNetwork(network: SocialNetwork): string {
  const serializable = {
    npcs: Array.from(network.npcs.entries()),
    relationships: Array.from(network.relationships.entries()),
    lastPropagated: network.lastPropagated
  }
  return JSON.stringify(serializable)
}

export function deserializeNetwork(json: string): SocialNetwork | null {
  try {
    const parsed = JSON.parse(json)
    return {
      npcs: new Map(parsed.npcs),
      relationships: new Map(parsed.relationships),
      lastPropagated: parsed.lastPropagated
    }
  } catch {
    return null
  }
}
