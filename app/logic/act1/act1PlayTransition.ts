import type { Act1Persist } from '~/types/act1'
import type { PlayRunState } from '~/types/play'
import { advanceRunToHs } from '~/logic/play/createHsPlayState'
import { carryoverFromPersist } from './act1Carryover'

/** 入学前夜制度档案确认后，将 PlayRun 推进至高中压力牌阶段（短局保持 active，终章在首次月考后） */
export function settleAct1IntoPlayRun(run: PlayRunState, persist: Act1Persist): PlayRunState {
  if (!persist.settled) {
    throw new Error('Act1 persist must be settled before HS transition')
  }
  const carryover = carryoverFromPersist(persist)
  const hsRun = advanceRunToHs(run, carryover, persist.act1)
  return {
    ...hsRun,
    runStatus: 'active'
  }
}
