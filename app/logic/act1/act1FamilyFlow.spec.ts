/**
 * 家庭账本 E2E 式纯函数回归：防「点了没反应 / 必须刷 3 次才能结案」类卡点。
 * 改 familyLedger.ts、FamilyModule.vue、useAct1Session 家庭相关逻辑后必跑本文件。
 */
import { describe, expect, it } from 'vitest'
import { createInitialAct1State } from './createInitialAct1State'
import type { StartConfig } from '~/types/game'
import {
  applyCollectionChoice,
  applyFamilyExpense,
  applyFamilyOutcomeEffects,
  displayCollectionStage,
  getCollectionBeat,
  hasFamilyEndingChoices,
  isCollectionEscalated,
  isStage2CollectionResolved,
  maxCollectionStageForDisplay
} from './familyLedger'
import { canCompleteModule, markModuleComplete } from './moduleProgress'

const cfg: StartConfig = {
  playerName: '你',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 0,
  startingCity: '嵩阳市'
}

function minimalPathToStage2(state = createInitialAct1State(cfg)) {
  let s = applyFamilyExpense(state, 'pill-pack')
  s = applyCollectionChoice(s, 'ack').state
  return s
}

describe('act1FamilyFlow — 防卡点回归', () => {
  it('最短路径：1 次要钱 → 知道了 → 扛下 → 必须出现三结局选项', () => {
    const atStage2 = minimalPathToStage2()
    const { state: shielded } = applyCollectionChoice(atStage2, 'shield')

    expect(isStage2CollectionResolved(shielded)).toBe(true)
    expect(displayCollectionStage(shielded)).toBe(3)
    expect(maxCollectionStageForDisplay(shielded)).toBe(3)
    expect(hasFamilyEndingChoices(shielded)).toBe(true)

    const beat = getCollectionBeat(shielded)!
    expect(beat.title).toContain('迁出')
    expect(beat.choices.map((c) => c.id).sort()).toEqual(
      ['accept-left', 'false-hope', 'pay-save'].sort()
    )
    expect(beat.choices.find((c) => c.id === 'pay-save')?.disabled).toBe(false)
  })

  it('最短路径：选「接受迁出」应能结案家庭模块', () => {
    const atStage2 = minimalPathToStage2()
    const { state: shielded } = applyCollectionChoice(atStage2, 'shield')
    const { forceOutcome } = applyCollectionChoice(shielded, 'accept-left')

    expect(forceOutcome).toBe('left')
    const unlocked = {
      ...shielded,
      completedModules: ['interview', 'loan'] as const
    }
    let done = applyFamilyOutcomeEffects(unlocked, 'left')
    expect(canCompleteModule(done, 'family')).toBe(true)
    done = markModuleComplete(done, 'family')
    expect(done.completedModules).toContain('family')
    expect(done.familyOutcome).toBe('left')
  })

  it('联系家人路径：不必 3 次要钱也应出现结局选项', () => {
    const atStage2 = minimalPathToStage2()
    const { state: contacted } = applyCollectionChoice(atStage2, 'contact-family')

    expect(hasFamilyEndingChoices(contacted)).toBe(true)
    expect(displayCollectionStage(contacted)).toBe(3)
    expect(getCollectionBeat(contacted)?.choices.some((c) => c.id === 'accept-left')).toBe(true)
  })

  it('第二档已处理后：展示档不得仍停在 2（空按钮死胡同）', () => {
    const atStage2 = minimalPathToStage2()
    for (const choiceId of ['shield', 'contact-family'] as const) {
      const { state } = applyCollectionChoice(atStage2, choiceId)
      expect(isStage2CollectionResolved(state)).toBe(true)
      expect(displayCollectionStage(state)).toBe(3)
      const beat = getCollectionBeat(state)
      expect(beat).not.toBeNull()
      if (beat!.stage === 2) {
        expect(beat!.choices.length).toBeGreaterThan(0)
      }
    }
  })

  it('第一档选项必须推进可见催收（仅 1 次要钱）', () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyExpense(state, 'pill-pack')
    expect(getCollectionBeat(state)?.title).toContain('还款')

    const { state: after } = applyCollectionChoice(state, 'ack')
    expect(displayCollectionStage(after)).toBe(2)
    expect(getCollectionBeat(after)?.title).toContain('联系人')
  })

  it('要钱 3 次仅加码文案，不是结局门槛', () => {
    let state = createInitialAct1State(cfg)
    state = applyFamilyExpense(state, 'pill-pack')
    state = applyCollectionChoice(state, 'ack').state
    state = applyCollectionChoice(state, 'shield').state

    expect(state.familyMeta.moneyRequests).toBe(1)
    expect(isCollectionEscalated(state)).toBe(false)
    expect(hasFamilyEndingChoices(state)).toBe(true)

    state = applyFamilyExpense(state, 'cram-vip')
    state = applyFamilyExpense(state, 'rent-root')
    expect(isCollectionEscalated(state)).toBe(true)
    expect(hasFamilyEndingChoices(state)).toBe(true)
  })

  it('催收选项重复点击不应改变已结案第二档状态', () => {
    const atStage2 = minimalPathToStage2()
    const { state: shielded } = applyCollectionChoice(atStage2, 'shield')
    const again = applyCollectionChoice(shielded, 'shield')
    expect(again.state).toBe(shielded)
    expect(getCollectionBeat(again.state)?.stage).toBe(3)
  })
})
