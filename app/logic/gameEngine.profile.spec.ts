import { describe, expect, it } from 'vitest'
import type { GameState } from '~/types/game'
import {
  deriveFinancialRiskLevel,
  deriveEducationCreditLevel,
  deriveComplianceLevel,
  deriveBodyAssetLevel,
  deriveProfileTags,
  buildSocialProfile,
  buildProfileDigest,
  eventMatchesTrigger
} from '~/logic/gameEngine'
import type { EventDefinition } from '~/types/game'

function baseGame(overrides: Partial<GameState> = {}): GameState {
  return {
    started: true,
    seed: 42_424_242,
    stats: {
      daoXin: 1,
      faLi: 6,
      rouTi: 0.6,
      fatigue: 30,
      focus: 50
    },
    econ: {
      cash: 2000,
      collectionFee: 0,
      debtPrincipal: 0,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
      delinquency: 0,
      lastPaymentDay: 1
    },
    school: {
      day: 5,
      week: 1,
      slot: 'morning',
      classTier: '普通班',
      lastExamScore: 500,
      lastRank: 100,
      perks: { mealSubsidy: 40, focusBonus: 0 }
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
    eventHistory: {},
    familyHistory: {},
    bodyPartRepayment: {},
    bodyIntegrity: 1.0,
    bodyReputation: 'clean',
    buyDebasement: 0,
    daySlotActions: {},
    scoreDayStreak: 0,
    cashDayStreak: 0,
    domestication: 0,
    numbness: 0,
    ...overrides
  } as GameState
}

const evt = (partial: Partial<EventDefinition> & Pick<EventDefinition, 'id'>): EventDefinition => ({
  title: 't',
  body: 'b',
  type: 'test',
  options: [],
  ...partial
})

describe('方案 A：财务风险等级推导', () => {
  it('无债务时返回 low', () => {
    const g = baseGame({ econ: { ...baseGame().econ, debtPrincipal: 0, debtInterestAccrued: 0, delinquency: 0 } })
    expect(deriveFinancialRiskLevel(g)).toBe('low')
  })

  it('逾期等级 1 时返回 medium', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 1 } })
    expect(deriveFinancialRiskLevel(g)).toBe('medium')
  })

  it('逾期等级 2 时返回 high', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 2 } })
    expect(deriveFinancialRiskLevel(g)).toBe('high')
  })

  it('逾期等级 4 时返回 extreme', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 4 } })
    expect(deriveFinancialRiskLevel(g)).toBe('extreme')
  })

  it('高额债务 (>80000) 即使低逾期也返回 high', () => {
    const g = baseGame({
      econ: { ...baseGame().econ, debtPrincipal: 90000, delinquency: 1 }
    })
    expect(deriveFinancialRiskLevel(g)).toBe('high')
  })
})

describe('方案 A：教育信用等级推导', () => {
  it('普通班低分返回 unstable', () => {
    const g = baseGame({ school: { ...baseGame().school, classTier: '普通班', lastExamScore: 500 } })
    expect(deriveEducationCreditLevel(g)).toBe('unstable')
  })

  it('示范班高分返回 preferred', () => {
    const g = baseGame({ school: { ...baseGame().school, classTier: '示范班', lastExamScore: 680 } })
    expect(deriveEducationCreditLevel(g)).toBe('preferred')
  })

  it('连续刷分返回 unstable（偏科执行体为标签）', () => {
    const g = baseGame({ scoreDayStreak: 3 })
    expect(deriveEducationCreditLevel(g)).toBe('unstable')
  })

  it('连续刷分会添加偏科执行体标签', () => {
    const g = baseGame({ scoreDayStreak: 3 })
    const tags = deriveProfileTags(g)
    expect(tags).toContain('偏科执行体')
  })

  it('连续打工返回 discarded', () => {
    const g = baseGame({ cashDayStreak: 3 })
    expect(deriveEducationCreditLevel(g)).toBe('discarded')
  })

  it('末位班基础分返回 discarded', () => {
    const g = baseGame({ school: { ...baseGame().school, classTier: '末位班', lastExamScore: 450 } })
    expect(deriveEducationCreditLevel(g)).toBe('discarded')
  })
})

