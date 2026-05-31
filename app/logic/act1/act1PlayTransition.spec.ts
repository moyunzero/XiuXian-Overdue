import { describe, expect, it } from 'vitest'
import { createInitialAct1State } from './createInitialAct1State'
import { applyFamilyOutcomeEffects } from './familyLedger'
import { deriveMetaUnlocks, derivePermanentModifiers } from './act1Settlement'
import { drawCredit, buildLoanContract } from './loanProducts'
import { deriveAct1Modifiers } from './startConfigModifiers'
import { settleAct1IntoPlayRun } from './act1PlayTransition'
import { act1LedgerTotalDue } from './act1HsEcon'
import { createPlayRunFromStartConfig } from '~/logic/play/createPlayRun'
import type { StartConfig } from '~/types/game'

const cfg: StartConfig = {
  playerName: '你',
  background: '贫民',
  talent: '无灵根',
  initialDebt: 10_000,
  startingCity: '嵩阳市'
}

describe('act1PlayTransition', () => {
  it('结算后 PlayRun 进入 hs 并写入 carryover', () => {
    let act1 = createInitialAct1State(cfg)
    act1 = applyFamilyOutcomeEffects(act1, 'left')
    const persist = {
      startConfig: cfg,
      act1,
      metaUnlocks: deriveMetaUnlocks(act1),
      permanentModifiers: derivePermanentModifiers(act1),
      settled: true
    }
    const preRun = createPlayRunFromStartConfig(cfg, 'slot1')
    const hsRun = settleAct1IntoPlayRun(preRun, persist)

    expect(hsRun.lifeStage).toBe('hs')
    expect(hsRun.carryoverFromAct1?.familyOutcome).toBe('left')
    expect(hsRun.carryoverFromAct1?.metaUnlocks.length).toBeGreaterThan(0)
    expect(hsRun.econ).toBeDefined()
    expect(hsRun.stats).toBeDefined()
    expect(hsRun.school?.day).toBe(1)
    expect(hsRun.pressure).toBeUndefined()
    expect(hsRun.logs.some((l) => l.includes('制度档案'))).toBe(true)
    expect(hsRun.act1).toBeDefined()
    expect(hsRun.runStatus).toBe('active')
    expect(hsRun.archive).toBeUndefined()
  })

  it('同一 run 结转时合并 Act1 账本负债', () => {
    let act1 = createInitialAct1State(cfg)
    const mods = deriveAct1Modifiers(cfg)
    const loan = buildLoanContract('platform-standard', mods, 'conditional', act1.profileTags)!
    act1 = { ...act1, loans: [...act1.loans, loan] }
    const drawn = drawCredit(act1, 3000, loan.id)
    act1 = { ...act1, loans: drawn.loans, creditLineUsed: drawn.creditLineUsed }

    const persist = {
      startConfig: cfg,
      act1,
      metaUnlocks: deriveMetaUnlocks(act1),
      permanentModifiers: derivePermanentModifiers(act1),
      settled: true
    }
    const preRun = createPlayRunFromStartConfig(cfg, 'slot1')
    const hsRun = settleAct1IntoPlayRun(preRun, persist)

    expect(hsRun.econ?.debtPrincipal).toBeGreaterThan(cfg.initialDebt)
    expect(act1LedgerTotalDue(act1)).toBe(
      (hsRun.econ?.debtPrincipal ?? 0) + (hsRun.econ?.debtInterestAccrued ?? 0)
    )
    expect(hsRun.logs.some((l) => l.includes('结转负债'))).toBe(true)
  })

  it('未结算 persist 拒绝推进', () => {
    const preRun = createPlayRunFromStartConfig(cfg, 'slot1')
    expect(() =>
      settleAct1IntoPlayRun(preRun, {
        startConfig: cfg,
        act1: createInitialAct1State(cfg),
        metaUnlocks: [],
        permanentModifiers: {},
        settled: false
      })
    ).toThrow(/settled/)
  })
})
