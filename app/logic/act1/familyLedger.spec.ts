import { describe, expect, it } from 'vitest'
import { createInitialAct1State } from './createInitialAct1State'
import type { StartConfig } from '~/types/game'
import {
  applyCollectionChoice,
  applyFamilyExpense,
  applyFamilyOutcomeEffects,
  COLLECTION_ESCALATION_REQUESTS,
  getCollectionBeat,
  isCollectionEscalated,
  shouldAutoFamilyLeft
} from './familyLedger'

const cfg: StartConfig = {
  playerName: '你',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 0,
  startingCity: '嵩阳市'
}

describe('familyLedger', () => {
  it('向家里要钱增加现金、降低韧性并推进催收', () => {
    let state = createInitialAct1State(cfg)
    state = { ...state, cash: 120 }
    const next = applyFamilyExpense(state, 'pill-pack')
    expect(next.familyMeta.moneyRequests).toBe(1)
    expect(next.familyResilience).toBeLessThan(state.familyResilience)
    expect(next.cash).toBe(920)
    expect(getCollectionBeat(next)).not.toBeNull()
  })

  it('仅要钱 1 次时催收选项仍可推进对话档位', () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyExpense(state, 'pill-pack')
    expect(getCollectionBeat(state)?.title).toContain('还款提醒')

    const { state: afterAck } = applyCollectionChoice(state, 'ack')
    expect(afterAck.familyMeta.collectionStage).toBe(2)
    expect(getCollectionBeat(afterAck)?.title).toContain('联系人')
    expect(afterAck.familyMeta.lastChoiceFeedback).toContain('下一档')

    const { state: afterDelay } = applyCollectionChoice(state, 'delay')
    expect(afterDelay.delinquency).toBe(state.delinquency + 1)
    expect(getCollectionBeat(afterDelay)?.title).toContain('联系人')
    expect(afterDelay.familyMeta.lastChoiceFeedback).toContain('宽限')
  })

  it('同一支出项不可重复索要', () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyExpense(state, 'pill-pack')
    const again = applyFamilyExpense(state, 'pill-pack')
    expect(again.familyMeta.moneyRequests).toBe(1)
  })

  it(`满 ${COLLECTION_ESCALATION_REQUESTS} 次要钱后催收明显升级`, () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyExpense(state, 'pill-pack')
    state = applyFamilyExpense(state, 'cram-vip')
    expect(isCollectionEscalated(state)).toBe(false)
    state = applyFamilyExpense(state, 'rent-root')
    expect(isCollectionEscalated(state)).toBe(true)
    const beat = getCollectionBeat(state)
    expect(beat?.stage).toBe(3)
    expect(beat?.title).toContain('迁出')
  })

  it('第二档「扛下」后不必再要钱 3 次即可进入结局节拍', () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyExpense(state, 'pill-pack')
    state = applyCollectionChoice(state, 'ack').state
    expect(getCollectionBeat(state)?.title).toContain('联系人')

    const { state: shielded } = applyCollectionChoice(state, 'shield')
    expect(shielded.profileTags).toContain('collection-shielded')
    expect(shielded.familyMeta.collectionStage).toBe(3)
    const beat = getCollectionBeat(shielded)
    expect(beat?.title).toContain('迁出')
    expect(beat?.choices.length).toBeGreaterThanOrEqual(2)

    const noop = applyCollectionChoice(shielded, 'shield')
    expect(noop.state).toBe(shielded)
  })

  it('联系家人后同样进入结局节拍', () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyExpense(state, 'pill-pack')
    state = applyCollectionChoice(state, 'ack').state
    const before = state.familyResilience
    const { state: contacted } = applyCollectionChoice(state, 'contact-family')
    expect(contacted.familyResilience).toBe(before - 30)
    expect(getCollectionBeat(contacted)?.title).toContain('迁出')
    expect(getCollectionBeat(contacted)?.choices.some((c) => c.id === 'accept-left')).toBe(true)
  })

  it('挽留需先扛下催收', () => {
    let state = createInitialAct1State(cfg)
    state = {
      ...state,
      familyMeta: { moneyRequests: 3, collectionStage: 3 }
    }
    const blocked = applyCollectionChoice(state, 'pay-save')
    expect(blocked.forceOutcome).toBeUndefined()
    const { state: shielded } = applyCollectionChoice(state, 'shield')
    const saved = applyCollectionChoice(shielded, 'pay-save')
    expect(saved.forceOutcome).toBe('saved-costly')
  })

  it('关键选项可强制结局', () => {
    let state = createInitialAct1State(cfg)
    const { forceOutcome } = applyCollectionChoice(state, 'accept-left')
    expect(forceOutcome).toBe('left')
    state = applyFamilyOutcomeEffects(state, 'left')
    expect(state.familyOutcome).toBe('left')
    expect(state.familyResilience).toBe(0)
  })

  it('韧性耗尽且要钱≥2次可触发自动离场判定', () => {
    let state = createInitialAct1State(cfg)
    state = { ...state, familyResilience: 20 }
    state = applyFamilyExpense(state, 'pill-pack')
    state = applyFamilyExpense(state, 'cram-vip')
    expect(state.familyResilience).toBe(0)
    expect(state.familyMeta.moneyRequests).toBe(2)
    expect(shouldAutoFamilyLeft(state)).toBe(true)
  })
})
