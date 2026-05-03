import type {
  ActionId,
  EventEffect,
  GameState,
  PendingEvent,
  StartConfig,
  HiddenModifiers
} from '~/types/game'
import { computed, ref } from 'vue'
import { round1, uid } from '~/utils/rng'
import * as Engine from '~/logic/gameEngine'
import { useGameState, defaultState } from './useGameState'
import { useGameComputed } from './useGameComputed'
import { useGameStorage, resetModuleStorageState } from './useGameStorage'
import { useEmotionalMemoryStorage } from './useEmotionalMemoryStorage'
import { useGameEconomyActions } from './useGameEconomyActions'
import { useGameEventResolver } from './useGameEventResolver'
import { useGameActionExecutor } from './useGameActionExecutor'
import {
  applyMemoryToState,
  buildPersonalityProfile,
  getHiddenModifiers
} from '~/logic/emotionalMemoryLayer'
import { useCausalGraph } from './useCausalGraph'
import {
  createSocialNetwork,
  recordInteraction as recordSocialInteraction,
  propagateInfluence,
  checkThresholdEvents
} from '~/logic/socialNetworkEngine'
import type { EmergentEvent, EventContext, SocialNetwork, InteractionType } from '~/types/game'
import {
  splitInitialDebtForGame,
  weeklySystemFee,
  applyWeeklyCollectionFee,
  applyRepaymentByPriority,
  executeImmediatePayment
} from './useGame.economy'
import {
  finalizeDayRouteStreak,
  applyNarrativeDelays,
  applyWeeklyExam,
  applyDelinquencyCheck,
  endDay as performEndDay
} from './useGame.dayCycle'

export function useGame() {
  const { game } = useGameState()
  const { activeSlot, saveToSlot, loadFromSlot, listSlots } = useGameStorage()
  const emotionalStorage = useEmotionalMemoryStorage()

  // 初始化动态事件池
  if (import.meta.client) {
    import('~/composables/useDynamicEventPool').then(({ useDynamicEventPool }) => {
      const pool = useDynamicEventPool()
      pool.init().then(async () => {
        if (!await pool.isSeedImported()) {
          try {
            const response = await fetch('/seed-events.json')
            const seedEvents = await response.json()
            await pool.importSeedEvents(seedEvents)
          } catch (e) {
            console.warn('种子库导入失败:', e)
          }
        }
      })
    })
  }

  const socialNetwork = useState<SocialNetwork>('social-network', () => createSocialNetwork())
  const summaryPanelOpen = ref(false)

  const ensureSummaryUnlock = (g: GameState) => {
    if (g.summaryUnlocked) return
    if (Engine.shouldUnlockSummary(g)) {
      g.summaryUnlocked = true
      if (g.summaryUnlockedAtDay === undefined) g.summaryUnlockedAtDay = g.school.day
    }
  }

  const openSummaryPanel = () => {
    const g = game.value
    ensureSummaryUnlock(g)
    if (!g.summaryUnlocked) return
    summaryPanelOpen.value = true
  }

  const acknowledgeSummaryAndContinue = () => {
    const g = game.value
    g.summarySeen = true
    g.summarySeenAtDay = g.school.day
    summaryPanelOpen.value = false
    saveToSlot(activeSlot.value)
  }

  const closeSummaryPanelWithoutMarking = () => {
    summaryPanelOpen.value = false
  }

  const gameComputed = useGameComputed(game)

  const reset = () => {
    game.value = defaultState()
    resetModuleStorageState()
    activeSlot.value = 'autosave'
  }

  const emotionalStorage = useEmotionalMemoryStorage()

  const economyActions = useGameEconomyActions(game, gameComputed, { activeSlot, saveToSlot })

  const eventResolver = useGameEventResolver(game, gameComputed, { activeSlot, saveToSlot }, emotionalStorage, socialNetwork)

  const { recordGameAction } = useCausalGraph()

  const actionExecutor = useGameActionExecutor(
    game,
    gameComputed,
    { activeSlot, saveToSlot },
    emotionalStorage,
    eventResolver,
    { performEndDay },
    applyWeeklyCollectionFee,
    ensureSummaryUnlock,
    recordGameAction
  )

  const startNew = (cfg: StartConfig) => {
    emotionalStorage.recordCurrentSession(game.value)

    const { initializeGraph } = useCausalGraph()
    initializeGraph()

    socialNetwork.value = createSocialNetwork()

    const memory = emotionalStorage.loadEmotionalMemory()
    const g = defaultState()
    g.started = true
    g.startConfig = cfg
    g.seed = Math.floor(Math.random() * 1_000_000_000)

    const bgCash = cfg.background === '贫民' ? 800 : cfg.background === '中产' ? 3200 : 12_000
    const bgRate = cfg.background === '贫民' ? 0.008 : cfg.background === '中产' ? 0.006 : 0.007

    const tFa = cfg.talent === '无灵根' ? 6.2 : cfg.talent === '伪灵根' ? 7.4 : 9.2
    const tFocus = cfg.talent === '无灵根' ? 52 : cfg.talent === '伪灵根' ? 58 : 64

    g.econ.cash = bgCash
    g.econ.collectionFee = 0
    g.econ.dailyRate = bgRate
    cfg.initialDebt = Math.max(5000, cfg.initialDebt)
    const split = splitInitialDebtForGame(cfg.initialDebt)
    g.econ.debtPrincipal = split.principal
    g.stats.faLi = round1(tFa)
    g.stats.focus = tFocus
    g.stats.daoXin = 1
    g.stats.rouTi = 0.6
    g.school.classTier = '普通班'
    g.school.perks = Engine.perksForTier('普通班')
    g.daySlotActions = {}
    g.scoreDayStreak = 0
    g.cashDayStreak = 0
    g.lastConflictNoticeDay = undefined
    g.logs = [
      {
        id: uid('log'),
        day: 1,
        title: '开局',
        detail: `你叫"${cfg.playerName}"。城市：${cfg.startingCity}。出身：${cfg.background}。天赋：${cfg.talent}。制度债¥${g.econ.debtPrincipal.toLocaleString()}。记住：债务会随复利增长，五险一金会从工资中扣除。`,
        tone: 'info'
      }
    ]

    const initialProfile = Engine.buildSocialProfile(g)
    g.profileSnapshot = {
      profile: initialProfile,
      lastProfileUpdateDay: 1,
      profileVersion: 1
    }

    const stateWithMemory = applyMemoryToState(memory, g)
    Object.assign(g, stateWithMemory)

    emotionalStorage.updateSessionStartDay(g.school.day)
    emotionalStorage.sessionStartTime.value = Date.now()
    emotionalStorage.sessionAntiProfileStreakMax.value = 0

    game.value = g
  }

  const { act } = actionExecutor

  const resolveEvent = (optionId: string) => {
    eventResolver.resolveEvent(optionId, ensureSummaryUnlock)
  }

  return {
    game,
    activeSlot,
    saveToSlot,
    loadFromSlot,
    listSlots,
    reset,
    startNew,
    ...gameComputed,
    creditLimit: computed(() => Math.max(2000, 50000 - gameComputed.totalDebt.value)),
    act,
    ...economyActions,
    resolveEvent,
    summaryPanelOpen,
    openSummaryPanel,
    acknowledgeSummaryAndContinue,
    closeSummaryPanelWithoutMarking
  }
}

export const __test__ = {
  splitInitialDebtForGame,
  weeklySystemFee,
  applyWeeklyCollectionFee,
  applyRepaymentByPriority,
  executeImmediatePayment
}
