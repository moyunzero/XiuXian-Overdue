import type {
  ActionId,
  EventEffect,
  GameState,
  PendingEvent,
  StartConfig,
  HiddenModifiers
} from '~/types/game'
import { computed, ref } from 'vue'
import { clamp, mulberry32, round1, uid } from '~/utils/rng'
import { ALL_EVENTS, getEventsByPhase } from '~/utils/events'
import * as Engine from '~/logic/gameEngine'
import { useGameState, defaultState } from './useGameState'
import { useGameComputed } from './useGameComputed'
import { useGameStorage, resetModuleStorageState } from './useGameStorage'
import { useEmotionalMemoryStorage } from './useEmotionalMemoryStorage'
import { useGameEconomyActions } from './useGameEconomyActions'
import { useGameEventResolver } from './useGameEventResolver'
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
  remainingSlotsFor,
  pickActionSummaryItems,
  mergeNarrativeAndSummary,
  applyStudyAction,
  applyTunaAction,
  applyTrainAction,
  applyParttimeAction,
  applyBuyAction,
  applyRestAction,
  type AddLog,
  type ActionSnapshot
} from './useGame.actions'
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
import {
  buildRepaymentEvent,
  BODY_PART_LABELS,
  BODY_PART_PREREQS
} from './useGame.events'

