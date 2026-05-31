import type { ChapterOutcomeId } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import { hasExamBossPending } from '~/logic/play/examBoss'
import { formatGateLabel } from '~/logic/play/playerFacingCopy'
import { getChapterConfig, getGateDef, segmentForWeek } from '~/logic/play/chapterRegistry'

export type SegmentGateResult = 'pass' | 'fail'

export interface OpenSegmentGateOptions {
  /** 玩家是否达成 requires 标签（择宗/择轨等） */
  metRequires?: boolean
}

export function openSegmentGate(
  run: PlayRunState,
  gateId: string,
  result: SegmentGateResult,
  options?: OpenSegmentGateOptions
): PlayRunState {
  if (run.runMode !== 'chapter' || !run.chapter) return run

  const config = getChapterConfig(run.chapter.chapterId)
  const gate = getGateDef(config, gateId)
  if (!gate) {
    return {
      ...run,
      logs: [`${formatGateLabel(gateId)}：配置缺失，进度已跳过。`, ...run.logs].slice(0, 80)
    }
  }

  const effect = result === 'pass' ? gate.onPass : gate.onFailDefault
  if (!effect) {
    return clearPendingGate(run)
  }

  let next: PlayRunState = { ...run }
  let profileTags = [...next.profileTags]

  if (effect.tags?.length) {
    for (const tag of effect.tags) {
      if (!profileTags.includes(tag)) profileTags.push(tag)
    }
  }

  if (result === 'pass' && effect.requires?.length && !options?.metRequires) {
    return {
      ...next,
      profileTags,
      logs: [`${formatGateLabel(gateId)}：前置条件未满足。`, ...next.logs].slice(0, 80)
    }
  }

  if (effect.setLifeStage) {
    next = { ...next, lifeStage: effect.setLifeStage }
  }

  if (effect.outcomeHint) {
    next = {
      ...next,
      chapter: {
        ...next.chapter!,
        outcomeId: effect.outcomeHint as ChapterOutcomeId,
        pendingGateId: undefined
      },
      profileTags
    }
    if (gateId === 'gate-w40-finale') {
      next = {
        ...next,
        runStatus: effect.outcomeHint === 'fulfilled' ? 'archived' : 'ended'
      }
    }
    return next
  }

  const segment = segmentForWeek(config, next.chapter!.chapterWeekIndex)
  return {
    ...next,
    profileTags,
    chapter: {
      ...next.chapter!,
      segmentId: segment?.id ?? next.chapter!.segmentId,
      pendingGateId: undefined
    }
  }
}

function clearPendingGate(run: PlayRunState): PlayRunState {
  if (!run.chapter) return run
  return {
    ...run,
    chapter: { ...run.chapter, pendingGateId: undefined }
  }
}

export function chapterSetpieceBlocksWeek(run: PlayRunState): boolean {
  if (run.runMode !== 'chapter') return false
  const sp = run.setpiece
  return !!(
    hasExamBossPending(run) ||
    sp?.breakthroughPending ||
    sp?.sectChoicePending ||
    sp?.uniFoundationGatePending ||
    sp?.bodyMortgagePending
  )
}
