import type { PlayRunState } from '~/types/play'
import * as Engine from '~/logic/gameEngine'
import { applyWeeklyCollectionFee } from '~/logic/gameEconomy'
import { rollCalendarDay } from '~/logic/gameDayCycle'
import { playRunToGameSlice } from '~/logic/play/bodyMortgage'
import { fullDebtFromRun } from '~/logic/play/debtDashboard'

/** 无尽境 UI 逾期分（0–100）与 gameEngine 档位（0–5）换算步长 */
const PLAY_DELINQUENCY_SCALE_STEP = 18

function mergeDelinquencyForPlay(playDel: number, engineBefore: number, engineAfter: number): number {
  const delta = engineAfter - engineBefore
  if (delta <= 0) return playDel
  if (playDel > 5) return Math.min(100, playDel + delta * PLAY_DELINQUENCY_SCALE_STEP)
  return engineAfter
}

function gameLogsToPlayLines(g: { logs: Array<{ title: string; detail: string }> }): string[] {
  return g.logs.map((e) => `${e.title}：${e.detail}`)
}

/** 职场/无尽/章节周结算不跑 gameEngine 自动月考；章节月考由 beat 触发。 */
export function shouldSkipWeeklyExamForPlay(run: PlayRunState): boolean {
  return run.lifeStage === 'work' || run.runMode === 'endless' || run.runMode === 'chapter'
}

/**
 * 用 gameEngine 日/周结算推进 PlayRun 日历（与 `/game` endDay 同源）。
 */
export function advancePlayRunCalendarDay(run: PlayRunState): PlayRunState {
  if (!run.school || !run.econ || !run.stats) return run

  const g = playRunToGameSlice(run)
  const engineDelBefore = Engine.normalizeDelinquencyLevel(run.econ.delinquency)
  g.econ.delinquency = engineDelBefore

  const minPay = Engine.calculateTierAdjustedMinPayment(
    fullDebtFromRun(run),
    engineDelBefore,
    run.school.classTier
  )

  rollCalendarDay(g, minPay, applyWeeklyCollectionFee, {
    skipWeeklyExam: shouldSkipWeeklyExamForPlay(run),
    skipDelinquencyCheck: run.runMode === 'chapter'
  })

  const playDelAfter = mergeDelinquencyForPlay(
    run.econ.delinquency,
    engineDelBefore,
    g.econ.delinquency
  )

  const logLines = gameLogsToPlayLines(g)

  return {
    ...run,
    econ: {
      ...run.econ,
      cash: g.econ.cash,
      debtPrincipal: g.econ.debtPrincipal,
      debtInterestAccrued: g.econ.debtInterestAccrued,
      collectionFee: g.econ.collectionFee,
      dailyRate: g.econ.dailyRate,
      delinquency: playDelAfter,
      lastPaymentDay: g.econ.lastPaymentDay
    },
    stats: {
      ...run.stats,
      fatigue: g.stats.fatigue,
      focus: g.stats.focus
    },
    school: {
      ...run.school,
      day: g.school.day,
      week: g.school.week,
      slot: g.school.slot,
      classTier: g.school.classTier,
      perks: { ...g.school.perks },
      lastExamScore: g.school.lastExamScore,
      lastRank: g.school.lastRank
    },
    buyDebasement: g.buyDebasement ?? run.buyDebasement,
    logs: [...logLines, ...run.logs].slice(0, 80)
  }
}
