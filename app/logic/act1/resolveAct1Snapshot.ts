import type { Act1State } from '~/types/act1'
import type { PlayRunState } from '~/types/play'
import { createInitialAct1State } from './createInitialAct1State'
import { applyFamilyOutcomeEffects } from './familyLedger'

/** 解析入学前夜快照：run 内嵌 → 存档 persist → 从 carryover 合成最小快照 */
export function resolveAct1Snapshot(run: PlayRunState, fallback?: Act1State | null): Act1State {
  if (run.act1) return run.act1
  if (fallback) return fallback

  let act1 = createInitialAct1State(run.start)
  const outcome = run.carryoverFromAct1?.familyOutcome
  if (outcome) {
    act1 = applyFamilyOutcomeEffects(act1, outcome)
  }
  return act1
}

export function withAct1Snapshot(run: PlayRunState, fallback?: Act1State | null): PlayRunState {
  if (run.act1) return run
  return { ...run, act1: resolveAct1Snapshot(run, fallback) }
}
