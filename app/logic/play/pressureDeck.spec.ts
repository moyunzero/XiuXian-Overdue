import { describe, it, expect } from 'vitest'
import type { PlayRunState } from '~/types/play'
import type { StartConfig } from '~/types/game'
import { createHsFieldsFromStart } from './createHsPlayState'
import {
  PRESSURE_CARDS,
  cardsForLifeStage,
  dealPressureCards,
  startPressureRound,
  togglePressureCard,
  canEndRound,
  applySkippedFerment,
  resolvePressureRound,
  beginNextRoundAfterResolve,
  getPressureCardById,
  isAgencyPressureCard
} from './pressureDeck'
import { buildDebtDashboardVM } from './debtDashboard'
import { cardWeightForLifeStageRun, cardWeightForTier } from './deckWeights'
import { mulberry32 } from '~/utils/rng'

const start: StartConfig = {
  playerName: '测试',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 12000,
  startingCity: '嵩阳市'
}

function hsRun(): PlayRunState {
  const hs = createHsFieldsFromStart(start)
  return {
    schemaVersion: 4,
    runId: 'test-run',
    runMode: 'endless',
    createdAt: '',
    updatedAt: '',
    lifeStage: 'hs',
    chapterIndex: 0,
    realmTier: 'mortal',
    realmIndex: 0,
    start,
    slotId: 'slot1',
    runStatus: 'active',
    logs: hs.logs,
    profileTags: hs.profileTags,
    inbox: [],
    ...hs
  }
}

