import { describe, expect, it } from 'vitest'
import { parsePressureCardsJson } from './pressureCards.schema.ts'
import { parseCollapseEndingsJson, parseRealmTemplatesJson } from './realmTemplates.schema.ts'

const validCard = {
  id: 'test-card',
  title: '测试牌',
  description: 'desc',
  lifeStages: ['hs'],
  tags: ['study'],
  effectsOnPlay: [
    {
      kind: 'stat',
      payload: { target: 'faLi', op: 'add', value: 1 }
    }
  ]
}

describe('pressureCards.schema', () => {
  it('accepts a minimal valid deck', () => {
    const cards = Array.from({ length: 12 }, (_, i) => ({
      ...validCard,
      id: `card-${i}`
    }))
    const result = parsePressureCardsJson(cards)
    expect(result.success).toBe(true)
  })

  it('rejects deck shorter than 12 cards', () => {
    const result = parsePressureCardsJson([validCard])
    expect(result.success).toBe(false)
  })

  it('rejects illegal stat target', () => {
    const cards = Array.from({ length: 12 }, (_, i) => ({
      ...validCard,
      id: `bad-${i}`,
      effectsOnPlay: [{ kind: 'stat', payload: { target: 'not-a-stat' } }]
    }))
    const result = parsePressureCardsJson(cards)
    expect(result.success).toBe(false)
  })

  it('rejects duplicate card ids', () => {
    const cards = Array.from({ length: 12 }, () => ({ ...validCard, id: 'dup' }))
    const result = parsePressureCardsJson(cards)
    expect(result.success).toBe(false)
  })
})

describe('realmTemplates.schema', () => {
  const validRealm = {
    id: 'qi',
    displayName: '练气',
    order: 0,
    capitalismSkin: {
      rankingLabel: '榜',
      employerLabel: '执事',
      loanProductNames: ['贷'],
      maintenanceLabels: ['租']
    },
    maintenanceCoeff: 1,
    harvestRate: 0.1,
    pressureDeckId: 'work',
    breakthroughKpi: { minFaLi: 1 },
    loanProducts: [{ id: 'lp', maxDraw: 100, dailyRate: 0.01, teaseCopy: 'copy' }],
    celebrationCopy: 'celebrate',
    billCopy: 'bill'
  }

  it('accepts valid realm bundle shape', () => {
    const result = parseRealmTemplatesJson({ realms: [validRealm] })
    expect(result.success).toBe(true)
  })

  it('rejects invalid realm id', () => {
    const result = parseRealmTemplatesJson({
      realms: [{ ...validRealm, id: 'unknown-realm' }]
    })
    expect(result.success).toBe(false)
  })
})

describe('collapseEndings.schema', () => {
  it('accepts valid ending', () => {
    const result = parseCollapseEndingsJson({
      endings: [
        {
          id: 'collapse-test',
          trigger: { minDelinquency: 80 },
          title: '崩盘',
          archiveVerdict: 'verdict'
        }
      ]
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing trigger', () => {
    const result = parseCollapseEndingsJson({
      endings: [{ id: 'x', title: 't', archiveVerdict: 'v' }]
    })
    expect(result.success).toBe(false)
  })
})
