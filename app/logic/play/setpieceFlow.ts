import type { PlayRunState } from '~/types/play'
import { buildBodyMortgagePending } from '~/logic/play/bodyMortgage'
import {
  beginNextRoundAfterResolve,
  redeployDegeneratePressureOffer,
  rngForRun,
  startPressureRound
} from '~/logic/play/pressureDeck'
import { createUniStateFromHs } from '~/logic/play/createUniPlayState'
import { hasSectChoiceBlocking } from '~/logic/play/uniFlow'
import { needsJobChoice } from '~/logic/play/workFlow'
import { getRealmTemplate } from '~/logic/play/realmTemplates'

/** 高中段：setpiece 挂起时不应开新压力回合 / 不应 toggle */
export function hsSetpieceBlocksPressure(run: PlayRunState): boolean {
  return !!(run.setpiece?.examBossPending || run.setpiece?.bodyMortgagePending)
}

/** 大学段：择宗挂起时阻塞压力牌 */
export function uniSetpieceBlocksPressure(run: PlayRunState): boolean {
  return hasSectChoiceBlocking(run)
}

export function endlessSetpieceBlocksPlay(run: PlayRunState): boolean {
  return (
    !!run.setpiece?.breakthroughPending ||
    !!run.setpiece?.bodyMortgagePending ||
    needsJobChoice(run)
  )
}

export function workSetpieceBlocksPlay(run: PlayRunState): boolean {
  return endlessSetpieceBlocksPlay(run)
}

/** 职场段：压力回合结算后尝试挂身体抵押（与 HS afterRoundGate 对齐） */
export function afterWorkRoundGate(
  run: PlayRunState,
  rand: () => number = rngForRun(run)
): PlayRunState {
  if (run.lifeStage !== 'work') return run
  if (workSetpieceBlocksPlay(run)) return run
  const pending = buildBodyMortgagePending(run, rand)
  if (!pending) return run
  return { ...run, setpiece: { ...run.setpiece, bodyMortgagePending: pending } }
}

function ensurePlayablePressureOffer(run: PlayRunState): PlayRunState {
  if (!run.pressure || run.pressure.resolved) {
    return startPressureRound(run, rngForRun(run))
  }
  return redeployDegeneratePressureOffer(run, rngForRun(run))
}

export function prepareEndlessRunForPlay(run: PlayRunState): PlayRunState {
  if (run.runMode !== 'endless') return run
  // Legacy/newly-migrated runs may still carry `realmTier: 'mortal'`,
  // which has no endless template and would block breakthrough scheduling forever.
  const template = getRealmTemplate(run.realmTier)
  const normalized =
    template
      ? run
      : {
          ...run,
          realmTier: 'qi',
          realmIndex: 0,
          maintenanceCoeff: run.maintenanceCoeff ?? 1,
          logs: ['无尽境校准：境界从凡俗对齐到练气。', ...run.logs].slice(0, 80)
        }
  const realmTemplate = getRealmTemplate(normalized.realmTier ?? 'qi') ?? getRealmTemplate('qi')
  const withEndless =
    normalized.endless || !realmTemplate
      ? normalized
      : {
          ...normalized,
          endless: {
            maintenanceStack: 1,
            harvestRate: realmTemplate.harvestRate,
            daysInCurrentRealm: 0,
            breakthroughsCount: 0,
            irreversibleLiens: [],
            lieFlatStreak: 0
          },
          logs: ['无尽境初始化：已建立破境计数与境中日历。', ...normalized.logs].slice(0, 80)
        }
  if (endlessSetpieceBlocksPlay(withEndless)) return withEndless
  return ensurePlayablePressureOffer(withEndless)
}

export function prepareWorkRunForPlay(run: PlayRunState): PlayRunState {
  return prepareEndlessRunForPlay(run)
}

export function resumePressureAfterWorkSetpiece(run: PlayRunState): PlayRunState {
  if (!run.pressure?.resolved) return run
  if (workSetpieceBlocksPlay(run)) return run
  return beginNextRoundAfterResolve(run)
}

export function ensureUniState(run: PlayRunState): PlayRunState {
  if (run.uni) return run
  return { ...run, uni: createUniStateFromHs(run) }
}

/**
 * 关口确认后：若本回合已结算且没有阻塞 setpiece，开启新一轮压力牌。
 * composable 在 confirm* 后必须调用，避免 pressure.resolved 卡住。
 */
export function resumePressureAfterHsSetpiece(run: PlayRunState): PlayRunState {
  if (!run.pressure?.resolved) return run
  if (hsSetpieceBlocksPressure(run)) return run
  return beginNextRoundAfterResolve(run)
}

export function resumePressureAfterUniSetpiece(run: PlayRunState): PlayRunState {
  if (!run.pressure?.resolved) return run
  if (uniSetpieceBlocksPressure(run)) return run
  return beginNextRoundAfterResolve(run)
}

/** 读档 / init：无阻塞 setpiece 且压力未开局或已结算时，补开一轮 */
export function prepareUniRunForPlay(run: PlayRunState): PlayRunState {
  let next = ensureUniState(run)
  if (uniSetpieceBlocksPressure(next)) return next
  return ensurePlayablePressureOffer(next)
}

export function prepareHsRunForPlay(run: PlayRunState): PlayRunState {
  if (hsSetpieceBlocksPressure(run)) return run
  return ensurePlayablePressureOffer(run)
}

/** 回合结算后是否应自动进入下一轮（与 confirmRound 一致） */
export function shouldBeginNextPressureRoundAfterResolve(
  run: PlayRunState,
  stage: 'hs' | 'uni' | 'work'
): boolean {
  if (stage === 'hs') {
    return !hsSetpieceBlocksPressure(run)
  }
  if (stage === 'work') {
    if (run.setpiece?.breakthroughPending) return false
    return !workSetpieceBlocksPlay(run)
  }
  return !uniSetpieceBlocksPressure(run)
}
