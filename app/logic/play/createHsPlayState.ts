import type { StartConfig } from '~/types/game'
import type { Act1Carryover, Act1State } from '~/types/act1'
import type { PlayRunState } from '~/types/play'
import { applyAct1CarryoverToGame } from '~/logic/act1/act1Carryover'
import { act1LedgerTotalDue, mergeAct1LedgerIntoHsEcon } from '~/logic/act1/act1HsEcon'
import { loanBalance } from '~/logic/act1/loanProducts'
import { perksForTier } from '~/logic/gameEngine'
import type { GameState } from '~/types/game'
import { withAct1Snapshot } from '~/logic/act1/resolveAct1Snapshot'
import { refreshRunInbox } from './inboxFromTemplates'
import { round1 } from '~/utils/rng'

function splitInitialDebt(initialDebt: number): { principal: number } {
  return { principal: Math.max(0, Math.floor(initialDebt)) }
}

function buildGameStub(cfg: StartConfig): GameState {
  const bgCash = cfg.background === '贫民' ? 800 : cfg.background === '中产' ? 3200 : 12_000
  const bgRate = cfg.background === '贫民' ? 0.008 : cfg.background === '中产' ? 0.006 : 0.007
  const tFa = cfg.talent === '无灵根' ? 6.2 : cfg.talent === '伪灵根' ? 7.4 : 9.2
  const tFocus = cfg.talent === '无灵根' ? 52 : cfg.talent === '伪灵根' ? 58 : 64
  const debt = Math.max(5000, cfg.initialDebt)
  const split = splitInitialDebt(debt)

  return {
    started: true,
    seed: Math.floor(Math.random() * 1_000_000_000),
    startConfig: cfg,
    stats: {
      daoXin: 1,
      faLi: round1(tFa),
      rouTi: 0.6,
      fatigue: 25,
      focus: tFocus
    },
    econ: {
      cash: bgCash,
      collectionFee: 0,
      debtPrincipal: split.principal,
      debtInterestAccrued: 0,
      dailyRate: bgRate,
      delinquency: 0,
      lastPaymentDay: 0
    },
    school: {
      day: 1,
      week: 1,
      slot: 'morning',
      classTier: '普通班',
      lastExamScore: 0,
      lastRank: 999,
      perks: perksForTier('普通班')
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
    bodyIntegrity: 1,
    bodyReputation: 'clean',
    buyDebasement: 0,
    daySlotActions: {},
    scoreDayStreak: 0,
    cashDayStreak: 0,
    domestication: 0,
    numbness: 0
  }
}

/** 从开局配置初始化高中主循环字段；传入 act1 时合并同一 run 的账本（贷款/现金） */
export function createHsFieldsFromStart(
  cfg: StartConfig,
  carryover?: Act1Carryover,
  act1?: Act1State
): Pick<PlayRunState, 'seed' | 'econ' | 'stats' | 'school' | 'logs' | 'profileTags' | 'carryoverFromAct1'> {
  const stub = buildGameStub(cfg)
  if (carryover) {
    applyAct1CarryoverToGame(stub, carryover)
  }
  if (act1) {
    stub.econ = mergeAct1LedgerIntoHsEcon(act1, stub.econ)
  }

  const logs = [
    `入学昆墟高中：${cfg.playerName}，${cfg.startingCity}，${cfg.background}。`,
    carryover ? '制度档案已从入学前夜结转。' : '新局开始，压力牌每回合四选二。'
  ]
  if (act1) {
    const due = act1LedgerTotalDue(act1)
    if (due > 0) {
      logs.push(`入学前夜结转负债 ¥${due.toLocaleString()}（${act1.loans.filter((l) => loanBalance(l) > 0).length} 笔合同）。`)
    }
  }

  if (carryover?.startingDelinquencyBias && carryover.startingDelinquencyBias > 0) {
    stub.econ.delinquency = Math.min(
      100,
      (stub.econ.delinquency ?? 0) + carryover.startingDelinquencyBias
    )
    logs.push(`制度档案：上周目逾期指数结转 +${carryover.startingDelinquencyBias}。`)
  }
  for (const hint of carryover?.unlockedInboxHints ?? []) {
    logs.push(hint)
  }

  const metaTags = carryover?.metaUnlocks?.slice(0, 3) ?? []
  const act1Tags = act1?.profileTags.filter((t) => !metaTags.includes(t)).slice(0, 3) ?? []

  return {
    seed: stub.seed,
    econ: { ...stub.econ },
    stats: { ...stub.stats },
    school: { ...stub.school },
    logs,
    profileTags: [...metaTags, ...act1Tags],
    carryoverFromAct1: carryover
  }
}

export function ensureHsRunReady(
  run: PlayRunState,
  carryover?: Act1Carryover,
  act1Fallback?: Act1State | null
): PlayRunState {
  const merged = withAct1Snapshot(run, act1Fallback)
  if (merged.econ && merged.stats && merged.school) {
    return refreshRunInbox(merged)
  }
  return advanceRunToHs(merged, carryover ?? merged.carryoverFromAct1, act1Fallback ?? merged.act1)
}

export function advanceRunToHs(
  run: PlayRunState,
  carryover?: Act1Carryover,
  act1?: Act1State
): PlayRunState {
  const snapshot = act1 ?? run.act1
  const hs = createHsFieldsFromStart(run.start, carryover ?? run.carryoverFromAct1, snapshot)
  return refreshRunInbox({
    ...run,
    ...hs,
    lifeStage: 'hs',
    chapterIndex: 0,
    pressure: undefined,
    setpiece: run.setpiece,
    act1: snapshot
  })
}
