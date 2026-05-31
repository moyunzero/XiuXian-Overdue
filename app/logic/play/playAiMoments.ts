import type { LifeStage, PlayAiTrigger, PlayRunState } from '~/types/play'

export interface PlayAiMoment {
  trigger: PlayAiTrigger
  title: string
  detail: string
  fatigueDelta?: number
  focusDelta?: number
}

export interface PlayAiMomentContext {
  lifeStage: LifeStage
  realmTier: string
  tags: string[]
  debt: number
  delinquency: number
  examScore?: number
}

export const DELINQUENCY_SPIKE_THRESHOLD = 55

const TEMPLATES: Record<PlayAiTrigger, PlayAiMoment[]> = {
  'post-exam': [
    {
      trigger: 'post-exam',
      title: '月考后风控回访',
      detail:
        '招生办系统把你的月考分数与负债曲线叠在一起看了三十秒。没有祝贺，只有一条待办：「观察名单 · 下月复核」。',
      focusDelta: -2
    },
    {
      trigger: 'post-exam',
      title: '成绩单旁的小字',
      detail:
        '成绩单底部多了一行灰字：「学分达标 ≠ 还款达标」。同桌问你考得好不好，你只把手机扣在桌上。',
      fatigueDelta: 3
    }
  ],
  'delinquency-spike': [
    {
      trigger: 'delinquency-spike',
      title: '逾期档位抬头',
      detail:
        '灵信把催收模板从「提醒」切到「联系人」。系统备注：你已越过温和区间，下一档将写入担保人可见字段。',
      focusDelta: -4
    },
    {
      trigger: 'delinquency-spike',
      title: '风控弹窗',
      detail:
        '桌面右下角弹出半透明条：「逾期指数上升 · 本周维护费系数可能上调」。没有按钮，只有倒计时。',
      fatigueDelta: 2
    }
  ],
  breakthrough: [
    {
      trigger: 'breakthrough',
      title: '破境贺礼的背面',
      detail:
        '庆典灯还没灭，财务科已把下一境界的维护费草案发到你的灵信。贺词在正面，账单在背面。',
      focusDelta: -3
    },
    {
      trigger: 'breakthrough',
      title: '境界登记处',
      detail:
        '登记员盖章时抬头看你一眼：「恭喜破境。本金不会因为你变强而消失。」印章声比烟花还清楚。',
      fatigueDelta: 1
    }
  ]
}

export function buildPlayAiContext(run: PlayRunState, examScore?: number): PlayAiMomentContext {
  const debt =
    (run.econ?.debtPrincipal ?? 0) +
    (run.econ?.debtInterestAccrued ?? 0) +
    (run.econ?.collectionFee ?? 0)
  return {
    lifeStage: run.lifeStage,
    realmTier: run.realmTier ?? 'mortal',
    tags: [...(run.profileTags ?? [])],
    debt,
    delinquency: run.econ?.delinquency ?? 0,
    examScore
  }
}

export function shouldFireDelinquencySpike(prevDelinquency: number, nextDelinquency: number): boolean {
  return (
    prevDelinquency < DELINQUENCY_SPIKE_THRESHOLD &&
    nextDelinquency >= DELINQUENCY_SPIKE_THRESHOLD
  )
}

export function hasFiredAiMoment(run: PlayRunState, trigger: PlayAiTrigger): boolean {
  return (run.aiMomentsFired ?? []).includes(trigger)
}

function pickTemplate(trigger: PlayAiTrigger, context: PlayAiMomentContext): PlayAiMoment {
  const pool = TEMPLATES[trigger]
  const idx =
    (context.debt + context.delinquency + (context.examScore ?? 0)) % Math.max(1, pool.length)
  const base = pool[idx]!
  return { ...base }
}

/** 白名单：仅小幅 stat，禁止改本金/利率/逾期档位 */
export function clampAiStatDelta(delta: number | undefined, max = 5): number | undefined {
  if (delta === undefined || delta === 0) return undefined
  return Math.max(-max, Math.min(max, delta))
}

export function resolvePlayAiMoment(
  trigger: PlayAiTrigger,
  context: PlayAiMomentContext
): PlayAiMoment {
  return pickTemplate(trigger, context)
}

export function applyPlayAiMomentToRun(run: PlayRunState, moment: PlayAiMoment): PlayRunState {
  const fatigueDelta = clampAiStatDelta(moment.fatigueDelta)
  const focusDelta = clampAiStatDelta(moment.focusDelta)
  const stats = run.stats ? { ...run.stats } : { fatigue: 0, focus: 50, daoXin: 0, faLi: 0, rouTi: 0 }
  if (fatigueDelta) {
    stats.fatigue = Math.max(0, Math.min(100, stats.fatigue + fatigueDelta))
  }
  if (focusDelta) {
    stats.focus = Math.max(0, Math.min(100, stats.focus + focusDelta))
  }

  const line = `[瞬间·${moment.trigger}] ${moment.title}：${moment.detail}`
  const fired = [...new Set([...(run.aiMomentsFired ?? []), moment.trigger])]

  return {
    ...run,
    stats,
    logs: [...run.logs, line],
    aiMomentsFired: fired
  }
}

export function appendPlayAiMomentIfDue(
  run: PlayRunState,
  trigger: PlayAiTrigger,
  opts: { enabled: boolean; examScore?: number }
): PlayRunState {
  if (!opts.enabled || hasFiredAiMoment(run, trigger)) return run
  const moment = resolvePlayAiMoment(trigger, buildPlayAiContext(run, opts.examScore))
  return applyPlayAiMomentToRun(run, moment)
}