describe('方案 A：制度顺从等级推导', () => {
  it('无驯化值返回 resistant', () => {
    const g = baseGame({ domestication: 0, numbness: 0 })
    expect(deriveComplianceLevel(g)).toBe('resistant')
  })

  it('驯化值 25 返回 softened', () => {
    const g = baseGame({ domestication: 25 })
    expect(deriveComplianceLevel(g)).toBe('softened')
  })

  it('驯化值 50 返回 obedient', () => {
    const g = baseGame({ domestication: 50 })
    expect(deriveComplianceLevel(g)).toBe('obedient')
  })

  it('驯化值 75 返回 domesticated', () => {
    const g = baseGame({ domestication: 75 })
    expect(deriveComplianceLevel(g)).toBe('domesticated')
  })

  it('高麻木值返回 domesticated', () => {
    const g = baseGame({ numbness: 80 })
    expect(deriveComplianceLevel(g)).toBe('domesticated')
  })

  it('契约进度高时返回 obedient', () => {
    const g = baseGame({ contract: { ...baseGame().contract, active: true, progress: 65 } })
    expect(deriveComplianceLevel(g)).toBe('obedient')
  })
})

describe('方案 A：身体资产等级推导', () => {
  it('完整身体返回 intact', () => {
    const g = baseGame({ bodyIntegrity: 1.0, bodyPartRepayment: {} })
    expect(deriveBodyAssetLevel(g)).toBe('intact')
  })

  it('偿还一个部位返回 marked', () => {
    const g = baseGame({ bodyPartRepayment: { LeftPalm: true } })
    expect(deriveBodyAssetLevel(g)).toBe('marked')
  })

  it('偿还两个部位返回 mortgaged', () => {
    const g = baseGame({ bodyPartRepayment: { LeftPalm: true, RightPalm: true } })
    expect(deriveBodyAssetLevel(g)).toBe('mortgaged')
  })

  it('身体完整度低于 0.2 返回 depleted', () => {
    const g = baseGame({ bodyIntegrity: 0.15 })
    expect(deriveBodyAssetLevel(g)).toBe('depleted')
  })

  it('已标记声誉返回 mortgaged', () => {
    const g = baseGame({ bodyReputation: 'marked', bodyPartRepayment: {} })
    expect(deriveBodyAssetLevel(g)).toBe('mortgaged')
  })
})

describe('方案 A：画像标签生成', () => {
  it('无显著特征时返回空标签', () => {
    const g = baseGame({
      econ: { ...baseGame().econ, debtPrincipal: 0, delinquency: 0 },
      domestication: 0,
      numbness: 0,
      scoreDayStreak: 0,
      cashDayStreak: 0,
      bodyPartRepayment: {},
      bodyIntegrity: 1.0
    })
    const tags = deriveProfileTags(g)
    expect(tags.filter(t => !['高风险修士', '低偿付能力', '可重组对象', '催收优先级上升'].includes(t))).toHaveLength(0)
  })

  it('高风险时包含高风险修士标签', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 4 } })
    expect(deriveProfileTags(g)).toContain('高风险修士')
  })

  it('高债务时包含催收优先级上升标签', () => {
    const g = baseGame({ econ: { ...baseGame().econ, debtPrincipal: 90000, delinquency: 2 } })
    expect(deriveProfileTags(g)).toContain('催收优先级上升')
  })

  it('高驯化时包含已进入稳定驯化区标签', () => {
    const g = baseGame({ domestication: 55 })
    expect(deriveProfileTags(g)).toContain('已进入稳定驯化区')
  })

  it('已偿还身体部位包含已标记资产标签', () => {
    const g = baseGame({ bodyPartRepayment: { LeftPalm: true } })
    expect(deriveProfileTags(g)).toContain('已标记资产')
  })
})

