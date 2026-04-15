import { describe, expect, it } from 'vitest'
import type { GameState } from '~/types/game'
import {
  activateCollapseModifierAfterFirstFull,
  applyCollapseModifierToAction,
  buildSummarySnapshot,
  canTriggerStrongCollapse,
  clearCollapseModifierOnWeeklySettlement,
  computeNextStrongCollapseEarliestDay,
  computePsychologicalPressureScore,
  computeRestRecovery,
  getConflictPressureTier,
  hasMetSummarySubsidiaryThreshold,
  isMidLatePhase,
  isWeeklySettlementDay,
  pickCollapseFromDeck,
  resolveCollapsePresentation,
  restRecoveryMultiplier,
  shouldUnlockSummary,
  syncDomesticationWithContractProgress,
  tryEmitStrongCollapse
} from '~/logic/gameEngine'
import type { EventDefinition } from '~/types/game'
import { mulberry32 } from '~/utils/rng'

/** PSY-01：可复用的最小 GameState 片段 */
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
      coreDebt: 5000,
      initialCoreDebt: 5000,
      debtPrincipal: 2000,
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
      active: true,
      name: '请神契约',
      patron: '布娃娃',
      progress: 0,
      vigilance: 30,
      lastTriggerDay: 0
    },
    logs: [],
    eventHistory: {},
    familyHistory: {},
    domestication: 0,
    numbness: 0,
    ...overrides
  } as GameState
}

describe('PSY-01 D-01: isMidLatePhase 中后期门闩（先到先进入）', () => {
  it('day=10, progress=0 为真', () => {
    const g = baseGame({ school: { ...baseGame().school, day: 10, week: 2 }, contract: { ...baseGame().contract, progress: 0 } })
    expect(isMidLatePhase(g)).toBe(true)
  })

  it('day=9, progress=0 为假', () => {
    const g = baseGame({ school: { ...baseGame().school, day: 9, week: 2 }, contract: { ...baseGame().contract, progress: 0 } })
    expect(isMidLatePhase(g)).toBe(false)
  })

  it('day=1, progress=50 为真（先到先进入）', () => {
    const g = baseGame({ school: { ...baseGame().school, day: 1, week: 1 }, contract: { ...baseGame().contract, progress: 50 } })
    expect(isMidLatePhase(g)).toBe(true)
  })
})

describe('PSY-01 D-02: getConflictPressureTier 周阶梯与周界对齐、单调不减', () => {
  it('非中后期阶梯为 0', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 7, week: 1 },
      contract: { ...baseGame().contract, progress: 10 }
    })
    expect(isMidLatePhase(g)).toBe(false)
    expect(getConflictPressureTier(g)).toBe(0)
  })

  it('中后期 + 周结算日：周次升高则阶梯不降', () => {
    const gWeek1 = baseGame({
      school: { ...baseGame().school, day: 7, week: 1 },
      contract: { ...baseGame().contract, progress: 60 }
    })
    const gWeek2 = baseGame({
      school: { ...baseGame().school, day: 14, week: 2 },
      contract: { ...baseGame().contract, progress: 60 }
    })
    expect(isWeeklySettlementDay(gWeek1)).toBe(true)
    expect(isWeeklySettlementDay(gWeek2)).toBe(true)
    expect(isMidLatePhase(gWeek1)).toBe(true)
    expect(isMidLatePhase(gWeek2)).toBe(true)
    expect(getConflictPressureTier(gWeek2)).toBeGreaterThanOrEqual(getConflictPressureTier(gWeek1))
  })
})

describe('PSY-01 D-03: computePsychologicalPressureScore 复合压力（契约 + 状态）', () => {
  it('纯函数：仅由 contract 与 stats 组合，可解释', () => {
    const g = baseGame({
      contract: { ...baseGame().contract, progress: 40, vigilance: 50 },
      stats: { ...baseGame().stats, fatigue: 80, daoXin: 3 }
    })
    const s = computePsychologicalPressureScore(g)
    expect(s).toBeGreaterThan(0)
    expect(Number.isFinite(s)).toBe(true)
  })
})

describe('PSY-01 D-04: 无前期软保护（同一套公式入口，仅门闩区分中后期）', () => {
  it('前期与中后期共用 restRecoveryMultiplier 入口，不因「前期」单独减压', () => {
    const early = baseGame({
      school: { ...baseGame().school, day: 3, week: 1 },
      contract: { ...baseGame().contract, progress: 20, active: true }
    })
    const late = baseGame({
      school: { ...baseGame().school, day: 12, week: 2 },
      contract: { ...baseGame().contract, progress: 20, active: true }
    })
    expect(isMidLatePhase(early)).toBe(false)
    expect(isMidLatePhase(late)).toBe(true)
    // 同 progress 时倍率相同 — 无「前期额外回血」分支
    expect(restRecoveryMultiplier(early)).toBe(restRecoveryMultiplier(late))
  })
})

