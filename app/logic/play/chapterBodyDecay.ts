import type { WeekPlan } from '~/types/chapter'
import type { PlayRunState } from '~/types/play'

/** 每周基础完整度损耗（40 周累计约 -0.08） */
export const CHAPTER_BODY_DECAY_BASE = 0.002

/** 断供链每档额外损耗（封顶，避免 minPay 长期不达标时指数崩盘） */
export const CHAPTER_BODY_DECAY_PER_SUPPLY_CUT = 0.001
export const CHAPTER_BODY_DECAY_SUPPLY_CUT_CAP = 4

/** 已抵押部位数 × 系数 */
export const CHAPTER_BODY_DECAY_PER_MORTGAGED_PART = 0.003

/** 过劳：单周 work+parttime 超过该阈值后，每超出 10 小时 +0.002 */
export const CHAPTER_OVERWORK_HOUR_THRESHOLD = 36
export const CHAPTER_OVERWORK_DECAY_STEP = 0.002
export const CHAPTER_OVERWORK_HOUR_STEP = 10

/** 逾期档位越高，制度性损耗越快（债压身） */
export const CHAPTER_BODY_DECAY_PER_DELINQUENCY = 0.0025
export const CHAPTER_BODY_DECAY_DELINQUENCY_CAP = 6

function mortgagedPartCount(run: PlayRunState): number {
  const parts = run.bodyPartRepayment ?? {}
  return Object.values(parts).filter(Boolean).length
}

/** 纯函数：计算本周 bodyIntegrity 衰减量 */
export function weekBodyDecayAmount(run: PlayRunState, plan: WeekPlan): number {
  if (run.runMode !== 'chapter') return 0

  let decay = CHAPTER_BODY_DECAY_BASE
  const streak = run.mandate?.supplyCutStreak ?? 0
  if (streak > 0) {
    decay +=
      Math.min(streak, CHAPTER_BODY_DECAY_SUPPLY_CUT_CAP) * CHAPTER_BODY_DECAY_PER_SUPPLY_CUT
  }

  decay += mortgagedPartCount(run) * CHAPTER_BODY_DECAY_PER_MORTGAGED_PART

  const del = run.econ?.delinquency ?? 0
  if (del > 0) {
    decay +=
      Math.min(del, CHAPTER_BODY_DECAY_DELINQUENCY_CAP) * CHAPTER_BODY_DECAY_PER_DELINQUENCY
  }

  if (!plan.rest) {
    const laborHours = plan.parttimeHours + plan.workHours
    if (laborHours > CHAPTER_OVERWORK_HOUR_THRESHOLD) {
      const excess = laborHours - CHAPTER_OVERWORK_HOUR_THRESHOLD
      decay += Math.floor(excess / CHAPTER_OVERWORK_HOUR_STEP) * CHAPTER_OVERWORK_DECAY_STEP
    }
  }

  return decay
}

/** 章节周推进后施加身体完整度衰减 */
export function applyChapterBodyDecay(run: PlayRunState, plan: WeekPlan): PlayRunState {
  if (run.runMode !== 'chapter') return run

  const before = run.bodyIntegrity ?? 1
  const delta = weekBodyDecayAmount(run, plan)
  if (delta <= 0) return run

  const after = Math.max(0, Number((before - delta).toFixed(4)))
  if (after >= before) return run

  const logs = [...run.logs]
  if (after < 0.55 && before >= 0.55) {
    logs.unshift('体检贷提醒：灵根污染读数偏高，修炼收益开始下滑。')
  } else if (after < 0.35 && before >= 0.35) {
    logs.unshift('义体老化预警：完整度跌破警戒，再恶化将触发抵押清算。')
  } else {
    logs.unshift(`本周身体完整度 -${(delta * 100).toFixed(1)}%（负债化损耗）。`)
  }

  return {
    ...run,
    bodyIntegrity: after,
    logs: logs.slice(0, 80)
  }
}