describe('方案 A：完整画像构建', () => {
  it('基础状态返回完整四维画像', () => {
    const g = baseGame()
    const profile = buildSocialProfile(g)
    expect(profile).toHaveProperty('financialRisk')
    expect(profile).toHaveProperty('educationCredit')
    expect(profile).toHaveProperty('compliance')
    expect(profile).toHaveProperty('bodyAsset')
    expect(profile).toHaveProperty('tags')
    expect(Array.isArray(profile.tags)).toBe(true)
  })

  it('标签不重复', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 3 }, domestication: 40, bodyPartRepayment: { LeftPalm: true } })
    const profile = buildSocialProfile(g)
    const uniqueTags = [...new Set(profile.tags)]
    expect(profile.tags).toHaveLength(uniqueTags.length)
  })
})

describe('方案 A：画像摘要构建', () => {
  it('返回当前主维度标签', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 4 } })
    const digest = buildProfileDigest(g)
    expect(digest.primaryLabel).toContain('财务风险')
    expect(digest.primaryLabel).toContain('极高风险')
  })

  it('检测到画像变化时返回变更记录', () => {
    const g1 = baseGame({ econ: { ...baseGame().econ, delinquency: 0 } })
    const g2 = baseGame({ econ: { ...baseGame().econ, delinquency: 2 } })
    const digest = buildProfileDigest(g2, buildSocialProfile(g1))
    expect(digest.recentChanges.length).toBeGreaterThan(0)
    expect(digest.recentChanges[0]).toContain('财务风险')
  })

  it('无变化时返回空变更记录', () => {
    const g = baseGame()
    const profile = buildSocialProfile(g)
    const digest = buildProfileDigest(g, profile)
    expect(digest.recentChanges).toHaveLength(0)
  })
})

describe('方案 A：事件匹配画像条件', () => {
  it('financialRiskIn 条件匹配', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 2 } })
    const e = evt({ id: 'test', trigger: { financialRiskIn: ['high', 'extreme'] } })
    expect(eventMatchesTrigger(e, g)).toBe(true)
  })

  it('financialRiskIn 条件不匹配', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 0 } })
    const e = evt({ id: 'test', trigger: { financialRiskIn: ['high', 'extreme'] } })
    expect(eventMatchesTrigger(e, g)).toBe(false)
  })

  it('complianceIn 条件匹配', () => {
    const g = baseGame({ domestication: 55 })
    const e = evt({ id: 'test', trigger: { complianceIn: ['obedient', 'domesticated'] } })
    expect(eventMatchesTrigger(e, g)).toBe(true)
  })

  it('bodyAssetIn 条件匹配', () => {
    const g = baseGame({ bodyPartRepayment: { LeftPalm: true } })
    const e = evt({ id: 'test', trigger: { bodyAssetIn: ['marked', 'mortgaged', 'depleted'] } })
    expect(eventMatchesTrigger(e, g)).toBe(true)
  })

  it('profileTagIn 条件匹配', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 4 } })
    const e = evt({ id: 'test', trigger: { profileTagIn: ['高风险修士'] } })
    expect(eventMatchesTrigger(e, g)).toBe(true)
  })

  it('profileTagIn 条件不匹配', () => {
    const g = baseGame({ econ: { ...baseGame().econ, delinquency: 0 } })
    const e = evt({ id: 'test', trigger: { profileTagIn: ['高风险修士'] } })
    expect(eventMatchesTrigger(e, g)).toBe(false)
  })

  it('多条件同时满足', () => {
    const g = baseGame({
      econ: { ...baseGame().econ, delinquency: 3 },
      domestication: 50
    })
    const e = evt({
      id: 'test',
      trigger: {
        financialRiskIn: ['high', 'extreme'],
        complianceIn: ['obedient', 'domesticated']
      }
    })
    expect(eventMatchesTrigger(e, g)).toBe(true)
  })

  it('多条件部分不满足', () => {
    const g = baseGame({
      econ: { ...baseGame().econ, delinquency: 0 },
      domestication: 50
    })
    const e = evt({
      id: 'test',
      trigger: {
        financialRiskIn: ['high', 'extreme'],
        complianceIn: ['obedient', 'domesticated']
      }
    })
    expect(eventMatchesTrigger(e, g)).toBe(false)
  })
})
