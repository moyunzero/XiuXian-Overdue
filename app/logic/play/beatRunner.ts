import type { BeatDef } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import { getBeatHandler } from '~/logic/play/beatHandlers'

export interface BeatRunSummary {
  run: PlayRunState
  /** 任一 beat 阻塞周推进 */
  blocked: boolean
  gateIds: string[]
}

export function runBeatsForWeek(run: PlayRunState, beats: BeatDef[]): BeatRunSummary {
  let next = run
  let blocked = false
  const gateIds: string[] = []

  for (const beat of beats) {
    const handler = getBeatHandler(beat.handler)
    if (!handler) {
      next = {
        ...next,
        logs: [`节拍配置异常，本周进度已跳过。`, ...next.logs].slice(0, 80)
      }
      continue
    }
    const result = handler(next, beat)
    next = result.run
    if (result.logLine) {
      next = { ...next, logs: [result.logLine, ...next.logs].slice(0, 80) }
    }
    if (result.blocking || beat.blocking) blocked = true
    const gateId = result.gateId ?? beat.gateId
    if (gateId) {
      gateIds.push(gateId)
      next = {
        ...next,
        chapter: next.chapter
          ? { ...next.chapter, pendingGateId: gateId }
          : next.chapter
      }
    }
  }

  return { run: next, blocked, gateIds }
}
