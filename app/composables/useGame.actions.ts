import type { ActionId, GameState } from '~/types/game'
import { clamp, round1 } from '~/utils/rng'
import * as Engine from '~/logic/gameEngine'

export type AddLog = (title: string, detail: string, tone?: 'info' | 'warn' | 'danger' | 'ok') => void

export type ActionSnapshot = {
  cash: number
  fatigue: number
  focus: number
  faLi: number
  rouTi: number
}

export function pickActionSummaryItems(action: ActionId, before: ActionSnapshot, after: ActionSnapshot): string[] {
  const deltaCash = after.cash - before.cash
  const deltaFatigue = after.fatigue - before.fatigue
  const deltaFocus = after.focus - before.focus
  const deltaFaLi = after.faLi - before.faLi
  const deltaRouTi = after.rouTi - before.rouTi
  const withSign = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  if (action === 'study') {
    return [`法力${withSign(round1(deltaFaLi))}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  if (action === 'tuna') {
    return [`法力${withSign(round1(deltaFaLi))}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  if (action === 'train') {
    return [`肉体${withSign(round1(deltaRouTi))}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  if (action === 'parttime') {
    return [`现金${withSign(deltaCash)}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  if (action === 'buy') {
    return [`现金${withSign(deltaCash)}`, `专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`]
  }
  return [`专注${withSign(Math.round(deltaFocus))}`, `疲劳${withSign(Math.round(deltaFatigue))}`, `法力${withSign(round1(deltaFaLi))}`]
}

export function mergeNarrativeAndSummary(narrative: string, summaryItems: string[]): string {
  return `${narrative} 摘要：${summaryItems.join('｜')}`
}

export function remainingSlotsFor(slot: GameState['school']['slot']): number {
  if (slot === 'morning') return 3
  if (slot === 'afternoon') return 2
  return 1
}

export function applyStudyAction(g: GameState, integrity: number, addLog: AddLog): void {
  const focusFactor = (g.stats.focus + g.school.perks.focusBonus) / 100
  const palmPenalty = (g.bodyPartRepayment?.LeftPalm || g.bodyPartRepayment?.RightPalm) ? 0.95 : 1.0
  const classStudyMultiplier = Engine.debtProfileForTier(g.school.classTier).studyGainMultiplier
  const imb = Engine.studyGainImbalanceMultiplier(g)
  let faLiGain = (0.05 + focusFactor * 0.06) * integrity * palmPenalty * classStudyMultiplier * imb
  faLiGain = Engine.applyCollapseModifierToAction(g, 'study', faLiGain)
  g.stats.faLi = round1(g.stats.faLi + faLiGain)
  g.stats.focus = clamp(g.stats.focus + 2, 0, 100)
  addLog('上课/刷题', `你把时间换成了0.1点不到的优势。对别人来说，这足够决定命运。`, 'info')
}

export function applyTunaAction(g: GameState, addLog: AddLog): void {
  let delta = 0.12 + (g.stats.daoXin - 1) * 0.02
  delta = Engine.applyCollapseModifierToAction(g, 'tuna', delta)
  g.stats.faLi = round1(g.stats.faLi + delta)
  g.stats.focus = clamp(g.stats.focus - 1, 0, 100)
  addLog('吐纳', '你把呼吸拧成一条线。法力像细流汇入气海。', 'ok')
}

export function applyTrainAction(g: GameState, integrity: number, rand: () => number, addLog: AddLog): void {
  const risk = clamp((g.stats.fatigue - 60) / 120, 0, 0.25)
  const baseGain = 0.06 + (g.stats.rouTi < 1.2 ? 0.02 : 0)
  const armPenalty = (g.bodyPartRepayment?.LeftArm || g.bodyPartRepayment?.RightArm) ? 0.90 : 1.0
  let rouTiGain = baseGain * integrity * armPenalty
  rouTiGain = Engine.applyCollapseModifierToAction(g, 'train', rouTiGain)
  g.stats.rouTi = round1(g.stats.rouTi + rouTiGain)
  g.stats.focus = clamp(g.stats.focus - 2, 0, 100)
  if (rand() < risk) {
    g.stats.focus = clamp(g.stats.focus - 6, 0, 100)
    addLog('训练过猛', '你的胸口像被钉住。内伤不大，但足够拖慢你。', 'warn')
  } else {
    addLog('炼体', '肌肉在撕裂与修复之间学会服从。', 'ok')
  }
}

export function applyParttimeAction(g: GameState, integrity: number, rand: () => number, addLog: AddLog): void {
  const basePay = Math.floor(260 + rand() * 260) + (g.school.classTier === '示范班' ? 120 : 0)
  const legPenalty = (g.bodyPartRepayment?.LeftLeg || g.bodyPartRepayment?.RightLeg) ? 0.90 : 1.0
  const payMult = Engine.parttimePayImbalanceMultiplier(g)
  let pay = Math.floor(basePay * integrity * legPenalty * payMult)
  pay = Math.floor(Engine.applyCollapseModifierToAction(g, 'parttime', pay))
  const institutionalTax = Math.floor(pay * 0.2)
  const netCash = pay - institutionalTax
  g.econ.collectionFee += institutionalTax
  g.econ.cash += netCash
  g.stats.focus = clamp(g.stats.focus - 4, 0, 100)
  addLog('打工', `你赚到¥${pay}。五险一金¥${institutionalTax}已扣除（计入制度损耗），到手¥${netCash}。`, 'ok')
}

export function applyBuyAction(g: GameState, addLog: AddLog): void {
  const cost = g.bodyReputation === 'marked' ? Math.floor(260 * 1.15) : 260
  if (g.econ.cash >= cost) {
    g.econ.cash -= cost
    g.stats.focus = clamp(g.stats.focus + 10, 0, 100)
    g.stats.fatigue = clamp(g.stats.fatigue - 6, 0, 100)
    g.buyDebasement = (g.buyDebasement ?? 0) + 1
    const buyLogDetail = (g.buyDebasement ?? 0) >= 3
      ? `感觉没以前管用了。但你还是把它吞下去了。`
      : `花¥${cost}买到"能让你更像机器"的东西。`
    addLog('购买补给', buyLogDetail, 'warn')
  } else {
    addLog('想买补给', '余额像嘲笑。你只能把手缩回去。', 'danger')
    g.stats.focus = clamp(g.stats.focus - 3, 0, 100)
  }
}

export function applyRestAction(
  g: GameState,
  addLog: AddLog,
  opts: { mode: 'numb' } | { mode: 'recover'; rand: () => number }
) {
  if (opts.mode === 'numb') {
    const rest = Engine.computeRestRecovery(g, { rand: () => 0, forceNumb: true })
    g.stats.focus = clamp(g.stats.focus + rest.focusDelta, 0, 100)
    g.numbness = clamp((g.numbness ?? 0) + 4, 0, 100)
    addLog('休息', '制度记录：麻木休息。你几乎没拿回状态，时间照样推进。', 'warn')
    return
  }
  const rest = Engine.computeRestRecovery(g, { rand: opts.rand, skipNumbCheck: true })
  g.stats.focus = clamp(g.stats.focus + rest.focusDelta, 0, 100)
  addLog('休息', '你偷回了一点人味。', 'info')
}
