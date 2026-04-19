import type { GameState, PendingEvent } from '~/types/game'
import * as Engine from '~/logic/gameEngine'
import { applyRepaymentByPriority } from './useGame.economy'

const BODY_PART_LABELS: Record<string, string> = {
  LeftPalm: '左手掌',
  RightPalm: '右手掌',
  LeftArm: '左臂',
  RightArm: '右臂',
  LeftLeg: '左腿',
  RightLeg: '右腿'
}

const BODY_PART_PREREQS: Record<string, string> = {
  LeftArm: 'LeftPalm',
  RightArm: 'RightPalm'
}

export function buildRepaymentEvent(
  g: GameState,
  rand: () => number
): PendingEvent {
  const repaid = g.bodyPartRepayment ?? {}
  const availableParts = (['LeftPalm', 'RightPalm', 'LeftArm', 'RightArm', 'LeftLeg', 'RightLeg'] as const).filter(
    id => !repaid[id]
  )
  const mandatory = Engine.shouldTriggerRepaymentEvent(g, rand).mandatory
  const options: PendingEvent['options'] = [{ id: 'immediate_payment', label: '立即还款', tone: 'primary' }]
  for (const partId of availableParts) {
    const prereq = BODY_PART_PREREQS[partId]
    const prereqMissing = prereq && !repaid[prereq]
    const dynamicValue = Engine.calculateDynamicValuation(partId, {
      faLi: g.stats.faLi,
      rouTi: g.stats.rouTi,
      fatigue: g.stats.fatigue,
      buyDebasement: g.buyDebasement ?? 0
    })
    const baseLabel = BODY_PART_LABELS[partId] ?? partId
    const prereqHint =
      partId === 'LeftArm' ? '需先偿还左手掌' : partId === 'RightArm' ? '需先偿还右手掌' : ''
    const label = prereqMissing
      ? `${baseLabel}（减免¥${dynamicValue.toLocaleString()}，${prereqHint}）`
      : `${baseLabel}（减免¥${dynamicValue.toLocaleString()}）`
    options.push({ id: `repay_${partId.toLowerCase()}`, label, tone: 'danger' })
  }
  if (!mandatory) options.push({ id: 'refuse', label: '拒绝（继续承受压力）', tone: 'normal' })
  const title = mandatory ? '强制执行：用身体偿还' : '最后的选择：用身体偿还'
  const body = mandatory
    ? '你已经没有选择的余地。催收人员站在你面前，合同已经签好。偿还后的身体部位无法恢复。这不是游戏机制，这是你的选择。'
    : '债务压垮了你的最后一道防线。他们提出了一个"解决方案"。偿还后的身体部位无法恢复。这不是游戏机制，这是你的选择。'
  return {
    title,
    body,
    options,
    mandatory,
    defaultOptionId: mandatory ? undefined : 'refuse',
    tier: 'critical',
    systemSummary: '身体部位偿还按动态估值冲减滚动债。',
    systemDetails: '具体冲减分项以结算执行结果为准；本区不提供策略建议。'
  }
}

export function executeBodyPartRepayment(
  g: GameState,
  partId: string
): void {
  const prereq = BODY_PART_PREREQS[partId]
  if (prereq && !g.bodyPartRepayment?.[prereq]) {
    g.logs.unshift({
      id: `log_${Date.now()}`,
      day: g.school.day,
      title: '无法偿还',
      detail: `需要先偿还${BODY_PART_LABELS[prereq]}，才能偿还${BODY_PART_LABELS[partId]}。`,
      tone: 'warn'
    })
    if (g.logs.length > 120) g.logs.pop()
    return
  }

  const label = BODY_PART_LABELS[partId] ?? partId
  const mortgageType = Engine.determineMortgageType(g)
  const mortgageResult = Engine.calculateBodyMortgageBenefits(partId, mortgageType, g)

  Engine.applyBodyMortgageEffect(g, mortgageResult)

  if (mortgageType === 'debt_reduction') {
    g.econ.delinquency = Math.max(0, g.econ.delinquency - 1)
  }

  if (!g.bodyPartRepayment) g.bodyPartRepayment = {}
  g.bodyPartRepayment[partId] = true
  g.lastBodyPartRepaymentDay = g.school.day
  g.lastBodyPartDay = g.school.day
  if (!g.pendingNarratives) g.pendingNarratives = []
  g.pendingNarratives.push({ day: g.school.day, partId })

  let detailMessage = `你抵押了${label}（${mortgageType === 'debt_reduction' ? '减债型' : mortgageType === 'access_grant' ? '准入型' : '修行加速型'}）。`
  if (mortgageResult.debtReduction > 0) {
    detailMessage += `减免滚动债¥${mortgageResult.debtReduction.toLocaleString()}。`
  }
  if (mortgageResult.cultivationBonus.faLi > 0 || mortgageResult.cultivationBonus.rouTi > 0) {
    detailMessage += `修行加成：法力+${mortgageResult.cultivationBonus.faLi.toFixed(2)}，肉体+${mortgageResult.cultivationBonus.rouTi.toFixed(2)}。`
  }
  if (mortgageResult.accessGained.length > 0) {
    detailMessage += `获得准入：${mortgageResult.accessGained.join('、')}。`
  }

  g.logs.unshift({
    id: `log_${Date.now()}`,
    day: g.school.day,
    title: '身体抵押完成',
    detail: detailMessage,
    tone: 'warn'
  })
  if (g.logs.length > 120) g.logs.pop()
}

export { BODY_PART_LABELS, BODY_PART_PREREQS }