describe('pressureDeck', () => {
  it('牌池至少 12 张 hs 牌', () => {
    const hs = cardsForLifeStage('hs')
    expect(hs.length).toBeGreaterThanOrEqual(12)
    expect(PRESSURE_CARDS.every((c) => c.id && c.title)).toBe(true)
  })

  it('牌池至少 8 张 work 牌', () => {
    expect(cardsForLifeStage('work').length).toBeGreaterThanOrEqual(8)
  })

  it('dealPressureCards 发 4 张不重复', () => {
    const run = hsRun()
    const dealt = dealPressureCards(run, () => 0.2)
    expect(dealt.length).toBe(4)
    const ids = dealt.map((c) => c.id)
    expect(new Set(ids).size).toBe(4)
  })

  it('startPressureRound offeredCardIds 四槽位互异', () => {
    const run = hsRun()
    for (let seed = 0; seed < 20; seed++) {
      const next = startPressureRound(run, mulberry32(seed))
      expect(new Set(next.pressure!.offeredCardIds).size).toBe(4)
    }
  })

  it('末位班加权更易出现打工牌', () => {
    const run = hsRun()
    run.school!.classTier = '末位班'
    const rand = mulberry32(99)
    let workHits = 0
    for (let i = 0; i < 40; i++) {
      const dealt = dealPressureCards(run, rand)
      if (dealt.some((c) => c.tags.includes('work'))) workHits += 1
    }
    expect(workHits).toBeGreaterThan(10)
    const studyCard = PRESSURE_CARDS.find((c) => c.tags.includes('study'))!
    expect(cardWeightForTier(studyCard, '末位班')).toBeLessThan(cardWeightForTier(studyCard, '示范班'))
  })

  it('requires.minCash 过滤采购牌', () => {
    const run = hsRun()
    run.econ!.cash = 50
    const dealt = dealPressureCards(run, () => 0.99)
    expect(dealt.some((c) => c.id === 'hs-buy-supplies')).toBe(false)
  })

  it('endless 境界偏置：foundation 更偏向 study', () => {
    const studyCard = PRESSURE_CARDS.find((c) => c.tags.includes('study'))!
    const workCard = PRESSURE_CARDS.find((c) => c.tags.includes('work'))!
    const run = hsRun()
    run.runMode = 'endless'
    run.realmTier = 'foundation'
    const studyWeight = cardWeightForLifeStageRun(studyCard, run)
    const workWeight = cardWeightForLifeStageRun(workCard, run)
    expect(studyWeight).toBeGreaterThan(workWeight)
  })

  it('dealPressureCards 每手至少 2 张能动性牌', () => {
    const run = hsRun()
    run.runMode = 'endless'
    run.lifeStage = 'work'
    run.realmTier = 'core'
    for (let seed = 0; seed < 40; seed++) {
      const dealt = dealPressureCards(run, mulberry32(seed))
      const agencyCount = dealt.filter(isAgencyPressureCard).length
      expect(agencyCount, `seed ${seed}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('dealPressureCards 能动性牌覆盖至少 2 类标签桶', () => {
    const run = hsRun()
    run.runMode = 'endless'
    run.lifeStage = 'work'
    run.realmTier = 'purple'
    const bucketTags = (card: (typeof PRESSURE_CARDS)[number]) => {
      const buckets: string[] = []
      if (card.tags.includes('rest')) buckets.push('rest')
      if (card.tags.includes('study')) buckets.push('study')
      if (card.tags.includes('train')) buckets.push('train')
      if (card.title.includes('最低还款')) buckets.push('repay')
      if (card.title.includes('发薪')) buckets.push('income')
      return buckets
    }
    for (let seed = 0; seed < 40; seed++) {
      const dealt = dealPressureCards(run, mulberry32(seed))
      const buckets = new Set(dealt.filter(isAgencyPressureCard).flatMap(bucketTags))
      expect(buckets.size, `seed ${seed}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('toggle 最多选 2 张', () => {
    let run = startPressureRound(hsRun(), () => 0.1)
    const [a, b, c] = run.pressure!.offeredCardIds
    run = togglePressureCard(run, a)
    run = togglePressureCard(run, b)
    run = togglePressureCard(run, c)
    expect(run.pressure!.playedCardIds.length).toBe(2)
  })

  it('canEndRound 需恰好 2 张', () => {
    let run = startPressureRound(hsRun(), () => 0.1)
    expect(canEndRound(run)).toBe(false)
    run = togglePressureCard(run, run.pressure!.offeredCardIds[0]!)
    expect(canEndRound(run)).toBe(false)
    run = togglePressureCard(run, run.pressure!.offeredCardIds[1]!)
    expect(canEndRound(run)).toBe(true)
  })

  it('跳过打工牌发酵提升逾期', () => {
    const run = hsRun()
    const before = run.econ!.delinquency
    const next = applySkippedFerment(run, ['hs-parttime'], [])
    expect(next.econ!.delinquency).toBeGreaterThan(before)
  })

  it('resolvePressureRound 推进日与利息', () => {
    let run = startPressureRound(hsRun(), () => 0.1)
    run = togglePressureCard(run, run.pressure!.offeredCardIds[0]!)
    run = togglePressureCard(run, run.pressure!.offeredCardIds[1]!)
    const dayBefore = run.school!.day
    const interestBefore = run.econ!.debtInterestAccrued
    run = resolvePressureRound(run)
    expect(run.pressure!.resolved).toBe(true)
    expect(run.school!.day).toBe(dayBefore + 1)
    expect(run.econ!.debtInterestAccrued).toBeGreaterThanOrEqual(interestBefore)
  })

  it('beginNextRoundAfterResolve 开新回合', () => {
    let run = startPressureRound(hsRun(), () => 0.1)
    run = togglePressureCard(run, run.pressure!.offeredCardIds[0]!)
    run = togglePressureCard(run, run.pressure!.offeredCardIds[1]!)
    run = resolvePressureRound(run)
    run = beginNextRoundAfterResolve(run)
    expect(run.pressure!.resolved).toBe(false)
    expect(run.pressure!.round).toBe(2)
    expect(run.pressure!.playedCardIds).toEqual([])
  })

  it('getPressureCardById 可查发酵配置', () => {
    const parttime = getPressureCardById('hs-parttime')
    expect(parttime?.effectsOnSkip?.length).toBeGreaterThan(0)
  })
})

describe('debtDashboard', () => {
  it('buildDebtDashboardVM 含总债务', () => {
    const vm = buildDebtDashboardVM(hsRun())
    expect(vm).not.toBeNull()
    expect(vm!.totalDue).toBeGreaterThan(0)
    expect(vm!.minPayment).toBeGreaterThan(0)
  })
})