export function useGame() {
  const { game } = useGameState()
  const { activeSlot, saveToSlot, loadFromSlot, listSlots } = useGameStorage()

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

  const act = (action: ActionId) => {
    const g = game.value
    if (!g.started || g.pendingEvent) return

    const { recordGameAction } = useCausalGraph()
    const beforeStateForGraph = JSON.parse(JSON.stringify(g)) as GameState

    const slotAtStart = g.school.slot
    const rand = mulberry32(g.seed + g.school.day * 31 + Engine.slotOrder().indexOf(g.school.slot) * 997)
    const beforeAction: ActionSnapshot = {
      cash: g.econ.cash,
      fatigue: g.stats.fatigue,
      focus: g.stats.focus,
      faLi: g.stats.faLi,
      rouTi: g.stats.rouTi
    }
    const beforeLogLen = g.logs.length

    let numbRestTaken = false
    if (action === 'rest' && g.contract.active) {
      const rNumb = rand()
      numbRestTaken = Engine.shouldTakeNumbRest(g, rNumb)
    }

    if (!numbRestTaken && Engine.contractWouldTrigger(g, action, rand)) {
      const prevP = g.contract.progress
      const prevV = g.contract.vigilance
      g.contract.lastTriggerDay = g.school.day
      g.contract.lastTriggerSlot = g.school.slot
      g.contract.progress = clamp(g.contract.progress + 2, 0, 100)
      g.contract.vigilance = clamp(g.contract.vigilance + (action === 'rest' ? 6 : 2), 0, 100)
      Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
      g.pendingEvent = Engine.makeContractBacklashEvent(g, action)
      ensureSummaryUnlock(g)
      saveToSlot(activeSlot.value)
      return
    }

    const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
      if (g.logs.length > 120) g.logs.pop()
    }

    const integrity = g.bodyIntegrity ?? 1.0
    const fatigueMult = 2 - integrity
    const baseFatigueUp =
      action === 'rest' ? -14 : action === 'tuna' ? 3 : action === 'study' ? 5 : action === 'train' ? 10 : action === 'parttime' ? 12 : 6
    const fatigueUp = baseFatigueUp < 0 ? baseFatigueUp : Math.round(baseFatigueUp * fatigueMult)
    g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)

    if (action === 'study') applyStudyAction(g, integrity, addLog)
    else if (action === 'tuna') applyTunaAction(g, addLog)
    else if (action === 'train') applyTrainAction(g, integrity, rand, addLog)
    else if (action === 'parttime') applyParttimeAction(g, integrity, rand, addLog)
    else if (action === 'buy') applyBuyAction(g, addLog)
    else if (action === 'rest') {
      if (numbRestTaken) applyRestAction(g, addLog, { mode: 'numb' })
      else applyRestAction(g, addLog, { mode: 'recover', rand })
    }

    if (!g.daySlotActions) g.daySlotActions = {}
    g.daySlotActions[slotAtStart] = action

    const insertedCount = Math.max(0, g.logs.length - beforeLogLen)
    const actionLogs = insertedCount > 0 ? g.logs.slice(0, insertedCount) : []
    if (insertedCount > 0) g.logs.splice(0, insertedCount)
    const primaryActionLog = actionLogs[0] ?? {
      title: '行动执行',
      detail: '系统已记录你的本时段行动结果。',
      tone: 'info' as const
    }
    const afterAction: ActionSnapshot = {
      cash: g.econ.cash,
      fatigue: g.stats.fatigue,
      focus: g.stats.focus,
      faLi: g.stats.faLi,
      rouTi: g.stats.rouTi
    }
    const summaryItems = pickActionSummaryItems(action, beforeAction, afterAction)
    addLog(primaryActionLog.title, mergeNarrativeAndSummary(primaryActionLog.detail, summaryItems), primaryActionLog.tone)

    if ((action === 'study' || action === 'tuna') && (g.scoreDayStreak ?? 0) >= 2) {
      const feeRand = mulberry32(g.seed + g.school.day * 401 + Engine.slotOrder().indexOf(slotAtStart) * 31)
      if (feeRand() < 0.26) {
        const bite = Math.floor(45 + feeRand() * 110)
        g.econ.collectionFee = (g.econ.collectionFee ?? 0) + bite
        addLog(
          '制度抽检（费用）',
          `系统记录到刷分路线偏科下的现金链承压。费用池增加¥${bite}。不形成建议。`,
          'warn'
        )
      }
    }

    if (g.school.slot === 'morning') g.econ.cash += g.school.perks.mealSubsidy

    const isAnti = Engine.isAntiProfileAction(action, g)
    Engine.updateAntiProfileStreak(g, isAnti)

    if (isAnti && g.antiProfileDayStreak && g.antiProfileDayStreak > emotionalStorage.sessionAntiProfileStreakMax.value) {
      emotionalStorage.sessionAntiProfileStreakMax.value = g.antiProfileDayStreak
    }

    if (!g.sessionMetrics) {
      g.sessionMetrics = {
        actionCounts: {},
        borrowCount: 0,
        bodyPartRepaymentCount: 0,
        antiProfileActionCount: 0,
        restCount: 0,
        startTime: emotionalStorage.sessionStartTime.value
      }
    }
    if (!g.sessionMetrics.actionCounts) {
      g.sessionMetrics.actionCounts = {}
    }
    g.sessionMetrics.actionCounts[action] = (g.sessionMetrics.actionCounts[action] || 0) + 1
    if (action === 'rest') {
      g.sessionMetrics.restCount = (g.sessionMetrics.restCount || 0) + 1
    }

    const afterStateForGraph = JSON.parse(JSON.stringify(g)) as GameState
    const hiddenContributions = eventResolver.computeHiddenContributions(g)
    recordGameAction(
      g.school.day,
      slotAtStart,
      action,
      beforeStateForGraph,
      afterStateForGraph,
      hiddenContributions
    )

    const endingAlreadySeen = g.logs.some(
      (log: GameState['logs'][number]) => log.title === Engine.NARRATIVE_ENDING_LOG_TITLE
    )
    const shouldShowEnding = !endingAlreadySeen && Engine.shouldTriggerNarrativeEnding(g)

    const antiProfileCheck = Engine.shouldTriggerAntiProfileRiskEvent(g, rand)
    const repaymentCheck = Engine.shouldTriggerRepaymentEvent(g, rand)
    if (antiProfileCheck) {
      g.pendingEvent = Engine.buildAntiProfileRiskEvent(g)
    } else if (repaymentCheck.trigger) {
      g.pendingEvent = buildRepaymentEvent(g, rand)
    } else if (shouldShowEnding) {
      g.pendingEvent = Engine.makeNarrativeEndingEvent()
    } else {
      const collapse = Engine.tryEmitStrongCollapse(g, rand, ALL_EVENTS.filter(e => e.type === 'collapse'))
      if (collapse?.kind === 'full') {
        g.pendingEvent = collapse.pending
      } else {
        if (collapse?.kind === 'echo') {
          g.logs.unshift({
            id: uid('log'),
            day: g.school.day,
            title: collapse.title,
            detail: collapse.detail,
            tone: 'warn'
          })
          if (g.logs.length > 120) g.logs.pop()
        }
        g.pendingEvent = eventResolver.randomPoolAfterAction(g, rand)
      }
    }

    const idx = Engine.slotOrder().indexOf(g.school.slot)
    const nextSlot = Engine.slotOrder()[idx + 1]
    if (idx < Engine.slotOrder().length - 1 && nextSlot) g.school.slot = nextSlot
    else {
      performEndDay(g, gameComputed.minPayment.value, applyWeeklyCollectionFee)
    }

    ensureSummaryUnlock(g)
    gameComputed.refreshProfileSnapshot()
    saveToSlot(activeSlot.value)
  }

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
