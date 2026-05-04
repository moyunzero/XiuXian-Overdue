import { type Ref } from 'vue'
import type { ActionId, EventEffect, GameState, PendingEvent, SocialNetwork } from '~/types/game'
import { clamp, round1, uid } from '~/utils/rng'
import { ALL_EVENTS, getEventsByPhase } from '~/utils/events'
import { buildInstitutionalEventLogDetail } from '~/logic/eventInstitutionalLog'
import * as Engine from '~/logic/gameEngine'
import { executeImmediatePayment } from './useGame.economy'
import { executeBodyPartRepayment } from './useGame.events'
import { useCausalGraph } from './useCausalGraph'
import { generateEmergentEvent } from '~/logic/emergentEventGenerator'
import { calculateStressLevel } from '~/logic/hiddenVariableEngine'
import { buildPersonalityProfile, getHiddenModifiers } from '~/logic/emotionalMemoryLayer'
import type { EventContext } from '~/types/game'
import { selectEvent, toPendingEventFromSelection } from '~/logic/eventSelectionPipeline'

let preloadScheduled = false
function schedulePreload() {
  if (preloadScheduled || typeof requestIdleCallback === 'undefined') return
  preloadScheduled = true
  requestIdleCallback(() => {
    import('~/logic/emergentEventGenerator')
    import('~/logic/hiddenVariableEngine')
  }, { timeout: 2000 })
}

interface UseGameComputed {
  accumulatedMinPayment: Ref<number>
  refreshProfileSnapshot: () => void
}

interface UseGameStorage {
  activeSlot: Ref<string>
  saveToSlot: (slotId: string) => void
}

interface UseEmotionalMemory {
  loadEmotionalMemory: () => ReturnType<typeof import('~/logic/emotionalMemoryLayer').initEmotionalMemory>
}

