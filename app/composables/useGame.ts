import type {
  ActionId,
  EventEffect,
  GameState,
  PendingEvent,
  StartConfig
} from '~/types/game'
import { computed, ref } from 'vue'
import { clamp, mulberry32, round1, uid } from '~/utils/rng'
import { ALL_EVENTS, getEventsByPhase } from '~/utils/events'
import { buildInstitutionalEventLogDetail } from '~/logic/eventInstitutionalLog'
import * as Engine from '~/logic/gameEngine'
import { useGameState, defaultState } from './useGameState'
import { useGameStorage, resetModuleStorageState } from './useGameStorage'
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
  BODY_PART_PREREQS,
  executeBodyPartRepayment as doExecuteBodyPartRepayment
} from './useGame.events'

export function useGame() {
  const { game } = useGameState()
  const { activeSlot, saveToSlot, loadFromSlot, listSlots } = useGameStorage()

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

  const totalDebt = computed(() =>
    Math.max(
      0,
      game.value.econ.collectionFee +
        game.value.econ.debtPrincipal +
        game.value.econ.debtInterestAccrued
    )
  )

  const minPayment = computed(() => {
    return Engine.calculateTierAdjustedMinPayment(
      totalDebt.value,
      game.value.econ.delinquency,
      game.value.school.classTier
    )
  })

  const nextLabel = computed(() => Engine.describeSlot(game.value.school.slot))
  const remainingSlots = computed(() => remainingSlotsFor(game.value.school.slot))

  const accumulatedMinPayment = computed(() => Engine.calculateAccumulatedMinPayment(game.value))

  const classPressureDigest = computed(() => {
    const g = game.value
    const latestWeeklyReport = g.logs.find((log: GameState['logs'][number]) => log.title.includes('周结算通报'))
    const tierDebtProfile = Engine.debtProfileForTier(g.school.classTier)
    const weeklyChangeMatch = latestWeeklyReport?.detail.match(/分班变化：([^；]+)；/)
    return {
      weeklyClassChange: weeklyChangeMatch?.[1] ?? '等待首轮周结算',
      nextWeekPerks: `餐补¥${g.school.perks.mealSubsidy}/天，专注加成${g.school.perks.focusBonus >= 0 ? '+' : ''}${g.school.perks.focusBonus}`,
      riskShiftSummary: `利率×${tierDebtProfile.dailyRateMultiplier.toFixed(2)}，最低周还款×${tierDebtProfile.minWeeklyPaymentMultiplier.toFixed(2)}，催收权重×${tierDebtProfile.collectionRiskWeight.toFixed(2)}`
    }
  })

  const reset = () => {
    game.value = defaultState()
    resetModuleStorageState()
    activeSlot.value = 'autosave'
  }

  const startNew = (cfg: StartConfig) => {
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

    game.value = g
  }

  const creditLimit = computed(() => Math.max(2000, 50000 - totalDebt.value))

  const borrow = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    if (a > creditLimit.value) {
      g.logs.unshift({
        id: uid('log'),
        day: g.school.day,
        title: '额度不足',
        detail: `当前可借额度仅¥${Math.floor(creditLimit.value).toLocaleString()}，申请被拒绝。`,
        tone: 'danger'
      })
      if (g.logs.length > 120) g.logs.pop()
      saveToSlot(activeSlot.value)
      return
    }
    const effectivePrincipal = g.bodyReputation === 'marked' ? Math.floor(a * 1.2) : a
    g.econ.debtPrincipal += effectivePrincipal
    g.econ.cash += a
    const logDetail =
      g.bodyReputation === 'marked'
        ? `经系统评估，您的申请已通过。到账¥${a.toLocaleString()}。`
        : `你借到¥${a.toLocaleString()}。利息不会因为你的梦想而心软。`
    g.logs.unshift({ id: uid('log'), day: g.school.day, title: '借贷到账', detail: logDetail, tone: 'warn' })
    if (g.logs.length > 120) g.logs.pop()
    saveToSlot(activeSlot.value)
  }

  const repay = (amount: number) => {
    const g = game.value
    const a = Math.max(0, Math.floor(amount))
    if (a <= 0) return
    if (g.econ.cash <= 0) return
    const budget = Math.min(a, g.econ.cash, totalDebt.value)
    const repayment = applyRepaymentByPriority(g, budget)
    if (repayment.totalPaid <= 0) {
      g.logs.unshift({
        id: uid('log'),
        day: g.school.day,
        title: '还款未记账',
        detail: '无可还债务或余额不足。',
        tone: 'warn'
      })
      if (g.logs.length > 120) g.logs.pop()
      saveToSlot(activeSlot.value)
      return
    }
    g.econ.cash -= repayment.totalPaid
    g.econ.lastPaymentDay = g.school.day
    let delinquencyNote = ''
    if (repayment.totalPaid >= minPayment.value && g.econ.delinquency > 0) {
      g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
      delinquencyNote = ` 逾期等级降低至${g.econ.delinquency}级。`
    }
    g.logs.unshift({
      id: uid('log'),
      day: g.school.day,
      title: '还款',
      detail: `系统已记账：¥${repayment.totalPaid.toLocaleString()}（利息¥${repayment.interestPaid.toLocaleString()}、费用¥${repayment.feePaid.toLocaleString()}、本金¥${repayment.principalPaid.toLocaleString()}）。${delinquencyNote}剩余债务：¥${(g.econ.debtPrincipal + g.econ.collectionFee + g.econ.debtInterestAccrued).toLocaleString()}。`,
      tone: 'ok'
    })
    if (g.logs.length > 120) g.logs.pop()
    saveToSlot(activeSlot.value)
  }

  const resolveEvent = (optionId: string) => {
    const g = game.value
    const event = g.pendingEvent
    if (!event) return
    const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
      if (g.logs.length > 120) g.logs.pop()
    }
    const integrity = g.bodyIntegrity ?? 1.0
    const fatigueMult = 2 - integrity

    if (optionId.startsWith('repay_')) {
      const partIdStr = optionId.split('_')[1] ?? ''
      const partIdMap: Record<string, string> = {
        leftpalm: 'LeftPalm',
        rightpalm: 'RightPalm',
        leftarm: 'LeftArm',
        rightarm: 'RightArm',
        leftleg: 'LeftLeg',
        rightleg: 'RightLeg'
      }
      const actualPartId = partIdMap[partIdStr]
      if (actualPartId) doExecuteBodyPartRepayment(g, actualPartId)
    } else if (optionId === 'immediate_payment') {
      const pay = accumulatedMinPayment.value
      if (g.econ.cash >= pay) {
        const result = executeImmediatePayment(g, pay)
        if (!result.success) addLog('还款失败', '余额不足以进行最低还款。', 'danger')
        else {
          addLog('还款记账完成', `系统已扣款¥${result.paid.toLocaleString()}，并将逾期等级下调 1 级。`, 'ok')
        }
      } else {
        addLog('还款失败', '余额不足。', 'danger')
      }
    } else if (optionId === 'forced_tuna') {
      const prevP = g.contract.progress
      const prevV = g.contract.vigilance
      const fatigueUp = Math.round(3 * fatigueMult)
      g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)
      g.stats.faLi = round1(g.stats.faLi + 0.12 + (g.stats.daoXin - 1) * 0.02)
      g.stats.focus = clamp(g.stats.focus - 1, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 1, 0, 100)
      Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
      addLog('契约反噬·被迫吐纳', '你被迫把呼吸压成细线。法力涨了一点，但你更像一台被驱动的机器。', 'warn')
    } else if (optionId === 'forced_study') {
      const prevP = g.contract.progress
      const prevV = g.contract.vigilance
      const fatigueUp = Math.round(5 * fatigueMult)
      g.stats.fatigue = clamp(g.stats.fatigue + fatigueUp, 0, 100)
      const focusFactor = (g.stats.focus + g.school.perks.focusBonus) / 100
      const palmPenalty = g.bodyPartRepayment?.LeftPalm || g.bodyPartRepayment?.RightPalm ? 0.95 : 1.0
      const imb = Engine.studyGainImbalanceMultiplier(g)
      const faLiGain = (0.05 + focusFactor * 0.06) * integrity * palmPenalty * imb
      g.stats.faLi = round1(g.stats.faLi + faLiGain)
      g.stats.focus = clamp(g.stats.focus + 2, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 1, 0, 100)
      Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
      addLog('契约反噬·被迫刷题', '你被迫低头做题。分数可能会救你一次，但它也把锁链拧得更紧。', 'warn')
    } else if (optionId === 'defy') {
      const prevP = g.contract.progress
      const prevV = g.contract.vigilance
      g.stats.focus = clamp(g.stats.focus - 16, 0, 100)
      g.stats.fatigue = clamp(g.stats.fatigue + 12, 0, 100)
      g.contract.vigilance = clamp(g.contract.vigilance + 10, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 4, 0, 100)
      Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
      g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + 120)
      addLog('契约反噬·硬抗代价', '你硬扛了这次命令。代价马上到账：更累、更乱、更贵。', 'danger')
    } else if (optionId === 'ending_continue') {
      addLog(
        Engine.NARRATIVE_ENDING_LOG_TITLE,
        '你没有被强制结束。你只是把麻木当成了新的日常，然后继续推进下一天。',
        'warn'
      )
    } else if (event.eventId) {
      const definition = ALL_EVENTS.find(def => def.id === event.eventId)
      if (!definition) {
        addLog('事件配置异常', `未找到事件定义：${event.eventId}。`, 'warn')
      } else {
        const option = definition.options.find(opt => opt.id === optionId)
        if (!option) addLog('事件配置异常', `事件 ${event.eventId} 未找到选项 ${optionId}。`, 'warn')
        else {
          applyEventEffects(g, option.effects, { suppressLogEffects: true })
          const t = definition.tone
          const logTone = t === 'danger' ? 'danger' : t === 'warn' ? 'warn' : t === 'ok' ? 'ok' : 'info'
          addLog(`制度记录：${definition.title}`, buildInstitutionalEventLogDetail(option.effects), logTone)
        }
      }
    }

    g.pendingEvent = undefined
    ensureSummaryUnlock(g)
    saveToSlot(activeSlot.value)
  }

  const applyEventEffects = (g: GameState, effects: EventEffect[], opts?: { suppressLogEffects?: boolean }) => {
    const addLog = (title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
      g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
      if (g.logs.length > 120) g.logs.pop()
    }

    for (const effect of effects) {
      switch (effect.kind) {
        case 'stat': {
          const key = effect.target
          const current = g.stats[key]
          let next = current + effect.delta
          if (key === 'fatigue' || key === 'focus') next = clamp(next, 0, 100)
          else next = Math.max(0, next)
          g.stats[key] = next
          break
        }
        case 'econ': {
          const key = effect.target
          const current = g.econ[key]
          const next = Math.max(0, current + effect.delta)
          g.econ[key] = next
          break
        }
        case 'debt': {
          if (effect.mode === 'addPrincipal') g.econ.debtPrincipal = Math.max(0, g.econ.debtPrincipal + effect.amount)
          else if (effect.mode === 'addInterest') {
            const totalDebtVal = g.econ.debtPrincipal + g.econ.debtInterestAccrued
            const amount = effect.amount === 0 ? Math.floor(totalDebtVal * 0.3) : effect.amount
            g.econ.debtInterestAccrued = Math.max(0, g.econ.debtInterestAccrued + amount)
          }
          break
        }
        case 'contract': {
          const prevP = g.contract.progress
          const prevV = g.contract.vigilance
          if (effect.target === 'active' && effect.value !== undefined) g.contract.active = effect.value
          else if (effect.target === 'progress' && effect.delta !== undefined)
            g.contract.progress = clamp(g.contract.progress + effect.delta, 0, 100)
          else if (effect.target === 'vigilance' && effect.delta !== undefined)
            g.contract.vigilance = clamp(g.contract.vigilance + effect.delta, 0, 100)
          Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
          break
        }
        case 'school': {
          if (effect.target === 'classTier') {
            g.school.classTier = effect.value
            g.school.perks = Engine.perksForTier(effect.value)
          }
          break
        }
        case 'log': {
          if (opts?.suppressLogEffects) break
          addLog(effect.title, effect.detail, effect.tone)
          break
        }
        default:
          break
      }
    }
  }

  const randomPoolAfterAction = (g: GameState, rand: () => number): PendingEvent | undefined => {
    const imbBoost = Engine.imbalanceEventProbabilityBoost(g)
    let baseP = clamp(0.04 + g.econ.delinquency * 0.04 + imbBoost, 0, 0.42)
    baseP = Engine.applyWeeklyRandomDownweightToProbability(baseP, g)
    if (rand() > baseP) return undefined

    const pool = getEventsByPhase('afterAction')
    const candidates = pool.filter((event) => {
      if (event.type === 'collapse') return false
      if (!Engine.eventMatchesTrigger(event, g)) return false
      if (Engine.isEventOnCooldown(g, event)) return false
      if (Engine.isFamilyOnCooldown(g, event)) return false
      if (Engine.hasEventReachedMaxTimes(g, event)) return false
      return true
    })

    const picked = Engine.pickWeightedEvent(candidates, rand)
    if (!picked) return undefined

    Engine.recordEventTrigger(g, picked)

    return Engine.toPendingEvent(picked)
  }

  const act = (action: ActionId) => {
    const g = game.value
    if (!g.started || g.pendingEvent) return

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

    const endingAlreadySeen = g.logs.some(
      (log: GameState['logs'][number]) => log.title === Engine.NARRATIVE_ENDING_LOG_TITLE
    )
    const shouldShowEnding = !endingAlreadySeen && Engine.shouldTriggerNarrativeEnding(g)
    const repaymentCheck = Engine.shouldTriggerRepaymentEvent(g, rand)
    if (repaymentCheck.trigger) {
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
        g.pendingEvent = randomPoolAfterAction(g, rand)
      }
    }

    const idx = Engine.slotOrder().indexOf(g.school.slot)
    const nextSlot = Engine.slotOrder()[idx + 1]
    if (idx < Engine.slotOrder().length - 1 && nextSlot) g.school.slot = nextSlot
    else {
      performEndDay(g, minPayment.value, applyWeeklyCollectionFee)
    }

    ensureSummaryUnlock(g)
    saveToSlot(activeSlot.value)
  }

  return {
    game,
    activeSlot,
    saveToSlot,
    loadFromSlot,
    listSlots,
    reset,
    startNew,
    totalDebt,
    minPayment,
    accumulatedMinPayment,
    classPressureDigest,
    creditLimit,
    nextLabel,
    remainingSlots,
    act,
    borrow,
    repay,
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
