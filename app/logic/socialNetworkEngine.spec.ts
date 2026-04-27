import { describe, it, expect, beforeEach } from 'vitest'
import type {
  SocialNetwork,
  InteractionType,
  NpcAttitude
} from '~/types/game'
import {
  createSocialNetwork,
  recordInteraction,
  propagateInfluence,
  getNpcAttitude,
  getNpcOverallAttitude,
  checkThresholdEvents,
  getRelationshipHints,
  getAllNpcSummaries,
  serializeNetwork,
  deserializeNetwork
} from '~/logic/socialNetworkEngine'

describe('socialNetworkEngine', () => {
  let network: SocialNetwork

  beforeEach(() => {
    network = createSocialNetwork()
  })

  describe('createSocialNetwork', () => {
    it('should create network with default NPCs', () => {
      expect(network.npcs.size).toBe(6)
    })

    it('should have all default NPCs', () => {
      const expectedIds = [
        'homeroom_teacher',
        'cultivation_instructor',
        'debt_collector',
        'black_market_merchant',
        'classmate_rival',
        'classmate_ally'
      ]

      for (const id of expectedIds) {
        expect(network.npcs.has(id)).toBe(true)
      }
    })

    it('should have default relationships', () => {
      expect(network.relationships.size).toBeGreaterThan(0)
    })

    it('should initialize NPC attitudes', () => {
      for (const [_, npc] of network.npcs) {
        expect(npc.attitude).toBeDefined()
        expect(npc.attitude.affinity).toBe(0)
        expect(npc.attitude.trust).toBe(50)
        expect(npc.attitude.fear).toBe(0)
        expect(npc.attitude.respect).toBe(0)
      }
    })

    it('should initialize memory and threshold triggers as empty', () => {
      for (const [_, npc] of network.npcs) {
        expect(npc.memory).toEqual([])
        expect(npc.thresholdTriggers).toEqual([])
      }
    })
  })

  describe('recordInteraction', () => {
    it('should update affinity for helped interaction', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'helped', 1)

      const npc = result.npcs.get('homeroom_teacher')
      expect(npc!.attitude.affinity).toBe(10)
    })

    it('should update trust for helped interaction', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'helped', 1)

      const npc = result.npcs.get('homeroom_teacher')
      expect(npc!.attitude.trust).toBe(55)
    })

    it('should decrease affinity for harmed interaction', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'harmed', 1)

      const npc = result.npcs.get('homeroom_teacher')
      expect(npc!.attitude.affinity).toBe(-10)
    })

    it('should increase fear for harmed interaction', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'harmed', 1)

      const npc = result.npcs.get('homeroom_teacher')
      expect(npc!.attitude.fear).toBe(5)
    })

    it('should respect intensity multiplier', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'helped', 2)

      const npc = result.npcs.get('homeroom_teacher')
      expect(npc!.attitude.affinity).toBe(20)
    })

    it('should clamp values to valid ranges', () => {
      let result = network

      for (let i = 0; i < 20; i++) {
        result = recordInteraction(result, 'homeroom_teacher', 'helped', 1)
      }

      const npc = result.npcs.get('homeroom_teacher')
      expect(npc!.attitude.affinity).toBeLessThanOrEqual(100)
    })

    it('should add memory entry', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'helped', 1)

      const npc = result.npcs.get('homeroom_teacher')
      expect(npc!.memory.length).toBe(1)
      expect(npc!.memory[0].eventType).toBe('helped')
    })

    it('should return original network for non-existent NPC', () => {
      const result = recordInteraction(network, 'non_existent_npc', 'helped', 1)

      expect(result).toBe(network)
    })

    it('should handle all interaction types', () => {
      const interactionTypes: InteractionType[] = [
        'helped', 'harmed', 'ignored', 'betrayed', 'impressed', 'disappointed'
      ]

      let result = network
      for (const type of interactionTypes) {
        result = recordInteraction(result, 'homeroom_teacher', type, 1)
      }

      const npc = result.npcs.get('homeroom_teacher')
      expect(npc!.memory.length).toBe(6)
    })
  })

  describe('propagateInfluence', () => {
    it('should affect directly connected NPCs', () => {
      const result = propagateInfluence(network, 'homeroom_teacher', { affinity: 10 })

      const relatedNpc = result.npcs.get('cultivation_instructor')
      expect(relatedNpc!.attitude.affinity).not.toBe(0)
    })

    it('should attenuate influence over hops', () => {
      const teacherAffinityBefore = network.npcs.get('homeroom_teacher')!.attitude.affinity
      const cultivationAffinityBefore = network.npcs.get('cultivation_instructor')!.attitude.affinity

      propagateInfluence(network, 'homeroom_teacher', { affinity: 10 }, 2)

      const cultivationAffinity = network.npcs.get('cultivation_instructor')!.attitude.affinity

      expect(cultivationAffinity).toBeGreaterThan(cultivationAffinityBefore)
    })

    it('should respect maxHops limit', () => {
      propagateInfluence(network, 'homeroom_teacher', { affinity: 100 }, 1)

      const classmateAlly = network.npcs.get('classmate_ally')
      const classmateRival = network.npcs.get('classmate_rival')

      expect(classmateRival!.attitude.affinity).toBe(0)
    })

    it('should not affect source NPC', () => {
      const affinityBefore = network.npcs.get('homeroom_teacher')!.attitude.affinity
      propagateInfluence(network, 'homeroom_teacher', { affinity: 10 })
      const affinityAfter = network.npcs.get('homeroom_teacher')!.attitude.affinity

      expect(affinityAfter).toBe(affinityBefore)
    })

    it('should handle multiple propagation calls', () => {
      let result = network

      result = propagateInfluence(result, 'homeroom_teacher', { affinity: 10 })
      result = propagateInfluence(result, 'homeroom_teacher', { affinity: 10 })

      const cultivationInstructor = result.npcs.get('cultivation_instructor')
      expect(cultivationInstructor!.attitude.affinity).toBeGreaterThan(0)
    })
  })

  describe('getNpcAttitude', () => {
    it('should return attitude for existing NPC', () => {
      const attitude = getNpcAttitude(network, 'homeroom_teacher')

      expect(attitude).not.toBeNull()
      expect(attitude!.affinity).toBe(0)
      expect(attitude!.trust).toBe(50)
    })

    it('should return null for non-existent NPC', () => {
      const attitude = getNpcAttitude(network, 'non_existent')

      expect(attitude).toBeNull()
    })

    it('should return a copy, not the original', () => {
      const attitude = getNpcAttitude(network, 'homeroom_teacher')

      attitude!.affinity = 999

      const original = network.npcs.get('homeroom_teacher')!
      expect(original.attitude.affinity).toBe(0)
    })
  })

  describe('getNpcOverallAttitude', () => {
    it('should return positive for neutral NPC due to initial trust', () => {
      const overall = getNpcOverallAttitude(network, 'homeroom_teacher')

      expect(overall).toBe(10)
    })

    it('should return positive for friendly NPC', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'helped', 5)

      const overall = getNpcOverallAttitude(result, 'homeroom_teacher')

      expect(overall).toBeGreaterThan(0)
    })

    it('should return negative for hostile NPC', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'harmed', 5)

      const overall = getNpcOverallAttitude(result, 'homeroom_teacher')

      expect(overall).toBeLessThan(0)
    })

    it('should factor in fear negatively', () => {
      let result = network
      result = recordInteraction(result, 'homeroom_teacher', 'helped', 5)
      result = recordInteraction(result, 'homeroom_teacher', 'harmed', 1)

      const overallWithFear = getNpcOverallAttitude(result, 'homeroom_teacher')
      const npc = result.npcs.get('homeroom_teacher')!

      const expectedWithFear = (
        npc.attitude.affinity * 0.3 +
        npc.attitude.trust * 0.2 -
        npc.attitude.fear * 0.3 +
        npc.attitude.respect * 0.2
      )

      expect(overallWithFear).toBeCloseTo(Math.max(-100, Math.min(100, expectedWithFear)), 1)
    })

    it('should return 0 for non-existent NPC', () => {
      const overall = getNpcOverallAttitude(network, 'non_existent')

      expect(overall).toBe(0)
    })
  })

  describe('checkThresholdEvents', () => {
    it('should not trigger events for neutral attitudes', () => {
      const events = checkThresholdEvents(network, {} as any)

      expect(events.length).toBe(0)
    })

    it('should trigger low affinity event', () => {
      let result = network

      for (let i = 0; i < 6; i++) {
        result = recordInteraction(result, 'homeroom_teacher', 'harmed', 1)
      }

      const events = checkThresholdEvents(result, {} as any)
      const teacherEvents = events.filter(e => e.npcId === 'homeroom_teacher')

      expect(teacherEvents.some(e => e.eventType === 'low_affinity')).toBe(true)
    })

    it('should trigger high trust event', () => {
      let result = network

      for (let i = 0; i < 6; i++) {
        result = recordInteraction(result, 'homeroom_teacher', 'impressed', 1)
      }

      const events = checkThresholdEvents(result, {} as any)
      const teacherEvents = events.filter(e => e.npcId === 'homeroom_teacher')

      expect(teacherEvents.some(e => e.eventType === 'high_trust')).toBe(true)
    })

    it('should only trigger threshold once', () => {
      let result = network

      for (let i = 0; i < 6; i++) {
        result = recordInteraction(result, 'homeroom_teacher', 'harmed', 1)
      }

      checkThresholdEvents(result, {} as any)
      const events2 = checkThresholdEvents(result, {} as any)

      expect(events2.filter(e => e.npcId === 'homeroom_teacher').length).toBe(0)
    })
  })

  describe('getRelationshipHints', () => {
    it('should return hints for strong relationships', () => {
      const hints = getRelationshipHints(network, 50)

      expect(Array.isArray(hints)).toBe(true)
    })

    it('should include alliance hints for positive relationships', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'helped', 10)
      const result2 = recordInteraction(result, 'cultivation_instructor', 'helped', 10)

      const hints = getRelationshipHints(result2, 80)

      expect(hints.some(h => h.hintType === 'alliance')).toBe(true)
    })

    it('should include tension hints for negative relationships', () => {
      let result = network
      result = recordInteraction(result, 'classmate_rival', 'harmed', 5)
      result = recordInteraction(result, 'classmate_ally', 'harmed', 5)

      const hints = getRelationshipHints(result, 80)

      expect(hints.some(h => h.hintType === 'tension')).toBe(true)
    })

    it('should adjust confidence based on insight', () => {
      const hintsLowInsight = getRelationshipHints(network, 0)
      const hintsHighInsight = getRelationshipHints(network, 100)

      expect(hintsHighInsight.length).toBeGreaterThanOrEqual(hintsLowInsight.length)
    })
  })

  describe('getAllNpcSummaries', () => {
    it('should return summaries for all NPCs', () => {
      const summaries = getAllNpcSummaries(network)

      expect(summaries.length).toBe(network.npcs.size)
    })

    it('should include NPC details', () => {
      const summaries = getAllNpcSummaries(network)

      for (const summary of summaries) {
        expect(summary.id).toBeDefined()
        expect(summary.name).toBeDefined()
        expect(summary.role).toBeDefined()
        expect(typeof summary.overallAttitude).toBe('number')
      }
    })

    it('should sort by overall attitude descending', () => {
      const summaries = getAllNpcSummaries(network)

      for (let i = 1; i < summaries.length; i++) {
        expect(summaries[i - 1].overallAttitude).toBeGreaterThanOrEqual(summaries[i].overallAttitude)
      }
    })
  })

  describe('serializeNetwork and deserializeNetwork', () => {
    it('should serialize and deserialize network', () => {
      const modified = recordInteraction(network, 'homeroom_teacher', 'helped', 2)

      const json = serializeNetwork(modified)
      const deserialized = deserializeNetwork(json)

      expect(deserialized).not.toBeNull()
      expect(deserialized!.npcs.size).toBe(modified.npcs.size)
      expect(deserialized!.relationships.size).toBe(modified.relationships.size)
    })

    it('should preserve NPC attitudes', () => {
      const modified = recordInteraction(network, 'homeroom_teacher', 'helped', 2)

      const json = serializeNetwork(modified)
      const deserialized = deserializeNetwork(json)

      const originalAttitude = modified.npcs.get('homeroom_teacher')!.attitude
      const deserializedAttitude = deserialized!.npcs.get('homeroom_teacher')!.attitude

      expect(deserializedAttitude.affinity).toBe(originalAttitude.affinity)
      expect(deserializedAttitude.trust).toBe(originalAttitude.trust)
    })

    it('should return null for invalid JSON', () => {
      const result = deserializeNetwork('invalid json')

      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = deserializeNetwork('')

      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle empty network', () => {
      const emptyNetwork: SocialNetwork = {
        npcs: new Map(),
        relationships: new Map(),
        lastPropagated: Date.now()
      }

      const attitude = getNpcAttitude(emptyNetwork, 'any')
      expect(attitude).toBeNull()

      const hints = getRelationshipHints(emptyNetwork, 50)
      expect(hints).toEqual([])
    })

    it('should handle network with single NPC', () => {
      const singleNetwork: SocialNetwork = {
        npcs: new Map([['only', {
          id: 'only',
          name: 'Only NPC',
          role: 'test',
          attitude: { affinity: 50, trust: 60, fear: 10, respect: 30, hiddenTags: [] },
          memory: [],
          thresholdTriggers: []
        }]]),
        relationships: new Map(),
        lastPropagated: Date.now()
      }

      const overall = getNpcOverallAttitude(singleNetwork, 'only')
      expect(overall).toBeGreaterThan(0)
    })

    it('should handle maxHops of 0', () => {
      const result = propagateInfluence(network, 'homeroom_teacher', { affinity: 10 }, 0)

      const cultivationInstructor = result.npcs.get('cultivation_instructor')
      expect(cultivationInstructor!.attitude.affinity).toBe(0)
    })

    it('should handle negative intensity', () => {
      const result = recordInteraction(network, 'homeroom_teacher', 'helped', -1)

      const npc = result.npcs.get('homeroom_teacher')
      expect(npc!.attitude.affinity).toBe(-10)
    })
  })
})
