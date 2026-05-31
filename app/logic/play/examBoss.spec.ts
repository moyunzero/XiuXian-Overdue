import { describe, it, expect } from 'vitest'
import type { PlayRunState } from '~/types/play'
import type { StartConfig } from '~/types/game'
import { createHsFieldsFromStart } from './createHsPlayState'
import {
  examRankFromScore,
  runExamBoss,
  shouldTriggerExamBoss,
  scheduleExamBossIfDue,
  dismissExamBoss
} from './examBoss'
import { mulberry32 } from '~/utils/rng'

const start: StartConfig = {
  playerName: '测试',
  background: '中产',
  talent: '伪灵根',
  initialDebt: 12000,
  startingCity: '嵩阳市'
}

function hsRun(overrides: Partial<PlayRunState> = {}): PlayRunState {
  const hs = createHsFieldsFromStart(start)
  const base: PlayRunState = {
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
    seed: 42,
    ...hs,
    inbox: []
  }
  return {
    ...base,
    ...overrides,
    school: overrides.school ? { ...base.school!, ...overrides.school } : base.school,
    econ: overrides.econ ? { ...base.econ!, ...overrides.econ } : base.econ
  }
}

describe('examBoss', () => {
  it('shouldTriggerExamBoss 在第 8、15 日触发（周结算后）', () => {
    expect(shouldTriggerExamBoss(hsRun({ school: { day: 8 } as PlayRunState['school'] }))).toBe(true)
    expect(shouldTriggerExamBoss(hsRun({ school: { day: 15 } as PlayRunState['school'] }))).toBe(true)
    expect(shouldTriggerExamBoss(hsRun({ school: { day: 7 } as PlayRunState['school'] }))).toBe(false)
    expect(shouldTriggerExamBoss(hsRun({ school: { day: 1 } as PlayRunState['school'] }))).toBe(false)
  })

  it('runExamBoss 确定性 RNG', () => {
    const run = hsRun()
    const rand = mulberry32(42)
    const a = runExamBoss(run, rand)
    const b = runExamBoss(run, mulberry32(42))
    expect(a.score).toBe(b.score)
    expect(a.classTier).toBe(b.classTier)
    expect(a.rank).toBe(examRankFromScore(a.score))
  })

  it('scheduleExamBossIfDue 写入 examBossPending', () => {
    const run = hsRun({ school: { day: 8, week: 2 } as PlayRunState['school'] })
    const next = scheduleExamBossIfDue(run)
    expect(next.setpiece?.examBossPending).toBeDefined()
    expect(next.setpiece?.examBossPending!.score).toBeGreaterThan(0)
  })

  it('dismissExamBoss 应用分班并清空 pending', () => {
    let run = hsRun({ school: { day: 8, week: 2, classTier: '普通班' } as PlayRunState['school'] })
    run = scheduleExamBossIfDue(run)
    const pending = run.setpiece!.examBossPending!
    run = dismissExamBoss(run)
    expect(run.setpiece?.examBossPending).toBeUndefined()
    expect(run.school!.classTier).toBe(pending.classTier)
    expect(run.setpiece?.examBoss?.lastScore).toBe(pending.score)
    expect(run.logs.some((l) => l.includes('月考'))).toBe(true)
  })
})
