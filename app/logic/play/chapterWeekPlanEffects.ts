import type { WeekPlan } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'
import { NUMBNESS_MUTE_THRESHOLD } from '~/logic/play/mandatePsy'
import { syncFoundationProgressFromStats } from '~/logic/play/uniFlow'
import { clamp, round1 } from '~/utils/rng'

/** 40h 满配刷题约 +1.2 道心（月考可感知，不碾压） */
export const CHAPTER_STUDY_DAO_PER_HOUR = 0.03
export const CHAPTER_STUDY_FALI_PER_HOUR = 0.015
export const CHAPTER_STUDY_FOCUS_PER_HOUR = 0.75
export const CHAPTER_STUDY_FATIGUE_PER_HOUR = 1.25

/** 吐纳无视身体完整度惩罚（见开发者技术架构指南） */
export const CHAPTER_TUNA_FALI_PER_HOUR = 0.025
export const CHAPTER_TUNA_DAO_PER_HOUR = 0.01
export const CHAPTER_TUNA_FATIGUE_PER_HOUR = 0.55

export const CHAPTER_REST_FATIGUE_RECOVER = 30
export const CHAPTER_REST_FOCUS_RECOVER = 14
export const CHAPTER_REST_FOCUS_RECOVER_NUMBED = 3

function studyIntegrityMultiplier(bodyIntegrity: number): number {
  return clamp(0.72 + bodyIntegrity * 0.28, 0.72, 1)
}

function studyFocusFactor(run: PlayRunState): number {
  const bonus = run.school?.perks.focusBonus ?? 0
  return 1 + bonus / 100
}

/** 章节周：刷题/吐纳/休息对 stats 的结算（纯函数） */
export function applyChapterWeekPlanEffects(run: PlayRunState, plan: WeekPlan): PlayRunState {
  if (run.runMode !== 'chapter' || !run.stats) return run

  let stats = { ...run.stats }
  const logs = [...run.logs]

  if (plan.rest) {
    const numbness = run.mandate?.numbness ?? 0
    const focusGain =
      numbness >= NUMBNESS_MUTE_THRESHOLD
        ? CHAPTER_REST_FOCUS_RECOVER_NUMBED
        : Math.round(CHAPTER_REST_FOCUS_RECOVER * (1 - numbness / 100))
    stats.fatigue = clamp(Math.round(stats.fatigue - CHAPTER_REST_FATIGUE_RECOVER), 0, 100)
    stats.focus = clamp(Math.round(stats.focus + focusGain), 0, 100)
    logs.unshift(
      numbness >= NUMBNESS_MUTE_THRESHOLD
        ? '硬睡一周：疲劳略降，但麻木让专注几乎回不来。'
        : '休息周：疲劳回落，专注略升。'
    )
    return { ...run, stats, logs: logs.slice(0, 80) }
  }

  const studyHours = Math.max(0, plan.studyHours)
  const tunaHours = Math.max(0, plan.tunaHours)
  const bodyIntegrity = run.bodyIntegrity ?? 1

  if (studyHours > 0) {
    const mult = studyIntegrityMultiplier(bodyIntegrity) * studyFocusFactor(run)
    stats.daoXin = round1(
      Math.max(1, stats.daoXin + studyHours * CHAPTER_STUDY_DAO_PER_HOUR * mult)
    )
    stats.faLi = round1(stats.faLi + studyHours * CHAPTER_STUDY_FALI_PER_HOUR * mult)
    stats.focus = clamp(
      Math.round(stats.focus + studyHours * CHAPTER_STUDY_FOCUS_PER_HOUR * mult),
      0,
      100
    )
    stats.fatigue = clamp(
      Math.round(stats.fatigue + studyHours * CHAPTER_STUDY_FATIGUE_PER_HOUR),
      0,
      100
    )
  }

  if (tunaHours > 0) {
    stats.faLi = round1(stats.faLi + tunaHours * CHAPTER_TUNA_FALI_PER_HOUR)
    stats.daoXin = round1(Math.max(1, stats.daoXin + tunaHours * CHAPTER_TUNA_DAO_PER_HOUR))
    stats.fatigue = clamp(
      Math.round(stats.fatigue + tunaHours * CHAPTER_TUNA_FATIGUE_PER_HOUR),
      0,
      100
    )
  }

  if (studyHours > 0 || tunaHours > 0) {
    const parts: string[] = []
    if (studyHours > 0) parts.push(`刷题 ${studyHours}h`)
    if (tunaHours > 0) parts.push(`吐纳 ${tunaHours}h`)
    logs.unshift(`本周${parts.join('、')}，修为与疲劳已结算。`)
  }

  let next: PlayRunState = { ...run, stats, logs: logs.slice(0, 80) }
  if (next.lifeStage === 'uni') {
    next = syncFoundationProgressFromStats(next)
  }
  return next
}
