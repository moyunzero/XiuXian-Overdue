import type { GameState } from '~/types/game'

export function defaultState(): GameState {
  return {
    started: false,
    seed: Math.floor(Math.random() * 1_000_000_000),
    stats: {
      daoXin: 1,
      faLi: 6.8,
      rouTi: 0.6,
      fatigue: 25,
      focus: 55
    },
    econ: {
      cash: 1200,
      collectionFee: 0,
      coreDebt: 0,
      initialCoreDebt: 0,
      debtPrincipal: 0,
      debtInterestAccrued: 0,
      dailyRate: 0.008,
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
      perks: {
        mealSubsidy: 0,
        focusBonus: 0
      }
    },
    contract: {
      active: false,
      name: '请神契约',
      patron: '布娃娃（邪神代理）',
      progress: 0,
      vigilance: 35,
      lastTriggerDay: 0
    },
    logs: [],
    eventHistory: {},
    familyHistory: {},
    bodyPartRepayment: {},
    bodyIntegrity: 1.0,
    bodyReputation: 'clean',
    buyDebasement: 0,
    daySlotActions: {},
    scoreDayStreak: 0,
    cashDayStreak: 0
  }
}

export function useGameState() {
  const game = useState<GameState>('game', () => defaultState())
  return { game }
}