describe('PSY-01 D-05: syncDomesticationWithContractProgress 副指标与契约联动非递减', () => {
  it('签约且 progress 上升时 domestication 不下降', () => {
    const g = baseGame({ domestication: 10, contract: { ...baseGame().contract, active: true, progress: 20 } })
    syncDomesticationWithContractProgress(g, 15)
    expect(g.domestication ?? 0).toBeGreaterThanOrEqual(10)
  })
})

describe('PSY-01 D-06 D-07: computeRestRecovery 缠绕降恢复 / 麻木近零增量', () => {
  it('PSY-01 D-07: progress 高时基础恢复低于低 progress', () => {
    const lowP = baseGame({ contract: { ...baseGame().contract, active: true, progress: 10 } })
    const highP = baseGame({ contract: { ...baseGame().contract, active: true, progress: 90 } })
    const rLow = computeRestRecovery(lowP, { rand: () => 0.99 })
    const rHigh = computeRestRecovery(highP, { rand: () => 0.99 })
    expect(rLow.focusDelta).toBeGreaterThan(rHigh.focusDelta)
  })

  it('PSY-01 D-06: 麻木分支 focusDelta 接近 0', () => {
    const g = baseGame({ contract: { ...baseGame().contract, active: true, progress: 70 } })
    const r = computeRestRecovery(g, { rand: () => 0.5, forceNumb: true })
    expect(r.isNumbRest).toBe(true)
    expect(r.focusDelta).toBeLessThanOrEqual(1)
  })
})

const collapseDeckFixture = (id: string): EventDefinition => ({
  id,
  title: '崩溃样例',
  body: 'body',
  type: 'collapse',
  weight: 1,
  options: [{ id: 'ack', label: '承受', effects: [{ kind: 'stat', target: 'focus', delta: -1 }] }]
})

describe('PSY-02 D-09: canTriggerStrongCollapse 间隔与频率', () => {
  it('距上次强冲击未过头时返回 false', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 12, week: 2 },
      contract: { ...baseGame().contract, progress: 60 },
      nextStrongCollapseEarliestDay: 15
    })
    expect(canTriggerStrongCollapse(g, () => 0.99)).toBe(false)
  })

  it('超过 nextEarliest 且门闩通过时可为 true', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 17, week: 3 },
      contract: { ...baseGame().contract, progress: 60 },
      nextStrongCollapseEarliestDay: 15
    })
    expect(canTriggerStrongCollapse(g, () => 0.01)).toBe(true)
  })

  it('computeNextStrongCollapseEarliestDay 落在 [10,15] 日抖动区间', () => {
    const r = () => 0
    const next = computeNextStrongCollapseEarliestDay(20, r)
    expect(next).toBeGreaterThanOrEqual(20 + 10)
    expect(next).toBeLessThanOrEqual(20 + 15)
  })

  it('固定种子下强冲击门闩非每步必触发（频率上界）', () => {
    let hits = 0
    for (let i = 0; i < 40; i++) {
      const g = baseGame({
        school: { ...baseGame().school, day: 10 + i, week: 2 },
        contract: { ...baseGame().contract, progress: 60 },
        nextStrongCollapseEarliestDay: 10
      })
      const rand = mulberry32(9000 + i)
      if (canTriggerStrongCollapse(g, rand)) hits++
    }
    expect(hits).toBeLessThan(28)
  })
})

describe('PSY-02 D-10: resolveCollapsePresentation 首次 full / 回声 echo', () => {
  it('同一 collapseId 首次 full，之后 echo', () => {
    const g = baseGame({ collapseFirstDone: {} })
    expect(resolveCollapsePresentation('c1', g)).toBe('full')
    g.collapseFirstDone!.c1 = true
    expect(resolveCollapsePresentation('c1', g)).toBe('echo')
  })
})

