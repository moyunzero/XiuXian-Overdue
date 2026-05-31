import { describe, expect, it } from 'vitest'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import type { StartConfig } from '~/types/game'

const cfg: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

describe('createPlayRunFromStartConfig', () => {
  it('默认 runMode 为 endless', () => {
    const run = createPlayRunFromStartConfig(cfg, 'slot1')
    expect(run.runMode).toBe('endless')
    expect(run.lifeStage).toBe('pre')
  })

  it('可显式指定 endless', () => {
    const run = createPlayRunFromStartConfig(cfg, 'slot2', { runMode: 'endless' })
    expect(run.runMode).toBe('endless')
    expect(run.slotId).toBe('slot2')
  })
})
