import { type Ref } from 'vue'
import type { ActionId, GameState, ActionSnapshot } from '~/types/game'
import { clamp, mulberry32, uid } from '~/utils/rng'
import { ALL_EVENTS } from '~/utils/events'
import * as Engine from '~/logic/gameEngine'
import {
  pickActionSummaryItems,
  mergeNarrativeAndSummary,
  applyStudyAction,
  applyTunaAction,
  applyTrainAction,
  applyParttimeAction,
  applyBuyAction,
  applyRestAction
} from './useGame.actions'
import { buildRepaymentEvent } from './useGame.events'

interface UseGameComputed {
  minPayment: Ref<number>
  refreshProfileSnapshot: () => void
}

interface UseGameStorage {
  activeSlot: Ref<string>
  saveToSlot: (slotId: string) => void
}

interface UseEmotionalMemory {
  sessionAntiProfileStreakMax: { value: number }
  sessionStartTime: { value: number }
}

interface EventResolver {
  randomPoolAfterAction: (g: GameState, rand: () => number) => any
  computeHiddenContributions: (g: GameState) => Record<string, number>
}

interface DayCycle {
  performEndDay: (g: GameState, minPayment: number, applyWeeklyCollectionFee: (g: GameState) => void) => void
}

interface ApplyWeeklyCollectionFee {
  (g: GameState): void
}

type RecordGameAction = (
  day: number,
  slot: 'morning' | 'afternoon' | 'night',
  actionId: ActionId,
  beforeState: GameState,
  afterState: GameState,
  hiddenContributions?: Record<string, number>
) => void

export function useGameActionExecutor(
  game: Ref<GameState>,
  gameComputed: UseGameComputed,
  storage: UseGameStorage,
  emotionalStorage: UseEmotionalMemory,
  eventResolver: EventResolver,
  dayCycle: DayCycle,
  applyWeeklyCollectionFee: ApplyWeeklyCollectionFee,
  ensureSummaryUnlock: (g: GameState) => void,
  recordGameAction: RecordGameAction
) {
  const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
    const g = game.value
    g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
    if (g.logs.length > 120) g.logs.pop()
  }

  const act = (action: ActionId) => {
    const g = game.value
    if (!g.started || g.pendingEvent) return

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
      storage.saveToSlot(storage.activeSlot.value)
      return
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
      dayCycle.performEndDay(g, gameComputed.minPayment.value, applyWeeklyCollectionFee)
    }

    ensureSummaryUnlock(g)
    gameComputed.refreshProfileSnapshot()
    storage.saveToSlot(storage.activeSlot.value)
  }

  return { act }
}