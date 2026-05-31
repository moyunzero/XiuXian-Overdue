import { describe, it, expect } from 'vitest'
import {
  appendPlayAiMomentIfDue,
  DELINQUENCY_SPIKE_THRESHOLD,
  hasFiredAiMoment,
  resolvePlayAiMoment,
  shouldFireDelinquencySpike
} from './playAiMoments'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import type { StartConfig } from '~/types/game'

const start: StartConfig = {
  playerName: '测试',
  background: '中产',
  initialDebt: 10_000,
  talent: '无灵根',
  startingCity: '嵩阳市'
}

describe('playAiMoments', () => {
  it('resolvePlayAiMoment 返回白名单内模板', () => {
    const m = resolvePlayAiMoment('post-exam', {
      lifeStage: 'hs',
      realmTier: 'mortal',
      tags: [],
      debt: 5000,
      delinquency: 10,
      examScore: 72
    })
    expect(m.title.length).toBeGreaterThan(0)
    expect(m.detail.length).toBeGreaterThan(0)
    expect(Math.abs(m.fatigueDelta ?? 0)).toBeLessThanOrEqual(5)
    expect(Math.abs(m.focusDelta ?? 0)).toBeLessThanOrEqual(5)
  })

  it('shouldFireDelinquencySpike 仅在跨越阈值时', () => {
    expect(shouldFireDelinquencySpike(40, DELINQUENCY_SPIKE_THRESHOLD)).toBe(true)
    expect(shouldFireDelinquencySpike(60, 70)).toBe(false)
  })

  it('appendPlayAiMomentIfDue 每 trigger 仅一次', () => {
    let run = createPlayRunFromStartConfig(start, 'slot1')
    run = { ...run, econ: { ...run.econ!, delinquency: 0 } }
    const once = appendPlayAiMomentIfDue(run, 'delinquency-spike', { enabled: true })
    expect(hasFiredAiMoment(once, 'delinquency-spike')).toBe(true)
    const twice = appendPlayAiMomentIfDue(once, 'delinquency-spike', { enabled: true })
    expect(twice.logs.length).toBe(once.logs.length)
  })

  it('enabled false 时不写入', () => {
    const run = createPlayRunFromStartConfig(start, 'slot1')
    const next = appendPlayAiMomentIfDue(run, 'breakthrough', { enabled: false })
    expect(next.logs).toEqual(run.logs)
  })
})
