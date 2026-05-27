import type { Act1Carryover, Act1Persist } from '~/types/act1'
import type { GameState } from '~/types/game'
import { formatMetaUnlocksLine, formatPermanentModifierSummary } from './metaUnlockLabels'

function roundRate(rate: number): number {
  return Math.round(rate * 1_000_000) / 1_000_000
}

export function carryoverFromPersist(persist: Act1Persist): Act1Carryover {
  return {
    metaUnlocks: [...(persist.metaUnlocks ?? [])],
    permanentModifiers: { ...(persist.permanentModifiers ?? {}) },
    familyOutcome: persist.act1.familyOutcome
  }
}

/** 将入学前夜结算写入周目 2 开局（不继承现金，仅 meta + 利率系数） */
export function applyAct1CarryoverToGame(game: GameState, carryover: Act1Carryover): void {
  game.act1Carryover = {
    metaUnlocks: [...carryover.metaUnlocks],
    permanentModifiers: { ...carryover.permanentModifiers },
    familyOutcome: carryover.familyOutcome
  }

  const mult = carryover.permanentModifiers.interestRateMultiplier
  if (mult && mult > 1) {
    game.econ.dailyRate = roundRate(game.econ.dailyRate * mult)
  }

  const modLine = formatPermanentModifierSummary(carryover.permanentModifiers)
  const metaLine = formatMetaUnlocksLine(carryover.metaUnlocks, 6)

  game.logs.unshift({
    id: `log-act1-carryover-${game.seed}`,
    day: game.school?.day ?? 1,
    title: '制度档案结转',
    detail: `入学前夜档案已并入本校风控系统。${modLine}。已解锁制度备注：${metaLine}。`,
    tone: 'warn'
  })
}