describe('PSY-02 D-11: collapseModifier 里程碑修正', () => {
  it('applyCollapseModifierToAction 在修正激活时压低收益', () => {
    const g = baseGame({ collapseModifierActive: true })
    expect(applyCollapseModifierToAction(g, 'study', 10)).toBeCloseTo(8.8, 5)
  })

  it('activateCollapseModifierAfterFirstFull 打开修正', () => {
    const g = baseGame({ collapseModifierActive: false })
    activateCollapseModifierAfterFirstFull(g)
    expect(g.collapseModifierActive).toBe(true)
  })

  it('clearCollapseModifierOnWeeklySettlement 清除修正标记', () => {
    const g = baseGame({ collapseModifierActive: true })
    clearCollapseModifierOnWeeklySettlement(g)
    expect(g.collapseModifierActive).toBe(false)
  })
})

describe('PSY-02 D-12: pickCollapseFromDeck 权重抽样', () => {
  it('按 weight 从候选 deck 选出事件', () => {
    const deck: EventDefinition[] = [
      { ...collapseDeckFixture('light'), weight: 1 },
      { ...collapseDeckFixture('heavy'), weight: 99 }
    ]
    const pick = pickCollapseFromDeck(deck, () => 0.5)
    expect(pick?.id).toBe('heavy')
  })
})

describe('PSY-02: tryEmitStrongCollapse 管线', () => {
  it('full 返回 PendingEvent；echo 仅载荷', () => {
    const deck = [collapseDeckFixture('c_full')]
    const g1 = baseGame({
      school: { ...baseGame().school, day: 12, week: 2 },
      contract: { ...baseGame().contract, progress: 60 },
      nextStrongCollapseEarliestDay: 1
    })
    const seqFull = [0.01, 0.5, 0.25]
    let i = 0
    const randFull = () => seqFull[i++] ?? 0.5
    const full = tryEmitStrongCollapse(g1, randFull, deck)
    expect(full?.kind).toBe('full')
    if (full?.kind === 'full') expect(full.pending.title.length).toBeGreaterThan(0)

    const g2 = baseGame({
      school: { ...baseGame().school, day: 20, week: 3 },
      contract: { ...baseGame().contract, progress: 60 },
      collapseFirstDone: { c_full: true },
      nextStrongCollapseEarliestDay: 1
    })
    const seqEcho = [0.01, 0.5, 0.25]
    let j = 0
    const randEcho = () => seqEcho[j++] ?? 0.5
    const echo = tryEmitStrongCollapse(g2, randEcho, deck)
    expect(echo?.kind).toBe('echo')
  })
})

/** D-14：冷表快照含关键字段 */
function expectSnapshotShape(s: ReturnType<typeof buildSummarySnapshot>) {
  expect(s.schoolDay).toBeGreaterThan(0)
  expect(typeof s.totalDebt).toBe('number')
  expect(typeof s.domestication).toBe('number')
  expect(typeof s.numbness).toBe('number')
  expect(typeof s.fullCollapseKinds).toBe('number')
}

describe('PSY-03 D-13/D-15: shouldUnlockSummary 三轨先到（纯函数）', () => {
  it('D-15①: 副指标达阈值 ⇒ 真（不必 day≥30）', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 5, week: 1 },
      domestication: 55,
      numbness: 0
    })
    expect(hasMetSummarySubsidiaryThreshold(g)).toBe(true)
    expect(shouldUnlockSummary(g)).toBe(true)
  })

  it('D-15②: 日志中已有「麻木化时刻」⇒ 真', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 3, week: 1 },
      domestication: 0,
      numbness: 0,
      logs: [
        {
          id: 'x',
          day: 3,
          title: '情节结局：麻木化时刻',
          detail: '…',
          tone: 'warn'
        }
      ]
    })
    expect(shouldUnlockSummary(g)).toBe(true)
  })

  it('D-15②: 关键 collapse 事件曾触发 ⇒ 真', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 8, week: 2 },
      eventHistory: { psy_collapse_spiral: { lastDay: 7, times: 1 } }
    })
    expect(shouldUnlockSummary(g)).toBe(true)
  })

  it('D-15③: day≥30 单独 ⇒ 真', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 30, week: 5 },
      domestication: 0,
      numbness: 0
    })
    expect(shouldUnlockSummary(g)).toBe(true)
  })

  it('三者均未满足 ⇒ 假', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 10, week: 2 },
      domestication: 10,
      numbness: 10
    })
    expect(shouldUnlockSummary(g)).toBe(false)
  })
})

describe('PSY-03 D-14: buildSummarySnapshot', () => {
  it('返回冷数据字段对象', () => {
    const g = baseGame({
      school: { ...baseGame().school, day: 22, week: 4 },
      domestication: 33,
      numbness: 12,
      collapseFirstDone: { a: true, b: true }
    })
    const snap = buildSummarySnapshot(g)
    expectSnapshotShape(snap)
    expect(snap.schoolDay).toBe(22)
  })
})