export function useGameEventResolver(
  game: Ref<GameState>,
  gameComputed: UseGameComputed,
  storage: UseGameStorage,
  emotionalStorage: UseEmotionalMemory,
  socialNetwork: Ref<SocialNetwork>
) {
  const { getRecentHistory } = useCausalGraph()

  schedulePreload()

  const addLog = (g: GameState, title: string, detail: string, tone: 'info' | 'warn' | 'danger' | 'ok' = 'info') => {
    g.logs.unshift({ id: uid('log'), day: g.school.day, title, detail, tone })
    if (g.logs.length > 120) g.logs.pop()
  }

  const computeHiddenContributions = (g: GameState): Record<string, number> => {
    const contributions: Record<string, number> = {}
    if (!g.hiddenVariables) return contributions

    const hv = g.hiddenVariables
    if (hv.emotionalResidues.borrowTrauma) {
      contributions.borrowTrauma = hv.emotionalResidues.borrowTrauma * 0.01
    }
    if (hv.emotionalResidues.complianceFatigue) {
      contributions.complianceFatigue = hv.emotionalResidues.complianceFatigue * 0.01
    }
    if (hv.narrativeMomentum.crisisTendency) {
      contributions.crisisTendency = hv.narrativeMomentum.crisisTendency * 0.01
    }

    return contributions
  }

  const applyEventEffects = (g: GameState, effects: EventEffect[], opts?: { suppressLogEffects?: boolean }) => {
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
          addLog(g, effect.title, effect.detail, effect.tone)
          break
        }
        default:
          break
      }
    }
  }

  const randomPoolAfterAction = async (g: GameState, rand: () => number): Promise<PendingEvent | undefined> => {
    const memory = emotionalStorage.loadEmotionalMemory()
    const profile = buildPersonalityProfile(memory)
    const hiddenModifiers = getHiddenModifiers(profile)
    const stressLevel = g.hiddenVariables ? calculateStressLevel(g.hiddenVariables, g) : 0

    const recentChain = getRecentHistory(7)

    const emergentContext: EventContext = {
      state: g,
      profile,
      network: socialNetwork.value,
      hiddenModifiers,
      recentChain,
      stressLevel
    }

    // 优先尝试涌现事件
    const emergentEvent = generateEmergentEvent(emergentContext, rand)
    if (emergentEvent) {
      const pending: PendingEvent = {
        title: emergentEvent.title,
        body: emergentEvent.body,
        options: emergentEvent.options.map(opt => ({
          id: opt.id,
          label: opt.label,
          tone: opt.tone,
          effects: opt.effects
        })),
        tier: emergentEvent.tier,
        mandatory: false
      }
      return pending
    }

    // 概率门控
    const imbBoost = Engine.imbalanceEventProbabilityBoost(g)
    let baseP = clamp(0.04 + g.econ.delinquency * 0.04 + imbBoost, 0, 0.42)
    baseP = Engine.applyWeeklyRandomDownweightToProbability(baseP, g)
    if (rand() > baseP) return undefined

    // 使用新的事件选择管线（双层事件池 + 画像权重 + 去重）
    try {
      const selectionResult = await selectEvent(g, 'afterAction', rand)
      if (selectionResult) {
        // 记录触发历史
        Engine.recordEventTrigger(g, selectionResult.event)
        return toPendingEventFromSelection(selectionResult)
      }
    } catch (e) {
      console.warn('事件选择管线失败，降级为静态池:', e)
    }

    // 降级方案：使用原有静态池逻辑
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

  const resolveEvent = (optionId: string, ensureSummaryUnlock: (g: GameState) => void) => {
    const g = game.value
    const event = g.pendingEvent
    if (!event) return

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
      if (actualPartId) {
        executeBodyPartRepayment(g, actualPartId)
        if (!g.sessionMetrics) {
          g.sessionMetrics = {
            actionCounts: {},
            borrowCount: 0,
            bodyPartRepaymentCount: 0,
            antiProfileActionCount: 0,
            restCount: 0,
            startTime: Date.now()
          }
        }
        g.sessionMetrics.bodyPartRepaymentCount = (g.sessionMetrics.bodyPartRepaymentCount || 0) + 1
      }
    } else if (optionId === 'immediate_payment') {
      if (Engine.isDebtLocked(g)) {
        addLog(g, '还款被拒绝', '该债务已被系统锁定，必须通过身体抵押方式偿还。', 'warn')
      } else {
        const pay = gameComputed.accumulatedMinPayment
        if (g.econ.cash >= pay) {
          const result = executeImmediatePayment(g, pay)
          if (!result.success) addLog(g, '还款失败', '余额不足以进行最低还款。', 'danger')
          else {
            addLog(g, '还款记账完成', `系统已扣款¥${result.paid.toLocaleString()}，并将逾期等级下调 1 级。`, 'ok')
          }
        } else {
          addLog(g, '还款失败', '余额不足。', 'danger')
        }
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
      addLog(g, '契约反噬·被迫吐纳', '你被迫把呼吸压成细线。法力涨了一点，但你更像一台被驱动的机器。', 'warn')
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
      addLog(g, '契约反噬·被迫刷题', '你被迫低头做题。分数可能会救你一次，但它也把锁链拧得更紧。', 'warn')
    } else if (optionId === 'defy') {
      const prevP = g.contract.progress
      const prevV = g.contract.vigilance
      g.stats.focus = clamp(g.stats.focus - 16, 0, 100)
      g.stats.fatigue = clamp(g.stats.fatigue + 12, 0, 100)
      g.contract.vigilance = clamp(g.contract.vigilance + 10, 0, 100)
      g.contract.progress = clamp(g.contract.progress + 4, 0, 100)
      Engine.syncDomesticationWithContractProgress(g, prevP, prevV)
      g.econ.debtInterestAccrued = round1(g.econ.debtInterestAccrued + 120)
      addLog(g, '契约反噬·硬抗代价', '你硬扛了这次命令。代价马上到账：更累、更乱、更贵。', 'danger')
    } else if (optionId === 'adjust_behavior') {
      Engine.applyAntiProfileConsequence(g, 'adjust')
    } else if (optionId === 'maintain_resistance') {
      Engine.applyAntiProfileConsequence(g, 'maintain')
    } else if (optionId === 'ending_continue') {
      addLog(
        g,
        Engine.NARRATIVE_ENDING_LOG_TITLE,
        '你没有被强制结束。你只是把麻木当成了新的日常，然后继续推进下一天。',
        'warn'
      )
    } else {
      // 优先使用 PendingEvent.options 中自带的 effects（支持动态事件和涌现事件）
      const pendingOption = event.options.find(opt => opt.id === optionId)
      if (pendingOption?.effects) {
        applyEventEffects(g, pendingOption.effects, { suppressLogEffects: true })
        if (event.eventId) {
          const definition = ALL_EVENTS.find(def => def.id === event.eventId)
          if (definition) {
            const t = definition.tone
            const logTone = t === 'danger' ? 'danger' : t === 'warn' ? 'warn' : t === 'ok' ? 'ok' : 'info'
            addLog(g, `制度记录：${definition.title}`, buildInstitutionalEventLogDetail(pendingOption.effects), logTone)
          }
        }
      } else if (event.eventId) {
        // 降级：如果 PendingEvent 中没有 effects，尝试从 ALL_EVENTS 查找
        const definition = ALL_EVENTS.find(def => def.id === event.eventId)
        if (!definition) {
          addLog(g, '事件配置异常', `未找到事件定义：${event.eventId}。`, 'warn')
        } else {
          const option = definition.options.find(opt => opt.id === optionId)
          if (!option) addLog(g, '事件配置异常', `事件 ${event.eventId} 未找到选项 ${optionId}。`, 'warn')
          else {
            applyEventEffects(g, option.effects, { suppressLogEffects: true })
            const t = definition.tone
            const logTone = t === 'danger' ? 'danger' : t === 'warn' ? 'warn' : t === 'ok' ? 'ok' : 'info'
            addLog(g, `制度记录：${definition.title}`, buildInstitutionalEventLogDetail(option.effects), logTone)
          }
        }
      }
    }

    g.pendingEvent = undefined
    ensureSummaryUnlock(g)
    gameComputed.refreshProfileSnapshot()
    storage.saveToSlot(storage.activeSlot.value)
  }

  return {
    resolveEvent,
    applyEventEffects,
    randomPoolAfterAction,
    computeHiddenContributions
  }
}
