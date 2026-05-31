import { describe, it, expect } from 'vitest'
import {
  createEndlessFromHandoff,
  createEndlessRunFromStart,
  checkEndlessCollapse,
  ENDLESS_LIE_FLAT_CARD_ID,
  LIE_FLAT_COLLAPSE_STREAK,
  playedEndlessLieFlatThisRound,
  tickEndlessAfterPressureRound
} from './endlessFlow'
import { uniqueOfferedCount } from './pressureDeck'

describe('endlessFlow', () => {
  it('createEndlessRunFromStart 进入 work+qi 且可发四张不同牌', () => {
    const run = createEndlessRunFromStart(
      {
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 20000,
        startingCity: 'xx市'
      },
      'slot1'
    )
    expect(run.runMode).toBe('endless')
    expect(run.lifeStage).toBe('work')
    expect(run.realmTier).toBe('qi')
    expect(run.work?.jobId).toBe('errand-runner')
    expect(run.pressure?.offeredCardIds.length).toBe(4)
    expect(uniqueOfferedCount(run.pressure!.offeredCardIds)).toBe(4)
  })

  it('tickEndlessAfterPressureRound 增加境中日与抽成', () => {
    const run = createEndlessRunFromStart(
      {
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 20000,
        startingCity: 'xx市'
      },
      'slot1'
    )
    const debtBefore = run.econ!.debtPrincipal
    const next = tickEndlessAfterPressureRound(run)
    expect(next.endless!.daysInCurrentRealm).toBe(1)
    expect(next.econ!.debtPrincipal).toBeGreaterThan(debtBefore)
  })

  it('createEndlessFromHandoff 保留负债并维持当前境界', () => {
    const campaign = createEndlessRunFromStart(
      {
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 20000,
        startingCity: 'xx市'
      },
      'slot1'
    )
    const withLiens = {
      ...campaign,
      bodyLiens: ['左臂留置'],
      setpiece: { harvestLedgerPending: undefined }
    }
    const endless = createEndlessFromHandoff({
      ...withLiens,
      runMode: 'endless',
      setpiece: {
        harvestLedgerPending: {
          stages: [],
          verdict: '',
          playableQuote: '',
          endings: [],
          totalHarvestTaken: 0,
          totalDebtAtEnd: 0
        }
      }
    } as typeof withLiens)
    expect(endless.runMode).toBe('endless')
    expect(endless.runStatus).toBe('active')
    expect(endless.realmTier).toBe('qi')
    expect(endless.setpiece?.harvestLedgerPending).toBeUndefined()
  })

  it('躺平牌：加重逾期、冻结境中日、连续 3 回合崩盘', () => {
    const start = {
      playerName: '你',
      background: '贫民' as const,
      talent: '无灵根' as const,
      initialDebt: 20000,
      startingCity: 'xx市'
    }
    let run = createEndlessRunFromStart(start, 'slot1')
    const other = run.pressure!.offeredCardIds.find((id) => id !== ENDLESS_LIE_FLAT_CARD_ID)!

    for (let i = 0; i < LIE_FLAT_COLLAPSE_STREAK - 1; i++) {
      run = {
        ...run,
        pressure: {
          ...run.pressure!,
          playedCardIds: [ENDLESS_LIE_FLAT_CARD_ID, other],
          resolved: false
        }
      }
      expect(playedEndlessLieFlatThisRound(run)).toBe(true)
      run = tickEndlessAfterPressureRound(run)
      expect(run.runStatus).toBe('active')
      expect(run.endless!.lieFlatStreak).toBe(i + 1)
      run = {
        ...run,
        pressure: { ...run.pressure!, resolved: true }
      }
    }

    run = {
      ...run,
      pressure: {
        ...run.pressure!,
        round: (run.pressure?.round ?? 0) + 1,
        playedCardIds: [ENDLESS_LIE_FLAT_CARD_ID, other],
        resolved: false
      }
    }
    const collapsed = tickEndlessAfterPressureRound(run)
    expect(collapsed.runStatus).toBe('collapsed')
    expect(collapsed.logs[0]).toContain('躺平档案入库')
  })

  it('非躺平崩盘需要满足最小破境/境中日门槛', () => {
    const run = createEndlessRunFromStart(
      {
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 20000,
        startingCity: 'xx市'
      },
      'slot1'
    )
    const stressed = {
      ...run,
      stats: { ...run.stats!, daoXin: 0.2, fatigue: 99 },
      econ: { ...run.econ!, delinquency: 95 },
      endless: { ...run.endless!, breakthroughsCount: 1, daysInCurrentRealm: 3 }
    }
    const collapsed = checkEndlessCollapse(stressed)
    expect(collapsed).toBeNull()
  })

  it('道心崩盘需要系统压力协同（逾期或疲劳）', () => {
    const run = createEndlessRunFromStart(
      {
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 20000,
        startingCity: 'xx市'
      },
      'slot1'
    )
    const lowDaoButLowStress = {
      ...run,
      stats: { ...run.stats!, daoXin: 0.2, fatigue: 65 },
      econ: { ...run.econ!, delinquency: 40 },
      endless: { ...run.endless!, breakthroughsCount: 3, daysInCurrentRealm: 12 }
    }
    expect(checkEndlessCollapse(lowDaoButLowStress)).toBeNull()
  })

  it('紫府境被动压力：长回合后 fatigue/dao 被侵蚀', () => {
    const run = createEndlessRunFromStart(
      {
        playerName: '你',
        background: '贫民',
        talent: '无灵根',
        initialDebt: 20000,
        startingCity: 'xx市'
      },
      'slot1'
    )
    let stressed = {
      ...run,
      realmTier: 'purple' as const,
      stats: { ...run.stats!, daoXin: 2.2, fatigue: 40 },
      econ: { ...run.econ!, delinquency: 30 },
      endless: { ...run.endless!, breakthroughsCount: 2, daysInCurrentRealm: 20 }
    }
    for (let i = 0; i < 80; i++) {
      stressed = {
        ...stressed,
        pressure: {
          ...stressed.pressure!,
          playedCardIds: stressed.pressure!.offeredCardIds.slice(0, 2),
          resolved: false
        }
      }
      stressed = tickEndlessAfterPressureRound(stressed)
      stressed = { ...stressed, pressure: { ...stressed.pressure!, resolved: true } }
      if (stressed.runStatus === 'collapsed') break
    }
    expect(stressed.stats!.fatigue).toBeGreaterThan(40)
    expect(stressed.stats!.daoXin).toBeLessThan(2.2)
  })
})
